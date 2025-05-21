import * as budget from "./budget.js";

// Service Worker 注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch((err) => {
    console.error('Service Worker 注册失败:', err);
  });
}

// 错误显示函数
function showError(msg) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = msg;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
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
  currentMonthYear: document.getElementById("current-month-year"),
  calendarDays: document.getElementById("calendar-days"),
  prevMonthBtn: document.getElementById("prev-month"),
  nextMonthBtn: document.getElementById("next-month"),
  quantumAnalyzeBtn: document.getElementById("quantum-analyze"),
  dreamModeBtn: document.getElementById("dreamMode"),
  searchToggle: document.getElementById("searchToggle")
};

// 设置预算模块的元素引用
if (typeof budget !== "undefined" && budget.setElements) {
  budget.setElements(elements);
}

// ========================
// 工具函数
// ========================

// 节流函数
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 显示/隐藏加载动画
function showLoading() {
  elements.loadingOverlay && (elements.loadingOverlay.style.display = "flex");
}
function hideLoading() {
  elements.loadingOverlay && (elements.loadingOverlay.style.display = "none");
}

// 日期格式化
function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString();
}

function formatDateForInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ========================
// 本地存储管理
// ========================

function saveDataToLocalStorage() {
  try {
    const data = {
      incomeRecords: budget.incomeRecords,
      expenseRecords: budget.expenseRecords,
      reminders: budget.reminders,
      version: 2,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("nenwaData", JSON.stringify(data));
  } catch (e) {
    showError("保存数据失败: " + e.message);
  }
}

function loadDataFromLocalStorage() {
  try {
    const data = JSON.parse(localStorage.getItem("nenwaData"));
    if (data && data.version === 2) {
      budget.incomeRecords = data.incomeRecords || [];
      budget.expenseRecords = data.expenseRecords || [];
      budget.reminders = data.reminders || [];
    } else {
      // 兼容旧版数据格式
      budget.incomeRecords = JSON.parse(localStorage.getItem("incomeRecords")) || [];
      budget.expenseRecords = JSON.parse(localStorage.getItem("expenseRecords")) || [];
      budget.reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    }
  } catch (e) {
    console.warn("加载本地数据失败:", e);
  }
}

// ========================
// 日历功能
// ========================

let calendarYear, calendarMonth;

function renderCalendar() {
  const today = new Date();
  if (calendarYear === undefined) calendarYear = today.getFullYear();
  if (calendarMonth === undefined) calendarMonth = today.getMonth();

  const year = calendarYear;
  const month = calendarMonth;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (elements.currentMonthYear) {
    elements.currentMonthYear.textContent = `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  if (elements.calendarDays) {
    let html = '';
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="prev-date"></div>`;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = formatDateForInput(date);
      
      // 检查当天是否有事件
      const hasEvent = 
        budget.reminders.some(r => r.date === dateStr) ||
        budget.incomeRecords.some(r => r.date === dateStr) ||
        budget.expenseRecords.some(r => r.date === dateStr);
      
      const isToday = 
        d === today.getDate() && 
        month === today.getMonth() && 
        year === today.getFullYear();
      
      const classes = [
        isToday ? 'today' : '',
        hasEvent ? 'has-event' : ''
      ].filter(Boolean).join(' ');
      
      html += `<div class="calendar-day ${classes}" data-date="${dateStr}">${d}</div>`;
    }
    
    elements.calendarDays.innerHTML = html;
  }
}

function setupCalendarEvents() {
  // 月份切换
  if (elements.prevMonthBtn) {
    elements.prevMonthBtn.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
      }
      renderCalendar();
    });
  }

  if (elements.nextMonthBtn) {
    elements.nextMonthBtn.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderCalendar();
    });
  }

  // 日期点击
  if (elements.calendarDays) {
    elements.calendarDays.addEventListener('click', (e) => {
      const dayElement = e.target.closest('.calendar-day');
      if (dayElement) {
        const dateStr = dayElement.dataset.date;
        if (dateStr) {
          showDateDetails(dateStr);
        }
      }
    });
  }
}

