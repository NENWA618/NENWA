import * as budget from './budget.js';

// Service Worker 注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js').then(function(registration) {
      registration.update();
    });
  });
}

// 量子常数
const tP = 5.39e-44;
const hbar = 1.0545718e-34;
const kB = 1.380649e-23;
const TEMPORAL_RESOLUTION = 42e-18;
let λL = 0.5;
const ω0 = 0.1;
const D = 0.01;

// 缓存常用DOM元素
const elements = {
  incomeTable: document.querySelector("#incomeTable tbody"),
  expenseTable: document.querySelector("#expenseTable tbody"),
  searchInput: document.getElementById("searchInput"),
  searchBar: document.getElementById("searchBar"),
  backToTop: document.getElementById("backToTop"),
  remindersList: document.getElementById("reminders-list"),
  totalAmount: document.getElementById("totalAmount"),
  remainingAmount: document.getElementById("remainingAmount"),
  observerLayers: document.getElementById("observerLayers"),
  entropyRate: document.getElementById("entropyRate"),
  temporalResolution: document.getElementById("temporalResolution"),
  quantumViz: document.getElementById("quantum-viz"),
  predictedIncome: document.getElementById("predictedIncome"),
  predictedExpense: document.getElementById("predictedExpense"),
  budgetSuggestion: document.getElementById("budgetSuggestion"),
  incomeDate: document.getElementById("incomeDate"),
  incomeSource: document.getElementById("incomeSource"),
  incomeCategory: document.getElementById("incomeCategory"),
  incomeAmount: document.getElementById("incomeAmount"),
  expenseDate: document.getElementById("expenseDate"),
  itemName: document.getElementById("itemName"),
  expenseCategory: document.getElementById("expenseCategory"),
  itemPrice: document.getElementById("itemPrice"),
  itemQuantity: document.getElementById("itemQuantity"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  addIncomeBtn: document.getElementById("addIncomeBtn"),
  addItemBtn: document.getElementById("addItemBtn"),
  clearDataBtn: document.getElementById("clearDataBtn"),
  filterBtn: document.getElementById("filterBtn"),
  predictBtn: document.getElementById("predictBtn"),
  addReminderBtn: document.getElementById("add-reminder"),
  reminderDate: document.getElementById("reminder-date"),
  reminderText: document.getElementById("reminder-text"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  upcomingEvents: document.getElementById("upcoming-events"),
};
budget.elements = elements;

// 节流函数
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// 鼠标位置追踪
let lastX = 0;
document.addEventListener('mousemove', (e) => {
  const speed = Math.abs(e.clientX - lastX);
  const panicLevel = Math.min(speed / 10, 5);
  document.documentElement.style.setProperty('--mouse-x',
    (e.clientX / window.innerWidth - 0.5) * panicLevel);
  lastX = e.clientX;
});

// 搜索功能
document.getElementById("searchToggle").addEventListener("click", function() {
  elements.searchBar.style.display = elements.searchBar.style.display === "flex" ? "none" : "flex";
});

function performSearch() {
  var query = elements.searchInput.value.toLowerCase().trim();

  if (!query) {
    alert("请输入搜索内容");
    return;
  }

  var recipes = document.querySelectorAll("#recipes h3 a");
  var hiddenSections = document.querySelectorAll(".hidden-content");
  let found = false;

  function normalizeText(text) {
    return text.replace(/\s+/g, '').toLowerCase();
  }

  recipes.forEach(function(recipe) {
    if (normalizeText(recipe.textContent).includes(query)) {
      recipe.scrollIntoView({ behavior: "smooth", block: "center" });
      recipe.style.background = "#00f0ff";
      setTimeout(() => recipe.style.background = "", 1200);
      found = true;
    }
  });

  hiddenSections.forEach(function(section) {
    if (normalizeText(section.textContent).includes(query)) {
      section.style.display = "block";
      section.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => section.style.display = "", 2000);
      found = true;
    }
  });

  if (!found) {
    alert("未找到相关内容");
  }
}

elements.searchInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    performSearch();
  }
});
document.getElementById("searchBtn").addEventListener("click", performSearch);

// 回到顶部
window.addEventListener("scroll", function () {
  if (window.scrollY > 300) {
    elements.backToTop.style.display = "block";
  } else {
    elements.backToTop.style.display = "none";
  }
});

