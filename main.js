import * as budget from './budget.js';

// Service Worker 注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js');
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
budget.setElements(elements);

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

// 本地存储
function saveDataToLocalStorage() {
  const data = {
    incomeRecords: budget.incomeRecords,
    expenseRecords: budget.expenseRecords,
    reminders: budget.reminders
  };
  localStorage.setItem("budgetData", JSON.stringify(data));
}

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

// 显示/隐藏加载动画
function showLoading() {
  if (elements.loadingOverlay) elements.loadingOverlay.style.display = 'flex';
}
function hideLoading() {
  if (elements.loadingOverlay) {
    elements.loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      elements.loadingOverlay.style.display = 'none';
    }, 400);
  }
}

// ...在 main.js 顶部添加...
let calendarYear, calendarMonth;

function renderCalendar() {
  const daysContainer = document.getElementById('calendar-days');
  const monthYearLabel = document.getElementById('current-month-year');
  if (!daysContainer || !monthYearLabel) return;

  const today = new Date();
  if (calendarYear === undefined) calendarYear = today.getFullYear();
  if (calendarMonth === undefined) calendarMonth = today.getMonth();

  const year = calendarYear;
  const month = calendarMonth;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthYearLabel.textContent = `${year}-${String(month + 1).padStart(2, '0')}`;

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="prev-date"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    html += `<div${d === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? ' class="today"' : ''}>${d}</div>`;
  }
  daysContainer.innerHTML = html;
}

// 日历切换按钮事件
document.getElementById('prev-month').onclick = function() {
  calendarMonth--;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  renderCalendar();
};
document.getElementById('next-month').onclick = function() {
  calendarMonth++;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  renderCalendar();
};

// 量子可视化 Web Worker
let quantumWorker;
if (window.Worker) {
  quantumWorker = new Worker('quantum-worker.js');
  quantumWorker.onmessage = function(e) {
    const { nodes, edges, avgEntropy, N } = e.data;
    renderQuantumVizFromWorker(nodes, edges, avgEntropy, N);
  };
}

const throttledRenderQuantumViz = throttle(renderQuantumViz, 300);

function renderQuantumViz() {
  if (quantumWorker) {
    quantumWorker.postMessage({
      incomeCount: budget.incomeRecords.length,
      expenseCount: budget.expenseRecords.length
    });
  }
}

// ========================
// 量子可视化美化（限制线在板块内，准备3D结构）
// ========================
function renderQuantumVizFromWorker(nodes, edges, avgEntropy, N) {
  const container = elements.quantumViz;
  if (!container) return;
  container.innerHTML = '';

  // 限制节点和连线在容器内
  const width = container.offsetWidth;
  const height = container.offsetHeight;

  // 使用canvas绘制，准备3D结构（2.5D投影，z影响大小和透明度）
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // 3D投影参数
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.36;
  const zRadius = radius * 0.7;

  // 生成3D坐标
  const projected = nodes.map((node, i) => {
    // 3D球面分布
    const phi = (2 * Math.PI * i) / nodes.length;
    const theta = Math.acos(2 * (i + 1) / (nodes.length + 1) - 1);
    const x3d = radius * Math.sin(theta) * Math.cos(phi);
    const y3d = radius * Math.sin(theta) * Math.sin(phi);
    const z3d = zRadius * Math.cos(theta);

    // 简单正交投影
    const scale = 0.7 + 0.3 * (z3d / zRadius);
    return {
      ...node,
      x2d: centerX + x3d,
      y2d: centerY + y3d,
      z3d,
      scale
    };
  });

  // 画连线
  edges.forEach(edge => {
    const n1 = projected[edge.from];
    const n2 = projected[edge.to];
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.7 * (1 - parseFloat(edge.entropy));
    ctx.strokeStyle = '#9d00ff';
    ctx.lineWidth = 1.5 * (n1.scale + n2.scale) / 2;
    ctx.beginPath();
    ctx.moveTo(n1.x2d, n1.y2d);
    ctx.lineTo(n2.x2d, n2.y2d);
    ctx.stroke();
    ctx.restore();
  });

  // 画节点
  projected.forEach((node, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x2d, node.y2d, 10 * node.scale, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(0,240,255,${0.7 * node.scale + 0.3})`;
    ctx.shadowColor = '#9d00ff';
    ctx.shadowBlur = 10 * node.scale;
    ctx.fill();
    ctx.restore();

    // 节点标签
    ctx.save();
    ctx.font = `${12 * node.scale + 6}px Orbitron, Arial, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.7 * node.scale + 0.3;
    ctx.fillText(node.name, node.x2d, node.y2d + 12 * node.scale);
    ctx.restore();
  });

  if (elements.observerLayers) elements.observerLayers.textContent = N;
  if (elements.entropyRate) elements.entropyRate.textContent = avgEntropy.toFixed(3);
  if (elements.temporalResolution) elements.temporalResolution.textContent = '42 as';
}