function showDateDetails(dateStr) {
  const modal = document.getElementById('calendar-modal-container');
  if (!modal) return;
  
  const date = new Date(dateStr);
  document.getElementById('modal-date-title').textContent = date.toLocaleDateString();
  
  // 填充提醒
  const remindersList = modal.querySelector('.reminders-list-modal');
  remindersList.innerHTML = budget.reminders
    .filter(r => r.date === dateStr)
    .map(r => `<li>${budget.safeText(r.text)}</li>`)
    .join('') || '<li>没有提醒</li>';
  
  // 填充收入
  const incomeList = modal.querySelector('.income-list-modal');
  incomeList.innerHTML = budget.incomeRecords
    .filter(r => r.date === dateStr)
    .map(r => `<li>${budget.safeText(r.source)}: RM${r.amount.toFixed(2)}</li>`)
    .join('') || '<li>没有收入记录</li>';
  
  // 填充支出
  const expenseList = modal.querySelector('.expense-list-modal');
  expenseList.innerHTML = budget.expenseRecords
    .filter(r => r.date === dateStr)
    .map(r => `<li>${budget.safeText(r.name)}: RM${(r.price * r.quantity).toFixed(2)}</li>`)
    .join('') || '<li>没有支出记录</li>';
  
  // 显示弹窗
  modal.style.display = 'block';
  
  // 关闭按钮事件
  modal.querySelector('.close-modal').onclick = () => {
    modal.style.display = 'none';
  };
  
  // 添加提醒按钮
  modal.querySelector('.add-reminder-from-modal').onclick = () => {
    const text = prompt("请输入提醒内容:");
    if (text) {
      budget.reminders.push({
        id: Date.now() + Math.random(),
        date: dateStr,
        text: text.trim()
      });
      renderRemindersList();
      saveDataToLocalStorage();
      renderCalendar(); // 更新日历显示
    }
  };
}

// ========================
// 量子可视化
// ========================

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
  if (!quantumWorker) return;
  quantumWorker.postMessage({
    incomeCount: budget.incomeRecords.length,
    expenseCount: budget.expenseRecords.length
  });
}

function renderQuantumVizFromWorker(nodes, edges, avgEntropy, N) {
  const container = elements.quantumViz;
  if (!container) return;
  
  container.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.width = container.offsetWidth || 600;
  canvas.height = container.offsetHeight || 260;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // 3D->2D投影
  const projected = nodes.map(node => {
    const scale = 90;
    const x2d = canvas.width / 2 + node.x * scale * 1.2;
    const y2d = canvas.height / 2 + node.y * scale * 0.8;
    return { ...node, x2d, y2d };
  });

  // 绘制连线
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

  // 更新UI指标
  if (elements.observerLayers) elements.observerLayers.textContent = N;
  if (elements.entropyRate) elements.entropyRate.textContent = avgEntropy.toFixed(3);
  if (elements.temporalResolution) {
    elements.temporalResolution.textContent = TEMPORAL_RESOLUTION.toExponential(2);
  }
}

// ========================
// 预算统计与图表
// ========================

let expenseChart, incomeChart;

function updateBudget() {
  const totalIncome = budget.incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = budget.expenseRecords.reduce((sum, r) => sum + r.price * r.quantity, 0);
  
  if (elements.totalAmount) elements.totalAmount.textContent = totalExpense.toFixed(2);
  if (elements.remainingAmount) elements.remainingAmount.textContent = (totalIncome - totalExpense).toFixed(2);
  
  // 熵驱动预算预警
  const entropy = calculateEntropy(budget.expenseRecords);
  const mean = totalExpense / (budget.expenseRecords.length || 1);
  const noiseVariance = budget.expenseRecords.reduce((sum, r) => {
    const v = r.price * r.quantity;
    return sum + Math.pow(v - mean, 2);
  }, 0) / ((budget.expenseRecords.length || 1));
  
  const criticalThreshold = 2 * Math.sqrt(Math.pow(ω0, 2) - noiseVariance);
  if (entropy > criticalThreshold) {
    showError("量子熵超限！建议调整消费分布");
  }
}

