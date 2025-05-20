import * as budget from "./budget.js";

// Service Worker 注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}

function showError(msg) {
  // 你可以自定义UI，这里用alert
  alert(msg);
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
budget.setElements(elements);

// 节流函数
function throttle(func, limit) {
  let inThrottle, lastFn, lastTime;
  return function () {
    const context = this, args = arguments;
    if (!inThrottle) {
      func.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(function () {
        if ((Date.now() - lastTime) >= limit) {
          func.apply(context, args);
          lastTime = Date.now();
        }
      }, limit - (Date.now() - lastTime));
    }
  };
}

// 本地存储
function saveDataToLocalStorage() {
  localStorage.setItem("incomeRecords", JSON.stringify(budget.incomeRecords));
  localStorage.setItem("expenseRecords", JSON.stringify(budget.expenseRecords));
  localStorage.setItem("reminders", JSON.stringify(budget.reminders));
}
function loadDataFromLocalStorage() {
  try {
    budget.incomeRecords.splice(0, budget.incomeRecords.length, ...(JSON.parse(localStorage.getItem("incomeRecords")) || []));
    budget.expenseRecords.splice(0, budget.expenseRecords.length, ...(JSON.parse(localStorage.getItem("expenseRecords")) || []));
    budget.reminders.splice(0, budget.reminders.length, ...(JSON.parse(localStorage.getItem("reminders")) || []));
  } catch {}
}

// 显示/隐藏加载动画
function showLoading() {
  if (elements.loadingOverlay) elements.loadingOverlay.style.display = "flex";
}
function hideLoading() {
  if (elements.loadingOverlay) elements.loadingOverlay.style.display = "none";
}

// 日历相关
let calendarYear, calendarMonth;
function renderCalendar() {
  // 检查并补充日历DOM结构
  let calendarView = document.getElementById('calendar-view');
  if (calendarView && !document.getElementById('current-month-year')) {
    calendarView.innerHTML = `
      <div class="calendar-header">
        <button id="prev-month">‹</button>
        <span id="current-month-year"></span>
        <button id="next-month">›</button>
      </div>
      <div class="calendar-weekdays" id="calendar-weekdays"></div>
      <div class="calendar-days" id="calendar-days"></div>
    `;
    // 绑定切换事件
    document.getElementById('prev-month')?.addEventListener('click', function() {
      calendarMonth--;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
      }
      renderCalendar();
    });
    document.getElementById('next-month')?.addEventListener('click', function() {
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderCalendar();
    });
  }

  const daysContainer = document.getElementById('calendar-days');
  const monthYearLabel = document.getElementById('current-month-year');
  const weekdaysContainer = document.getElementById('calendar-weekdays');
  if (!daysContainer || !monthYearLabel || !weekdaysContainer) return;

  const today = new Date();
  if (calendarYear === undefined) calendarYear = today.getFullYear();
  if (calendarMonth === undefined) calendarMonth = today.getMonth();

  const year = calendarYear;
  const month = calendarMonth;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthYearLabel.textContent = `${year}-${String(month + 1).padStart(2, '0')}`;

  // 渲染星期
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdaysContainer.innerHTML = weekdays.map(w => `<div>${w}</div>`).join('');

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="prev-date"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    html += `<div${d === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? ' class="today"' : ''}>${d}</div>`;
  }
  daysContainer.innerHTML = html;
}

// 量子可视化 Web Worker
let quantumWorker;
if (window.Worker) {
  quantumWorker = new Worker("quantum-worker.js");
  quantumWorker.onmessage = function (e) {
    const { nodes, edges, avgEntropy, N } = e.data;
    renderQuantumVizFromWorker(nodes, edges, avgEntropy, N);
  };
}

const throttledRenderQuantumViz = throttle(renderQuantumViz, 300);

function renderQuantumViz() {
  if (!quantumWorker) return;
  quantumWorker.postMessage({
    incomeCount: budget.incomeRecords.length,
    expenseCount: budget.expenseRecords.length
  });
}

