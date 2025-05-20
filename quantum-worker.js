// 量子可视化计算专用Web Worker

self.addEventListener('message', function(e) {
  const { incomeCount, expenseCount } = e.data;
  const N = Math.min(20, incomeCount + expenseCount + 5);
  const nodes = [];
  const edges = [];

  // 3D球面分布
  for(let i=0; i<N; i++) {
    // 球面坐标
    const phi = (2 * Math.PI * i) / N;
    const theta = Math.acos(2 * (i + 1) / (N + 1) - 1);
    nodes.push({
      // 3D坐标，实际渲染时由主线程投影
      x: Math.sin(theta) * Math.cos(phi),
      y: Math.sin(theta) * Math.sin(phi),
      z: Math.cos(theta),
      name: `v${i+1}`
    });
  }
  for(let i=0; i<N; i++) {
    for(let j=i+1; j<N; j++) {
      // 基于距离的概率连接（更接近真实网络）
      const distance = Math.abs(i-j);
      if (Math.random() < 0.8 / distance) {
        edges.push({ from: i, to: j, entropy: Math.random() });
      }
    }
  }
  
  // 局部熵产生
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