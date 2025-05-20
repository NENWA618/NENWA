// 量子可视化计算专用Web Worker（动态耦合+拉普拉斯+局部熵）

// 增强动态耦合函数，加入混沌因子
function getDynamicAij(i, j, t) {
  // 动态耦合强度 Aij(t) = 0.5 * (sin(ω0 t * (1 + chaos) + φij) + 1)
  const ω0 = 0.1;
  const φ = (i + j) * Math.PI / 7;
  const chaos = 0.2 * Math.sin(0.3 * t) * Math.cos(0.7 * t); // 混沌项
  return 0.5 * (Math.sin(ω0 * t * (1 + chaos) + φ) + 1);
}

function computeLaplacian(N, edges, t) {
  // 构造邻接矩阵A
  const A = Array.from({length: N}, () => Array(N).fill(0));
  edges.forEach(edge => {
    const aij = getDynamicAij(edge.from, edge.to, t);
    A[edge.from][edge.to] = aij;
    A[edge.to][edge.from] = aij;
    edge.Aij = aij; // 供主线程可视化
  });
  // 拉普拉斯矩阵L = D - A
  const L = Array.from({length: N}, () => Array(N).fill(0));
  for(let i=0; i<N; i++) {
    let deg = 0;
    for(let j=0; j<N; j++) deg += A[i][j];
    for(let j=0; j<N; j++) {
      L[i][j] = (i === j ? deg : 0) - A[i][j];
    }
  }
  return L;
}

self.addEventListener('message', function(e) {
  const { incomeCount, expenseCount } = e.data;
  const N = Math.min(20, incomeCount + expenseCount + 5);
  const nodes = [];
  const edges = [];

  // 3D球面分布
  for(let i=0; i<N; i++) {
    const phi = (2 * Math.PI * i) / N;
    const theta = Math.acos(2 * (i + 1) / (N + 1) - 1);
    nodes.push({
      x: Math.sin(theta) * Math.cos(phi),
      y: Math.sin(theta) * Math.sin(phi),
      z: Math.cos(theta),
      name: `v${i+1}`
    });
  }
  for(let i=0; i<N; i++) {
    for(let j=i+1; j<N; j++) {
      const distance = Math.abs(i-j);
      if (Math.random() < 0.8 / distance) {
        edges.push({ from: i, to: j, entropy: Math.random() });
      }
    }
  }

  // 动态耦合与拉普拉斯矩阵
  const t = Date.now() / 1000;
  computeLaplacian(N, edges, t);

  // 局部熵产生（公式2）
  let totalEntropy = 0;
  const nodeDegrees = {};
  edges.forEach(edge => {
    nodeDegrees[edge.from] = (nodeDegrees[edge.from] || 0) + 1;
    nodeDegrees[edge.to] = (nodeDegrees[edge.to] || 0) + 1;
  });
  edges.forEach(edge => {
    const p = 1 / nodeDegrees[edge.from];
    totalEntropy += -p * Math.log(p);
  });
  const avgEntropy = edges.length ? totalEntropy / edges.length : 0;

  self.postMessage({ nodes, edges, avgEntropy, N });
});