// ========================
// 量子可视化美化（动态耦合、3D结构）
// ========================
function renderQuantumVizFromWorker(nodes, edges, avgEntropy, N) {
  const container = elements.quantumViz;
  if (!container) return;
  container.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.width = container.offsetWidth || 600;
  canvas.height = container.offsetHeight || 200;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // 3D->2D投影
  const projected = nodes.map(node => {
    const scale = 80;
    const x2d = canvas.width / 2 + node.x * scale * 1.2;
    const y2d = canvas.height / 2 + node.y * scale * 0.8;
    return { ...node, x2d, y2d };
  });

  // 绘制连线（动态耦合强度映射）
  edges.forEach(edge => {
    const n1 = projected[edge.from];
    const n2 = projected[edge.to];
    ctx.save();
    const strength = edge.Aij || 0.5;
    ctx.globalAlpha = 0.3 + 0.7 * strength;
    ctx.strokeStyle = `rgba(0,240,255,${strength})`;
    ctx.lineWidth = 1 + 4 * strength;
    ctx.beginPath();
    ctx.moveTo(n1.x2d, n1.y2d);
    ctx.lineTo(n2.x2d, n2.y2d);
    ctx.stroke();
    ctx.restore();
  });

  // 绘制节点
  projected.forEach(node => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x2d, node.y2d, 7, 0, 2 * Math.PI);
    ctx.fillStyle = "#9d00ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = "12px Orbitron, Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(node.name, node.x2d + 8, node.y2d - 8);
    ctx.restore();
  });

  // UI指标
  if (elements.observerLayers) elements.observerLayers.textContent = N;
  if (elements.entropyRate) elements.entropyRate.textContent = avgEntropy.toFixed(3);
  if (elements.temporalResolution) elements.temporalResolution.textContent = TEMPORAL_RESOLUTION.toExponential(2);
}

// 预算统计与熵驱动预警
function calculateEntropy(records) {
  const total = records.reduce((sum, r) => sum + (r.price ? r.price * r.quantity : r.amount), 0);
  if (!total) return 0;
  return -records.reduce((sum, r) => {
    const value = r.price ? r.price * r.quantity : r.amount;
    const p = value / total;
    return p > 0 ? sum + p * Math.log(p) : sum;
  }, 0);
}

function updateBudget() {
  const totalIncome = budget.incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = budget.expenseRecords.reduce((sum, r) => sum + r.price * r.quantity, 0);
  if (elements.totalAmount) elements.totalAmount.textContent = totalExpense.toFixed(2);
  if (elements.remainingAmount) elements.remainingAmount.textContent = (totalIncome - totalExpense).toFixed(2);

  // --- 熵驱动预算预警 ---
  const entropy = calculateEntropy(budget.expenseRecords);
  // 估算噪声方差
  const mean = totalExpense / (budget.expenseRecords.length || 1);
  const noiseVariance = budget.expenseRecords.reduce((sum, r) => {
    const v = r.price * r.quantity;
    return sum + Math.pow(v - mean, 2);
  }, 0) / ((budget.expenseRecords.length || 1));
  const criticalThreshold = 2 * Math.sqrt(Math.pow(ω0,2) - noiseVariance);
  if (entropy > criticalThreshold) {
    budget.showError("量子熵超限！建议调整消费分布");
  }
}

// Chart.js 图表渲染
let expenseChart, incomeChart;