function calculateEntropy(records) {
  const total = records.reduce((sum, r) => sum + (r.price ? r.price * r.quantity : r.amount), 0);
  if (!total) return 0;
  return -records.reduce((sum, r) => {
    const value = r.price ? r.price * r.quantity : r.amount;
    const p = value / total;
    return p > 0 ? sum + p * Math.log(p) : sum;
  }, 0);
}

function updateCharts() {
  // 支出分类
  const expenseCategories = {};
  budget.expenseRecords.forEach(r => {
    expenseCategories[r.category] = (expenseCategories[r.category] || 0) + r.price * r.quantity;
  });
  
  // 收入来源
  const incomeSources = {};
  budget.incomeRecords.forEach(r => {
    incomeSources[r.source] = (incomeSources[r.source] || 0) + r.amount;
  });

  // 更新支出图表
  const expenseCtx = document.getElementById("expenseChart")?.getContext("2d");
  if (expenseCtx) {
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(expenseCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(expenseCategories),
        datasets: [{
          data: Object.values(expenseCategories),
          backgroundColor: ["#9d00ff", "#00f0ff", "#6e00ff", "#ffcc00", "#ff6b6b", "#00ff99"],
        }]
      },
      options: { 
        plugins: { 
          legend: { 
            labels: { 
              color: "#fff",
              font: {
                family: "'Exo 2', sans-serif"
              }
            } 
          } 
        } 
      }
    });
  }

  // 更新收入图表
  const incomeCtx = document.getElementById("incomeChart")?.getContext("2d");
  if (incomeCtx) {
    if (incomeChart) incomeChart.destroy();
    incomeChart = new Chart(incomeCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(incomeSources),
        datasets: [{
          data: Object.values(incomeSources),
          backgroundColor: ["#00f0ff", "#9d00ff", "#ffcc00", "#6e00ff", "#00ff99"],
        }]
      },
      options: { 
        plugins: { 
          legend: { 
            labels: { 
              color: "#fff",
              font: {
                family: "'Exo 2', sans-serif"
              }
            } 
          } 
        } 
      }
    });
  }
}

// ========================
// 预测系统
// ========================

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
  
  if (elements.predictedIncome) {
    elements.predictedIncome.textContent = `预测下月收入: RM ${predictedIncome.toFixed(2)}`;
  }
  
  if (elements.predictedExpense) {
    elements.predictedExpense.textContent = `预测下月支出: RM ${predictedExpense.toFixed(2)}`;
  }
  
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

// ========================
// 提醒功能
// ========================

function updateRemindersCount() {
  if (elements.upcomingEvents) {
    elements.upcomingEvents.textContent = budget.reminders.length;
  }
}

function renderRemindersList() {
  const list = elements.remindersList;
  if (!list) return;
  
  list.innerHTML = budget.reminders
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(rem => {
      const isPast = new Date(rem.date) < new Date();
      return `
        <div class="reminder-item ${isPast ? 'past' : ''}">
          <span class="reminder-date">${formatDate(rem.date)}</span>
          <span class="reminder-text">${budget.safeText(rem.text)}</span>
          <button class="delete-reminder" data-id="${rem.id}">×</button>
        </div>
      `;
    })
    .join('');
  
  updateRemindersCount();
}

// ========================
// 事件监听
// ========================

