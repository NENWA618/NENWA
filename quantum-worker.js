// 量子可视化计算专用Web Worker

self.addEventListener('message', function(e) {
  const { incomeCount, expenseCount } = e.data;
  const N = Math.min(20, incomeCount + expenseCount + 5);
  const nodes = [];
  const edges = [];
  for(let i=0; i<N; i++) {
    const angle = (2 * Math.PI * i) / N;
    nodes.push({
      x: 50 + 40 * Math.cos(angle),
      y: 50 + 40 * Math.sin(angle),
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