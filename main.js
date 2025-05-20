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
  if (elements.loadingOverlay) elements.loadingOverlay.style.display = 'none';
}

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

// 图表（如有）
function updateCharts() {
  // 你的图表更新逻辑
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

// 预测功能（如有）
function updatePredictionUI() {
  // 你的预测逻辑
}

// 表单验证增强
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 3000);
}

// 页面加载和窗口变化时渲染
window.addEventListener('load', function() {
  document.body.classList.add('loaded');
  loadDataFromLocalStorage();
  renderRemindersList();
  updateBudget();
  throttledRenderQuantumViz();
  addDataLabelsToMobileTables();
});

window.addEventListener('resize', function() {
  addDataLabelsToMobileTables();
  throttledRenderQuantumViz();
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

// 依赖注入
budget.injectDependencies({
  saveDataToLocalStorage,
  updateBudget,
  throttledRenderQuantumViz,
  updateCharts,
  showError
});