// 预算统计
function updateBudget() {
  const totalIncome = budget.incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = budget.expenseRecords.reduce((sum, r) => sum + r.price * r.quantity, 0);
  if (elements.totalAmount) elements.totalAmount.textContent = totalExpense.toFixed(2);
  if (elements.remainingAmount) elements.remainingAmount.textContent = (totalIncome - totalExpense).toFixed(2);
}

// Chart.js 图表渲染
let expenseChart, incomeChart;

function updateCharts() {
  // 支出分类统计
  const expenseData = {};
  budget.expenseRecords.forEach(r => {
    expenseData[r.category] = (expenseData[r.category] || 0) + r.price * r.quantity;
  });
  const expenseCtx = document.getElementById('expenseChart')?.getContext('2d');
  if (expenseCtx) {
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(expenseCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(expenseData),
        datasets: [{
          data: Object.values(expenseData),
          backgroundColor: ['#9d00ff', '#00f0ff', '#6e00ff', '#ff6b6b', '#ffcc00', '#00ff99']
        }]
      }
    });
  }

  // 收入来源统计
  const incomeData = {};
  budget.incomeRecords.forEach(r => {
    incomeData[r.source] = (incomeData[r.source] || 0) + r.amount;
  });
  const incomeCtx = document.getElementById('incomeChart')?.getContext('2d');
  if (incomeCtx) {
    if (incomeChart) incomeChart.destroy();
    incomeChart = new Chart(incomeCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(incomeData),
        datasets: [{
          data: Object.values(incomeData),
          backgroundColor: ['#00f0ff', '#9d00ff', '#ffcc00', '#6e00ff', '#ff6b6b', '#00ff99']
        }]
      }
    });
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
  const container = document.getElementById('recipe-list');
  if (!container) return;
  container.innerHTML = recipes.map(r =>
    `<li>${r.name} ${r.label}</li>`
  ).join('');
}

// 提醒相关
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
  if (elements.upcomingEvents) elements.upcomingEvents.textContent = count;
}

function renderRemindersList() {
  if (!elements.remindersList) return;
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
    budget.reminders.splice(0, budget.reminders.length, ...budget.reminders.filter(r => !(r.date === date && r.text === text)));
    renderRemindersList();
    saveDataToLocalStorage();
  }
});