function updateCharts() {
  // 支出分类
  const expenseCategories = {};
  budget.expenseRecords.forEach(r => {
    expenseCategories[r.category] = (expenseCategories[r.category] || 0) + r.price * r.quantity;
  });
  const expenseLabels = Object.keys(expenseCategories);
  const expenseData = Object.values(expenseCategories);

  // 收入来源
  const incomeSources = {};
  budget.incomeRecords.forEach(r => {
    incomeSources[r.source] = (incomeSources[r.source] || 0) + r.amount;
  });
  const incomeLabels = Object.keys(incomeSources);
  const incomeData = Object.values(incomeSources);

  // 支出图
  const expenseCtx = document.getElementById("expenseChart")?.getContext("2d");
  if (expenseCtx) {
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(expenseCtx, {
      type: "doughnut",
      data: {
        labels: expenseLabels,
        datasets: [{
          data: expenseData,
          backgroundColor: ["#9d00ff", "#00f0ff", "#6e00ff", "#ffcc00", "#ff6b6b", "#00ff99"],
        }]
      },
      options: { plugins: { legend: { labels: { color: "#fff" } } } }
    });
  }
  // 收入图
  const incomeCtx = document.getElementById("incomeChart")?.getContext("2d");
  if (incomeCtx) {
    if (incomeChart) incomeChart.destroy();
    incomeChart = new Chart(incomeCtx, {
      type: "doughnut",
      data: {
        labels: incomeLabels,
        datasets: [{
          data: incomeData,
          backgroundColor: ["#00f0ff", "#9d00ff", "#ffcc00", "#6e00ff", "#00ff99"],
        }]
      },
      options: { plugins: { legend: { labels: { color: "#fff" } } } }
    });
  }
}

// 递归预测系统
function predictNextMonth(data) {
  return data * 1.05;
}
function recursivePredict(data, n = 5, ε = 0.01, prev = null) {
  if (n <= 0) return data;
  const next = predictNextMonth(data);
  if (prev !== null && Math.abs(next - prev) < ε) return next;
  const α = 0.7, λ = 0.3;
  return α * data + λ * recursivePredict(next, n - 1, ε, data);
}
function updatePredictionUI() {
  const incomeRecent = budget.incomeRecords.slice(-5);
  const expenseRecent = budget.expenseRecords.slice(-5);
  const avgIncome = incomeRecent.length
    ? incomeRecent.reduce((sum, r) => sum + r.amount, 0) / incomeRecent.length
    : 0;
  const avgExpense = expenseRecent.length
    ? expenseRecent.reduce((sum, r) => sum + r.price * r.quantity, 0) / expenseRecent.length
    : 0;
  const predictedIncome = recursivePredict(avgIncome);
  const predictedExpense = recursivePredict(avgExpense);
  if (elements.predictedIncome) elements.predictedIncome.textContent = `Predicted income for next month: RM ${predictedIncome.toFixed(2)}`;
  if (elements.predictedExpense) elements.predictedExpense.textContent = `Predicted expense for next month: RM ${predictedExpense.toFixed(2)}`;
  if (elements.budgetSuggestion) {
    if (predictedIncome - predictedExpense < 0) {
      elements.budgetSuggestion.textContent = "⚠️ 预算赤字风险，请调整支出结构";
      elements.budgetSuggestion.classList.add("quantum-critical");
    } else {
      elements.budgetSuggestion.textContent = "预算健康，继续保持！";
      elements.budgetSuggestion.classList.remove("quantum-critical");
    }
  }
}

// Quantum Recipes 动态渲染（如需）
const recipes = [
  { name: "oyakodon", label: "亲子丼（おやこどん）" },
  { name: "tendon", label: "天丼（てんどん）" },
  { name: "gyuudon", label: "牛丼（ぎゅうどん）" },
  { name: "katsudon", label: "カツ丼（かつどん）" },
  { name: "yakisoba", label: "焼きそば（やきそば）" },
  { name: "yakisudon", label: "焼うどん（やきうどん）" },
  { name: "kakeudon", label: "かけうどん" },
  { name: "tacorice", label: "タコライス" },
  { name: "makunouchibentou", label: "幕の内弁当（まくのうちべんとう）" },
  { name: "noriben", label: "のり弁（のりべん）" }
];
function renderRecipes() {
  // ...如需动态渲染食谱...
}