elements.backToTop.addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// 平滑滚动 - 修改后的内部链接处理
function handleInternalLink(e) {
  e.preventDefault();
  const targetId = this.getAttribute('href');
  const target = document.querySelector(targetId);

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.querySelectorAll('.internal-link').forEach(anchor => {
  anchor.addEventListener('click', handleInternalLink);
});

// 本地存储（只用 budget.js 的数据对象）
function saveDataToLocalStorage() {
  const data = {
    incomeRecords: budget.incomeRecords,
    expenseRecords: budget.expenseRecords,
    reminders: budget.reminders
  };
  localStorage.setItem("budgetData", JSON.stringify(data));
}
budget.saveDataToLocalStorage = saveDataToLocalStorage;

function loadDataFromLocalStorage() {
  showLoading();
  const data = JSON.parse(localStorage.getItem("budgetData"));
  if (data) {
    budget.incomeRecords.length = 0;
    budget.expenseRecords.length = 0;
    budget.reminders.length = 0;
    data.incomeRecords && budget.incomeRecords.push(...data.incomeRecords);
    data.expenseRecords && budget.expenseRecords.push(...data.expenseRecords);
    data.reminders && budget.reminders.push(...data.reminders);
  }
  budget.renderIncomeTable();
  budget.renderExpenseTable();
  renderRemindersList();
  updateBudget();
  updateCharts();
  throttledRenderQuantumViz();
  hideLoading();
}
budget.loadDataFromLocalStorage = loadDataFromLocalStorage;

// 显示加载状态
function showLoading() {
  elements.loadingOverlay.style.display = 'flex';
}
function hideLoading() {
  elements.loadingOverlay.style.display = 'none';
}

// ====== 量子意识可视化 Web Worker 相关 ======
let quantumWorker;
if (window.Worker) {
  quantumWorker = new Worker('quantum-worker.js');
  quantumWorker.onmessage = function(e) {
    const { nodes, edges, avgEntropy, N } = e.data;
    renderQuantumVizFromWorker(nodes, edges, avgEntropy, N);
  };
}

const throttledRenderQuantumViz = throttle(renderQuantumViz, 300);
budget.throttledRenderQuantumViz = throttledRenderQuantumViz;

function renderQuantumViz() {
  if (quantumWorker) {
    quantumWorker.postMessage({
      incomeCount: budget.incomeRecords.length,
      expenseCount: budget.expenseRecords.length
    });
  }
}

function renderQuantumVizFromWorker(nodes, edges, avgEntropy, N) {
  const container = elements.quantumViz;
  if (!container) return;
  container.innerHTML = '';
  nodes.forEach(node => {
    const el = document.createElement('div');
    el.className = 'quantum-node';
    el.style.left = `${node.x}%`;
    el.style.top = `${node.y}%`;
    el.title = node.name;
    container.appendChild(el);
  });
  edges.forEach(edge => {
    const node1 = nodes[edge.from], node2 = nodes[edge.to];
    const link = document.createElement('div');
    link.className = 'quantum-link';
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    const length = Math.sqrt(dx*dx + dy*dy) * 0.01 * container.offsetWidth;
    const angle = Math.atan2(dy, dx);
    link.style.width = `${length}px`;
    link.style.left = `${node1.x}%`;
    link.style.top = `${node1.y}%`;
    link.style.transform = `rotate(${angle}rad)`;
    link.style.opacity = 0.3 + 0.7 * (1 - parseFloat(edge.entropy));
    container.appendChild(link);
  });
  elements.observerLayers.textContent = N;
  elements.entropyRate.textContent = avgEntropy.toFixed(3);
  elements.temporalResolution.textContent = '42 as';
}

// 量子分析功能
const quantumAnalyzeBtn = document.getElementById('quantum-analyze');
if (quantumAnalyzeBtn) {
  quantumAnalyzeBtn.addEventListener('click', function() {
    const β_crit = 1.23;
    const D_f = 2.31;
    const S_i = parseFloat(elements.entropyRate?.textContent || "0");
    const N_crit = β_crit;
    const C0 = 1;
    const capacity = C0 * Math.exp(-N_crit * S_i * tP / hbar);

    let message = `RQCM Quantum Financial Analysis:\n\n`;
    message += `• Consciousness Nodes: ${budget.incomeRecords.length + budget.expenseRecords.length}\n`;
    message += `• Critical Sync Threshold (β_crit): ${β_crit}\n`;
    message += `• Fractal Dimension (D_f): ${D_f}\n`;
    message += `• Local Entropy Production (S_i): ${S_i.toFixed(3)} nats/s\n`;
    message += `• EDCP Capacity: ${(capacity * 100).toFixed(1)}%\n`;
    message += `• Temporal Resolution: 42 as\n`;

    if(capacity < 0.3) {
      message += "\n⚠️ Capacity is low. Consider reducing financial entropy or increasing income sources.";
    } else {
      message += "\n✅ Quantum financial state is stable.";
    }

    message += "\n\nExperimental Reference:\n";
    message += `• Reality Channel: N_crit=7, S=1.2±0.3 nats/s\n`;
    message += `• Dream Channel: N_crit=23, S=0.4±0.2 nats/s\n`;
    message += `• Critical Threshold: β_crit=1.23±0.07\n`;

    alert(message);
  });
}

// 事件监听
elements.addIncomeBtn.addEventListener("click", budget.addIncome);
elements.addItemBtn.addEventListener("click", budget.addExpense);
elements.clearDataBtn.addEventListener("click", clearData);
elements.filterBtn.addEventListener("click", filterRecords);
elements.predictBtn.addEventListener("click", updatePredictionUI);
elements.addReminderBtn.addEventListener("click", function() {
  const date = elements.reminderDate.value;
  const text = elements.reminderText.value;
  if (!date || !text) {
    budget.showError("请输入提醒日期和内容");
    return;
  }
  budget.reminders.push({ date, text });
  renderRemindersList();
  saveDataToLocalStorage();
  elements.reminderDate.value = "";
  elements.reminderText.value = "";
});

// 删除按钮事件委托
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-btn')) {
    const id = Number(e.target.dataset.id);
    if (e.target.closest('#incomeTable')) budget.deleteIncome(id);
    else if (e.target.closest('#expenseTable')) budget.deleteExpense(id);
  }
});