function setupEventListeners() {
  // 收入支出按钮
  elements.addIncomeBtn?.addEventListener("click", budget.addIncome);
  elements.addItemBtn?.addEventListener("click", budget.addExpense);
  
  // 清除数据按钮
  elements.clearDataBtn?.addEventListener("click", () => {
    if (confirm("确定要清空所有数据吗？")) {
      budget.incomeRecords = [];
      budget.expenseRecords = [];
      budget.reminders = [];
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
  
  // 预测按钮
  elements.predictBtn?.addEventListener("click", updatePredictionUI);
  
  // 添加提醒
  elements.addReminderBtn?.addEventListener("click", () => {
    const date = elements.reminderDate.value;
    const text = elements.reminderText.value;
    if (!date || !text) return;
    
    budget.reminders.push({ 
      id: Date.now() + Math.random(), 
      date, 
      text: text.trim() 
    });
    
    renderRemindersList();
    saveDataToLocalStorage();
    renderCalendar(); // 更新日历显示
    
    elements.reminderDate.value = "";
    elements.reminderText.value = "";
  });
  
  // 搜索功能
  elements.searchToggle?.addEventListener("click", () => {
    elements.searchBar.style.display = elements.searchBar.style.display === "flex" ? "none" : "flex";
  });
  
  elements.searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchAll(e.target.value.trim());
    }
  });
  
  elements.searchBtn?.addEventListener("click", () => {
    searchAll(elements.searchInput?.value.trim());
  });
  
  // 回到顶部
  elements.backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  // 量子分析
  elements.quantumAnalyzeBtn?.addEventListener("click", throttledRenderQuantumViz);
  
  // 梦境模式
  elements.dreamModeBtn?.addEventListener("click", () => {
    document.body.classList.toggle('dream-state');
    
    // 添加粒子效果
    if (document.body.classList.contains('dream-state')) {
      createDreamParticles();
    }
  });
  
  // 删除提醒事件委托
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains("delete-reminder")) {
      const id = e.target.getAttribute("data-id");
      budget.reminders = budget.reminders.filter(r => r.id !== id);
      renderRemindersList();
      saveDataToLocalStorage();
      renderCalendar(); // 更新日历显示
    }
  });
}

// 梦境模式粒子效果
function createDreamParticles() {
  const colors = ['#9d00ff', '#00f0ff', '#6e00ff', '#ffcc00'];
  
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'dream-particle';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.width = `${Math.random() * 5 + 2}px`;
    particle.style.height = particle.style.width;
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `${Math.random() * 100}vh`;
    particle.style.animationDuration = `${Math.random() * 20 + 10}s`;
    particle.style.animationDelay = `${Math.random() * 5}s`;
    document.body.appendChild(particle);
    
    // 移除动画结束的粒子
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
  }
}

// ========================
// 搜索功能
// ========================

function searchAll(query) {
  query = query.trim().toLowerCase();
  if (!query) {
    document.querySelectorAll('.quantum-highlight').forEach(el => {
      el.classList.remove('quantum-highlight');
    });
    return;
  }

  let firstMatch = null;

  // 搜索范围：卡片、区域、食谱
  const searchables = [
    ...document.querySelectorAll('.welcome-card, .section, #recipes h3')
  ];

  searchables.forEach(item => {
    item.classList.remove('quantum-highlight');
    if (item.textContent.toLowerCase().includes(query)) {
      if (!firstMatch) firstMatch = item;
      item.classList.add('quantum-highlight');
    }
  });

  // 滚动到第一个匹配项
  if (firstMatch) {
    const header = document.getElementById('poetry-header');
    const headerHeight = header ? header.offsetHeight : 0;
    const rect = firstMatch.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetY = rect.top + scrollTop - headerHeight - 10;
    
    setTimeout(() => {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }, 200);
  }
}

// ========================
// 初始化
// ========================

function init() {
  // 依赖注入
  budget.injectDependencies({
    saveDataToLocalStorage,
    updateBudget,
    throttledRenderQuantumViz,
    updateCharts,
    updatePredictionUI,
    showError
  });
  
  // 加载数据
  loadDataFromLocalStorage();
  
  // 初始化UI
  budget.renderIncomeTable();
  budget.renderExpenseTable();
  renderRemindersList();
  updateBudget();
  updateCharts();
  renderCalendar();
  setupCalendarEvents();
  
  // 初始化事件
  setupEventListeners();
  budget.initDeleteHandlers();
  
  // 初始量子可视化
  throttledRenderQuantumViz();
  updatePredictionUI();
  
  // 显示欢迎卡片
  setTimeout(() => {
    document.querySelectorAll('.welcome-card').forEach(card => {
      card.classList.add('visible');
    });
    document.body.classList.add("loaded");
    hideLoading();
  }, 100);
}

// 启动应用
window.addEventListener("DOMContentLoaded", init);