// 提醒相关
function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString();
}
function updateRemindersCount() {
  if (elements.upcomingEvents) elements.upcomingEvents.textContent = budget.reminders.length;
}
function renderRemindersList() {
  const list = elements.remindersList;
  if (!list) return;
  list.innerHTML = "";
  budget.reminders.forEach(rem => {
    const div = document.createElement("div");
    div.className = "reminder-item" + (new Date(rem.date) < new Date() ? " past" : "");
    div.innerHTML = `
      <span class="reminder-date">${formatDate(rem.date)}</span>
      <span class="reminder-text">${budget.safeText(rem.text)}</span>
      <button class="delete-reminder" data-id="${rem.id}">×</button>
    `;
    list.appendChild(div);
  });
  updateRemindersCount();
}

// 事件委托：删除提醒
document.addEventListener('click', function(e) {
  if (e.target.classList.contains("delete-reminder")) {
    const id = e.target.getAttribute("data-id");
    budget.reminders.splice(0, budget.reminders.length, ...budget.reminders.filter(r => r.id != id));
    renderRemindersList();
    saveDataToLocalStorage();
  }
});

// 梦境模式切换
document.getElementById('dreamMode')?.addEventListener('click', () => {
  document.body.classList.toggle('dream-state');
});

// 依赖注入
budget.injectDependencies({
  saveDataToLocalStorage,
  updateBudget,
  throttledRenderQuantumViz,
  updateCharts,
  showError
});

// 事件监听
elements.addIncomeBtn?.addEventListener("click", budget.addIncome);
elements.addItemBtn?.addEventListener("click", budget.addExpense);
elements.clearDataBtn?.addEventListener("click", () => {
  if (confirm("确定要清空所有数据吗？")) {
    budget.incomeRecords.length = 0;
    budget.expenseRecords.length = 0;
    budget.reminders.length = 0;
    saveDataToLocalStorage();
    budget.renderIncomeTable();
    budget.renderExpenseTable();
    renderRemindersList();
    updateBudget();
    updateCharts();
    throttledRenderQuantumViz();
    updatePredictionUI();
  }
});
elements.filterBtn?.addEventListener("click", () => {
  // ...筛选逻辑...
});
elements.predictBtn?.addEventListener("click", updatePredictionUI);
elements.addReminderBtn?.addEventListener("click", () => {
  const date = elements.reminderDate.value;
  const text = elements.reminderText.value;
  if (!date || !text) return;
  budget.reminders.push({ id: Date.now() + Math.random(), date, text });
  renderRemindersList();
  saveDataToLocalStorage();
  elements.reminderDate.value = "";
  elements.reminderText.value = "";
});

// 搜索栏切换
document.getElementById("searchToggle")?.addEventListener("click", () => {
  elements.searchBar.style.display = elements.searchBar.style.display === "flex" ? "none" : "flex";
});

// 回到顶部
elements.backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// Quantum Analysis 按钮功能
document.getElementById('quantum-analyze')?.addEventListener('click', () => {
  throttledRenderQuantumViz();
});

// 搜索功能
elements.searchInput?.addEventListener('input', function() {
  const query = this.value.trim().toLowerCase();
  // 示例：高亮匹配的食谱卡片
  document.querySelectorAll('.welcome-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
});
document.getElementById('searchBtn')?.addEventListener('click', function() {
  elements.searchInput?.dispatchEvent(new Event('input'));
});

// 页面加载
window.addEventListener("DOMContentLoaded", () => {
  loadDataFromLocalStorage();
  budget.renderIncomeTable();
  budget.renderExpenseTable();
  renderRemindersList();
  updateBudget();
  updateCharts();
  throttledRenderQuantumViz();
  updatePredictionUI();

  // 修复欢迎卡片透明问题
  document.querySelectorAll('.welcome-card').forEach(card => card.classList.add('visible'));

  // 渲染日历
  renderCalendar();

  setTimeout(() => {
    document.body.classList.add("loaded");
    hideLoading();
  }, 100);
});