// 清空数据
function clearData() {
  if (confirm("确定要清空所有数据吗？")) {
    budget.incomeRecords.length = 0;
    budget.expenseRecords.length = 0;
    budget.reminders.length = 0;
    budget.renderIncomeTable();
    budget.renderExpenseTable();
    renderRemindersList();
    updateBudget();
    saveDataToLocalStorage();
    throttledRenderQuantumViz();
    updateCharts();
  }
}

// 更新预算
function updateBudget() {
  const totalIncome = budget.incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = budget.expenseRecords.reduce((sum, r) => sum + r.price * r.quantity, 0);
  elements.totalAmount.textContent = totalExpense.toFixed(2);
  elements.remainingAmount.textContent = (totalIncome - totalExpense).toFixed(2);
}
budget.updateBudget = updateBudget;

// 日期过滤
function filterRecords() {
  const startDate = elements.startDate.value;
  const endDate = elements.endDate.value;
  let filteredIncome = budget.incomeRecords;
  let filteredExpense = budget.expenseRecords;
  if (startDate) {
    filteredIncome = filteredIncome.filter(r => r.date >= startDate);
    filteredExpense = filteredExpense.filter(r => r.date >= startDate);
  }
  if (endDate) {
    filteredIncome = filteredIncome.filter(r => r.date <= endDate);
    filteredExpense = filteredExpense.filter(r => r.date <= endDate);
  }
  renderFilteredTables(filteredIncome, filteredExpense);
}

function renderFilteredTables(filteredIncome, filteredExpense) {
  // Income
  elements.incomeTable.innerHTML = "";
  filteredIncome.forEach(record => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Source">${budget.safeText(record.source)}</td>
      <td data-label="Category">${budget.safeText(record.category)}</td>
      <td data-label="Amount (RM)">${record.amount.toFixed(2)}</td>
      <td data-label="Date">${budget.safeText(record.date)}</td>
      <td data-label="Action"><button class="delete-btn" data-id="${record.id}">Delete</button></td>
    `;
    elements.incomeTable.appendChild(tr);
  });
  // Expense
  elements.expenseTable.innerHTML = "";
  filteredExpense.forEach(record => {
    const total = record.price * record.quantity;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Item Name">${budget.safeText(record.name)}</td>
      <td data-label="Category">${budget.safeText(record.category)}</td>
      <td data-label="Price (RM)">${record.price.toFixed(2)}</td>
      <td data-label="Quantity">${record.quantity}</td>
      <td data-label="Total (RM)">${total.toFixed(2)}</td>
      <td data-label="Date">${budget.safeText(record.date)}</td>
      <td data-label="Action"><button class="delete-btn" data-id="${record.id}">Delete</button></td>
    `;
    elements.expenseTable.appendChild(tr);
  });
}