// 事件监听
if (elements.addIncomeBtn) elements.addIncomeBtn.addEventListener("click", budget.addIncome);
if (elements.addItemBtn) elements.addItemBtn.addEventListener("click", budget.addExpense);
if (elements.clearDataBtn) elements.clearDataBtn.addEventListener("click", clearData);
if (elements.filterBtn) elements.filterBtn.addEventListener("click", filterRecords);
if (elements.predictBtn) elements.predictBtn.addEventListener("click", updatePredictionUI);
if (elements.addReminderBtn) elements.addReminderBtn.addEventListener("click", function() {
  const date = elements.reminderDate.value;
  const text = elements.reminderText.value;
  if (!date || !text) {
    showError("请输入提醒日期和内容");
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
  if (elements.incomeTable) {
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
  }
  // Expense
  if (elements.expenseTable) {
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
}

// 预测功能（Quantum Predict）
function updatePredictionUI() {
  // 取最近30天收入/支出均值，预测下月
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const incomeRecent = budget.incomeRecords.filter(r => new Date(r.date) >= lastMonth);
  const expenseRecent = budget.expenseRecords.filter(r => new Date(r.date) >= lastMonth);

  const avgIncome = incomeRecent.length
    ? incomeRecent.reduce((sum, r) => sum + r.amount, 0) / incomeRecent.length
    : 0;
  const avgExpense = expenseRecent.length
    ? expenseRecent.reduce((sum, r) => sum + r.price * r.quantity, 0) / expenseRecent.length
    : 0;

  const daysNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
  const predictedIncome = avgIncome * daysNextMonth / 30;
  const predictedExpense = avgExpense * daysNextMonth / 30;

  if (elements.predictedIncome) elements.predictedIncome.textContent = `Predicted income for next month: RM ${predictedIncome.toFixed(2)}`;
  if (elements.predictedExpense) elements.predictedExpense.textContent = `Predicted expense for next month: RM ${predictedExpense.toFixed(2)}`;
  if (elements.budgetSuggestion) {
    if (predictedIncome - predictedExpense > 0) {
      elements.budgetSuggestion.textContent = "Your budget is healthy for next month!";
    } else {
      elements.budgetSuggestion.textContent = "Warning: Your predicted expenses exceed income!";
    }
  }
}

// 表单验证增强
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 3000);
}

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

// ========================
// 搜索功能实现（支持食谱、section、隐藏内容，支持回车和按钮）
// ========================
if (elements.searchInput && elements.searchBar) {
  // 显示/隐藏搜索栏
  const searchToggle = document.getElementById('searchToggle');
  if (searchToggle) {
    searchToggle.addEventListener('click', () => {
      elements.searchBar.style.display = elements.searchBar.style.display === 'flex' ? 'none' : 'flex';
      elements.searchInput.focus();
    });
  }

  // 搜索按钮和回车
  const searchBtn = document.getElementById('searchBtn');
  function doSearch() {
    const keyword = elements.searchInput.value.trim().toLowerCase();
    let found = false;

    // 搜索食谱section
    const recipeSection = document.getElementById('recipes');
    if (recipeSection) {
      const recipeTitles = recipeSection.querySelectorAll('h3');
      let matched = false;
      recipeTitles.forEach(h3 => {
        if (h3.textContent.toLowerCase().includes(keyword)) {
          h3.scrollIntoView({ behavior: 'smooth', block: 'center' });
          h3.classList.add('quantum-highlight');
          setTimeout(() => h3.classList.remove('quantum-highlight'), 1500);
          matched = true;
        }
      });
      found = found || matched;
    }

    // 搜索section标题
    document.querySelectorAll('.section h2, .section h3').forEach(el => {
      if (el.textContent.toLowerCase().includes(keyword)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('quantum-highlight');
        setTimeout(() => el.classList.remove('quantum-highlight'), 1500);
        found = true;
      }
    });

    // 搜索隐藏内容
    const hiddenContent = document.querySelector('.hidden-content');
    let hiddenMatched = false;
    document.querySelectorAll('.hidden-content a').forEach(link => {
      if (link.textContent.toLowerCase().includes(keyword)) {
        if (hiddenContent) hiddenContent.style.display = 'block';
        link.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        link.classList.add('quantum-highlight');
        setTimeout(() => {
          link.classList.remove('quantum-highlight');
          if (hiddenContent) hiddenContent.style.display = '';
        }, 2000);
        found = true;
        hiddenMatched = true;
      }
    });

    if (!found) showError('未找到相关内容');
  }
  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  elements.searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doSearch();
  });
}

// ========================
// Quantum Analysis 功能
// ========================
const quantumAnalyzeBtn = document.getElementById('quantum-analyze');
if (quantumAnalyzeBtn) {
  quantumAnalyzeBtn.addEventListener('click', function() {
    throttledRenderQuantumViz();
    // 显示当前量子参数
    const layers = elements.observerLayers?.textContent || '-';
    const entropy = elements.entropyRate?.textContent || '-';
    const resolution = elements.temporalResolution?.textContent || '-';
    alert(
      `Quantum Analysis\n\nObserver Layers: ${layers}\nEntropy Rate: ${entropy}\nTemporal Resolution: ${resolution}`
    );
  });
}

// 依赖注入
budget.injectDependencies({
  saveDataToLocalStorage,
  updateBudget,
  throttledRenderQuantumViz,
  updateCharts,
  showError
});

// 页面加载和窗口变化时渲染
window.addEventListener('load', function() {
  document.body.classList.add('loaded');
  setTimeout(hideLoading, 400); // 优化加载动画，最多显示400ms
  loadDataFromLocalStorage();
  renderRemindersList();
  updateBudget();
  throttledRenderQuantumViz();
  addDataLabelsToMobileTables();
  renderCalendar();
  renderRecipes();
  updateCharts();
  document.querySelectorAll('.welcome-card').forEach((card, i) => {
    setTimeout(() => card.classList.add('visible'), 200 + i * 150);
  });
});

window.addEventListener('resize', function() {
  addDataLabelsToMobileTables();
  throttledRenderQuantumViz();
});