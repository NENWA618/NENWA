// 量子可视化计算专用Web Worker - 增强版
// 包含动态耦合、拉普拉斯矩阵和局部熵计算

// 增强动态耦合函数 - 加入混沌因子和自适应频率
function getDynamicAij(i, j, t, N) {
    // 基础参数
    const ω0 = 0.1;  // 基础频率
    const φ = (i + j) * Math.PI / 7;  // 相位差
    
    // 混沌项 - 增强非线性特性
    const chaos = 0.2 * Math.sin(0.3 * t) * Math.cos(0.7 * t) + 
                  0.1 * Math.sin(0.5 * t) * Math.cos(1.2 * t);
    
    // 自适应缩放因子 - 根据节点数量调整
    const scaleFactor = 1 + Math.log(N) / 10;
    
    // 动态耦合强度计算
    return 0.5 * (Math.sin(ω0 * t * (1 + chaos * scaleFactor) + φ) + 0.5);
}

// 计算拉普拉斯矩阵 - 优化性能
function computeLaplacian(N, edges, t) {
    // 使用TypedArray提高性能
    const A = new Float32Array(N * N).fill(0);
    const degrees = new Float32Array(N).fill(0);

    // 构造邻接矩阵并计算节点度
    edges.forEach(edge => {
        const aij = getDynamicAij(edge.from, edge.to, t, N);
        
        // 对称矩阵
        A[edge.from * N + edge.to] = aij;
        A[edge.to * N + edge.from] = aij;
        
        // 更新节点度
        degrees[edge.from] += aij;
        degrees[edge.to] += aij;
        
        // 存储供可视化使用
        edge.Aij = aij;
    });

    // 计算拉普拉斯矩阵 L = D - A
    const L = new Float32Array(N * N);
    for(let i = 0; i < N; i++) {
        for(let j = 0; j < N; j++) {
            L[i * N + j] = (i === j ? degrees[i] : 0) - A[i * N + j];
        }
    }

    return { A, L, degrees };
}

// 增强熵计算 - 考虑耦合强度权重
function calculateEntropy(edges, degrees) {
    let totalEntropy = 0;
    let validEdges = 0;

    edges.forEach(edge => {
        if (degrees[edge.from] > 0) {
            const p = edge.Aij / degrees[edge.from];
            if (p > 0) {  // 避免log(0)
                totalEntropy += -p * Math.log(p);
                validEdges++;
            }
        }
    });

    return validEdges > 0 ? totalEntropy / validEdges : 0;
}

// 生成3D球面节点分布 - 优化布局
function generateNodes(N) {
    const nodes = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for(let i = 0; i < N; i++) {
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / N);
        
        nodes.push({
            x: Math.cos(theta) * Math.sin(phi),
            y: Math.sin(theta) * Math.sin(phi),
            z: Math.cos(phi),
            name: `N${i+1}`,
            group: i % 3  // 用于可视化分组
        });
    }
    
    return nodes;
}

// 生成边连接 - 基于距离概率
function generateEdges(nodes, N) {
    const edges = [];
    const maxDistance = 3;  // 最大连接距离
    
    for(let i = 0; i < N; i++) {
        for(let j = i + 1; j < Math.min(i + maxDistance + 1, N); j++) {
            // 基于距离的概率连接
            const distance = j - i;
            const connectProbability = 0.7 / distance;
            
            if (Math.random() < connectProbability) {
                edges.push({ 
                    from: i, 
                    to: j,
                    baseStrength: 0.3 + Math.random() * 0.7  // 基础连接强度
                });
            }
        }
    }
    
    // 确保至少有一些连接
    if (edges.length < N / 2) {
        for(let i = 0; i < N / 2; i++) {
            const from = Math.floor(Math.random() * N);
            const to = (from + 1 + Math.floor(Math.random() * (N-1))) % N;
            edges.push({ from, to, baseStrength: 0.5 });
        }
    }
    
    return edges;
}

// 主消息处理
self.addEventListener('message', function(e) {
    const { incomeCount, expenseCount } = e.data;
    
    // 动态调整节点数量
    const N = Math.min(30, Math.max(8, incomeCount + expenseCount + 3));
    
    // 生成节点和边
    const nodes = generateNodes(N);
    const edges = generateEdges(nodes, N);
    
    // 计算动态特性
    const t = Date.now() / 1000;  // 使用时间作为动态参数
    const { degrees } = computeLaplacian(N, edges, t);
    
    // 计算熵值
    const avgEntropy = calculateEntropy(edges, degrees);
    
    // 计算平均耦合强度
    const avgCoupling = edges.reduce((sum, edge) => sum + edge.Aij, 0) / edges.length || 0;
    
    // 发送结果
    self.postMessage({ 
        nodes, 
        edges, 
        metrics: {
            entropy: avgEntropy,
            coupling: avgCoupling,
            nodeCount: N,
            edgeCount: edges.length,
            timestamp: t
        }
    });
});

// 错误处理
self.addEventListener('error', function(e) {
    console.error('[Quantum Worker] Error:', e);
    self.postMessage({ error: 'Quantum computation failed' });
});