// 量子预测算法
function calculateLinearRegression(data) {
    if (data.length < 2) return { slope: 0, intercept: 0 };
    let n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }
    let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    let intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

// 标准差计算 (用于置信区间)
function calculateStandardDeviation(data) {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
    return Math.sqrt(variance);
}

function recursiveLayerPrediction(data, decay = 0.85) {
    if (data.length === 0) return 0;
    let prediction = data[data.length - 1];
    for (let i = data.length - 2; i >= 0; i--) {
        prediction = decay * prediction + (1 - decay) * data[i];
    }
    return prediction;
}

function simulateQuantumNoise(mean = 0, stdDev = 0.01, data = []) {
    // 简单高斯噪声
    return mean + stdDev * (Math.random() * 2 - 1);
}

function predictFutureIncomeOrExpenses() {
    // 取最近3个月数据
    const incomeByMonth = {};
    const expenseByMonth = {};
    budget.incomeRecords.forEach(r => {
        const month = r.date.slice(0, 7);
        incomeByMonth[month] = (incomeByMonth[month] || 0) + r.amount;
    });
    budget.expenseRecords.forEach(r => {
        const month = r.date.slice(0, 7);
        expenseByMonth[month] = (expenseByMonth[month] || 0) + r.price * r.quantity;
    });
    const months = Object.keys(incomeByMonth).sort();
    const incomeArr = months.map(m => incomeByMonth[m]);
    const expenseArr = months.map(m => expenseByMonth[m] || 0);

    // 线性回归预测
    const incomeReg = calculateLinearRegression(incomeArr);
    const expenseReg = calculateLinearRegression(expenseArr);

    const nextIncome = incomeReg.intercept + incomeReg.slope * incomeArr.length + simulateQuantumNoise(0, calculateStandardDeviation(incomeArr));
    const nextExpense = expenseReg.intercept + expenseReg.slope * expenseArr.length + simulateQuantumNoise(0, calculateStandardDeviation(expenseArr));

    return {
        predictedIncome: Math.max(0, nextIncome),
        predictedExpense: Math.max(0, nextExpense)
    };
}

// 论文中的递归现实生成算子 (公式4)
function recursiveRealityGeneration(data, N_crit) {
    // 简化版
    return data.reduce((sum, v) => sum + v, 0) / (N_crit || 1);
}

// 模拟EDCP相变噪声 (基于论文中的公式3)
function simulateEDCPNoise(N_obs) {
    return Math.random() * Math.log(N_obs + 1);
}

function updatePredictionUI() {
    const { predictedIncome, predictedExpense } = predictFutureIncomeOrExpenses();
    elements.predictedIncome.textContent = `Predicted income for next month: RM ${predictedIncome.toFixed(2)}`;
    elements.predictedExpense.textContent = `Predicted expense for next month: RM ${predictedExpense.toFixed(2)}`;
    let suggestion = "";
    if (predictedIncome > predictedExpense) {
        suggestion = "Your budget is healthy. Consider increasing savings or investments.";
    } else {
        suggestion = "Warning: Predicted expenses exceed income. Please review your spending!";
    }
    elements.budgetSuggestion.textContent = suggestion;
}

// 图表变量
let expenseChart, incomeChart;

// 更新图表数据
function updateCharts() {
    // 分类
    const expenseCategories = {};
    budget.expenseRecords.forEach(r => {
        expenseCategories[r.category] = (expenseCategories[r.category] || 0) + r.price * r.quantity;
    });
    const incomeCategories = {};
    budget.incomeRecords.forEach(r => {
        incomeCategories[r.category] = (incomeCategories[r.category] || 0) + r.amount;
    });

    // 支出图表
    const expenseCtx = document.getElementById("expenseChart").getContext("2d");
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(expenseCtx, {
        type: "doughnut",
        data: {
            labels: Object.keys(expenseCategories),
            datasets: [{
                data: Object.values(expenseCategories),
                backgroundColor: [
                    "#9d00ff", "#00f0ff", "#ffcc00", "#ff6b6b", "#6e00ff", "#1a1a3a"
                ]
            }]
        },
        options: {
            plugins: {
                legend: { display: true, position: "bottom" }
            }
        }
    });

    // 收入图表
    const incomeCtx = document.getElementById("incomeChart").getContext("2d");
    if (incomeChart) incomeChart.destroy();
    incomeChart = new Chart(incomeCtx, {
        type: "doughnut",
        data: {
            labels: Object.keys(incomeCategories),
            datasets: [{
                data: Object.values(incomeCategories),
                backgroundColor: [
                    "#00f0ff", "#9d00ff", "#ffcc00", "#6e00ff"
                ]
            }]
        },
        options: {
            plugins: {
                legend: { display: true, position: "bottom" }
            }
        }
    });
}

// 数据分类函数
function categorizeData() {
    // 可根据需要扩展
}

// 图表初始化
function initCharts() {
    updateCharts();
}

// 自定义日历实现
function initCustomCalendar() {
    // 可根据需要实现
}

// 辅助函数：确保日期格式为YYYY-MM-DD
function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateRemindersCount() {
  const count = budget.reminders.length;
  elements.upcomingEvents.textContent = count;
}

function renderRemindersList() {
  elements.remindersList.innerHTML = "";
  budget.reminders.forEach(reminder => {
    const div = document.createElement("div");
    div.className = "reminder-item" + (reminder.date < formatDate(new Date()) ? " past" : "");
    div.innerHTML = `
      <span class="reminder-date">${budget.safeText(reminder.date)}</span>
      <span class="reminder-text">${budget.safeText(reminder.text)}</span>
      <button class="delete-reminder" data-date="${budget.safeText(reminder.date)}" data-text="${budget.safeText(reminder.text)}">×</button>
    `;
    elements.remindersList.appendChild(div);
  });
  updateRemindersCount();
}

// 事件委托：删除提醒
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-reminder')) {
    const date = e.target.dataset.date;
    const text = e.target.dataset.text;
    budget.reminders = budget.reminders.filter(r => !(r.date === date && r.text === text));
    renderRemindersList();
    saveDataToLocalStorage();
  }
});

// 预算警告系统
function checkBudgetWarnings() {
    // 可根据需要实现
}

// 计算香农熵
function calculateEntropy(data) {
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return -data.map(x => x / total).reduce((sum, p) => p > 0 ? sum + p * Math.log(p) : sum, 0);
}

function showQuantumAlert(title, message, color = '#00f0ff') {
    alert(`${title}\n\n${message}`);
}

// 表单验证增强
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 3000);
}
budget.showError = showError;

// 页面加载和窗口变化时渲染
window.addEventListener('load', function() {
  document.body.classList.add('loaded');
  loadDataFromLocalStorage();

  // 卡片入场动画
  const cards = document.querySelectorAll('.welcome-card');
  cards.forEach((card, index) => {
    card.style.transition = `all 0.5s ease ${index * 0.1}s`;
    setTimeout(() => {
      card.classList.add('visible');
    }, 100);
  });
});
window.addEventListener('resize', throttle(renderQuantumViz, 300));

// 初始化
window.addEventListener('load', function() {
  // 你原有的初始化逻辑
  // 如 initCharts();
  renderRemindersList();
  updateBudget();
  throttledRenderQuantumViz();
  addDataLabelsToMobileTables();
});

window.addEventListener('resize', function() {
  addDataLabelsToMobileTables();
});

// 移动端表格添加数据标签
function addDataLabelsToMobileTables() {
  // Income
  document.querySelectorAll("#incomeTable tbody tr").forEach(tr => {
    tr.querySelectorAll("td").forEach((td, idx) => {
      const th = document.querySelector(`#incomeTable thead th:nth-child(${idx + 1})`);
      if (th) td.setAttribute("data-label", th.textContent);
    });
  });
  // Expense
  document.querySelectorAll("#expenseTable tbody tr").forEach(tr => {
    tr.querySelectorAll("td").forEach((td, idx) => {
      const th = document.querySelector(`#expenseTable thead th:nth-child(${idx + 1})`);
      if (th) td.setAttribute("data-label", th.textContent);
    });
  });
}