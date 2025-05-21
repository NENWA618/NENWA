import * as budget from "./budget.js";

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch((err) => {
    console.error('Service Worker registration failed:', err);
  });
}

// Error display function
function showError(msg) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = msg;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Quantum constants
const tP = 5.39e-44;
const hbar = 1.0545718e-34;
const kB = 1.380649e-23;
const TEMPORAL_RESOLUTION = 42e-18;
let λL = 0.5;
const ω0 = 0.1;
const D = 0.01;

// Cache commonly used DOM elements
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

// Set element references for budget module
if (typeof budget !== "undefined" && budget.setElements) {
  budget.setElements(elements);
}

// ========================
// Utility Functions
// ========================

// Throttle function
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

// Show/hide loading animation
function showLoading() {
  elements.loadingOverlay && (elements.loadingOverlay.style.display = "flex");
}
function hideLoading() {
  elements.loadingOverlay && (elements.loadingOverlay.style.display = "none");
}

// Date formatting
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
// Local Storage Management
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
    showError("Failed to save data: " + e.message);
  }
}

function loadDataFromLocalStorage() {
  try {
    const data = JSON.parse(localStorage.getItem("nenwaData"));
    if (data && data.version === 2) {
      budget.incomeRecords.splice(0, budget.incomeRecords.length, ...(data.incomeRecords || []));
      budget.expenseRecords.splice(0, budget.expenseRecords.length, ...(data.expenseRecords || []));
      budget.reminders.splice(0, budget.reminders.length, ...(data.reminders || []));
    } else {
      budget.incomeRecords.splice(0, budget.incomeRecords.length, ...((JSON.parse(localStorage.getItem("incomeRecords")) || [])));
      budget.expenseRecords.splice(0, budget.expenseRecords.length, ...((JSON.parse(localStorage.getItem("expenseRecords")) || [])));
      budget.reminders.splice(0, budget.reminders.length, ...((JSON.parse(localStorage.getItem("reminders")) || [])));
    }
  } catch (e) {
    console.warn("Failed to load local data:", e);
  }
}

// ========================
// Calendar Functions
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
      
      // Check for events on this day
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
  // Month navigation
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

  // Date click
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
  
  // Populate reminders
  const remindersList = modal.querySelector('.reminders-list-modal');
  remindersList.innerHTML = budget.reminders
    .filter(r => r.date === dateStr)
    .map(r => `<li>${budget.safeText(r.text)}</li>`)
    .join('') || '<li>No reminders</li>';
  
  // Populate income
  const incomeList = modal.querySelector('.income-list-modal');
  incomeList.innerHTML = budget.incomeRecords
    .filter(r => r.date === dateStr)
    .map(r => `<li>${budget.safeText(r.source)}: RM${r.amount.toFixed(2)}</li>`)
    .join('') || '<li>No income records</li>';
  
  // Populate expenses
  const expenseList = modal.querySelector('.expense-list-modal');
  expenseList.innerHTML = budget.expenseRecords
    .filter(r => r.date === dateStr)
    .map(r => `<li>${budget.safeText(r.name)}: RM${(r.price * r.quantity).toFixed(2)}</li>`)
    .join('') || '<li>No expense records</li>';
  
  // Show modal
  modal.style.display = 'block';
  
  // Close button event
  modal.querySelector('.close-modal').onclick = () => {
    modal.style.display = 'none';
  };
  
  // Add reminder button
  modal.querySelector('.add-reminder-from-modal').onclick = () => {
    const text = prompt("Enter reminder text:");
    if (text) {
      budget.reminders.push({
        id: Date.now() + Math.random(),
        date: dateStr,
        text: text.trim()
      });
      renderRemindersList();
      saveDataToLocalStorage();
      renderCalendar(); // Update calendar display
    }
  };
}

// ========================
// Quantum Visualization
// ========================

let quantumWorker;
if (window.Worker) {
  quantumWorker = new Worker('quantum-worker.js');
  quantumWorker.onmessage = function(e) {
    const { nodes, edges, metrics } = e.data;
    renderQuantumVizFromWorker(nodes, edges, metrics?.entropy, metrics?.nodeCount);
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

  // 3D to 2D projection
  const projected = nodes.map(node => {
    const scale = 90;
    const x2d = canvas.width / 2 + node.x * scale * 1.2;
    const y2d = canvas.height / 2 + node.y * scale * 0.8;
    return { ...node, x2d, y2d };
  });

  // Draw connections
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

  // Draw nodes
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

  // Update UI metrics
  if (elements.observerLayers) elements.observerLayers.textContent = N;
  if (elements.entropyRate) elements.entropyRate.textContent = avgEntropy.toFixed(3);
  if (elements.temporalResolution) {
    elements.temporalResolution.textContent = TEMPORAL_RESOLUTION.toExponential(2);
  }
}

// ========================
// Budget Statistics and Charts
// ========================

let expenseChart, incomeChart;

function updateBudget() {
  const totalIncome = budget.incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = budget.expenseRecords.reduce((sum, r) => sum + r.price * r.quantity, 0);
  
  if (elements.totalAmount) elements.totalAmount.textContent = totalExpense.toFixed(2);
  if (elements.remainingAmount) elements.remainingAmount.textContent = (totalIncome - totalExpense).toFixed(2);
  
  // Entropy-based budget warning
  const entropy = calculateEntropy(budget.expenseRecords);
  const mean = totalExpense / (budget.expenseRecords.length || 1);
  const noiseVariance = budget.expenseRecords.reduce((sum, r) => {
    const v = r.price * r.quantity;
    return sum + Math.pow(v - mean, 2);
  }, 0) / ((budget.expenseRecords.length || 1));
  
  const criticalThreshold = 2 * Math.sqrt(Math.pow(ω0, 2) - noiseVariance);
  if (entropy > criticalThreshold) {
    showError("Quantum entropy exceeded! Adjust spending distribution");
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
  // Expense categories
  const expenseCategories = {};
  budget.expenseRecords.forEach(r => {
    expenseCategories[r.category] = (expenseCategories[r.category] || 0) + r.price * r.quantity;
  });
  
  // Income sources
  const incomeSources = {};
  budget.incomeRecords.forEach(r => {
    incomeSources[r.source] = (incomeSources[r.source] || 0) + r.amount;
  });

  // Update expense chart
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

  // Update income chart
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
// Prediction System
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
    elements.predictedIncome.textContent = `Next month predicted income: RM ${predictedIncome.toFixed(2)}`;
  }
  
  if (elements.predictedExpense) {
    elements.predictedExpense.textContent = `Next month predicted expense: RM ${predictedExpense.toFixed(2)}`;
  }
  
  if (elements.budgetSuggestion) {
    if (predictedIncome - predictedExpense < 0) {
      elements.budgetSuggestion.textContent = "⚠️ Budget deficit risk, adjust spending";
      elements.budgetSuggestion.classList.add("quantum-critical");
    } else {
      elements.budgetSuggestion.textContent = "Budget healthy, keep it up!";
      elements.budgetSuggestion.classList.remove("quantum-critical");
    }
  }
}

// ========================
// Reminder Functions
// ========================

function updateRemindersCount() {
  if (elements.upcomingEvents) {
    elements.upcomingEvents.textContent = budget.reminders.length;
  }
}

function renderRemindersList() {
  const list = elements.remindersList;
  if (!list) return;
  
  const now = new Date();
  list.innerHTML = budget.reminders
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(rem => {
      const remDate = new Date(rem.date);
      const isPast = remDate < now;
      const daysDiff = Math.floor((remDate - now) / (1000 * 60 * 60 * 24));
      
      let statusText = '';
      if (isPast) {
        statusText = 'Expired';
      } else if (daysDiff === 0) {
        statusText = 'Due Today';
      } else if (daysDiff === 1) {
        statusText = 'Due Tomorrow';
      } else {
        statusText = `Due in ${daysDiff} days`;
      }
      
      return `
        <div class="reminder-item ${isPast ? 'past' : ''}">
          <div class="reminder-header">
            <span class="reminder-date">${formatDate(rem.date)}</span>
            <span class="reminder-status">${statusText}</span>
          </div>
          <div class="reminder-text">${budget.safeText(rem.text)}</div>
          <button class="delete-reminder" data-id="${rem.id}">×</button>
        </div>
      `;
    }).join('');
  
  updateRemindersCount();
}

// ========================
// Event Listeners
// ========================

function setupEventListeners() {
  // Income/expense buttons
  elements.addIncomeBtn?.addEventListener("click", budget.addIncome);
  elements.addItemBtn?.addEventListener("click", budget.addExpense);
  
  // Clear data button
  elements.clearDataBtn?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all data?")) {
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
  
  // Prediction button
  elements.predictBtn?.addEventListener("click", updatePredictionUI);
  
  // Add reminder
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
    renderCalendar(); // Update calendar display
    
    elements.reminderDate.value = "";
    elements.reminderText.value = "";
  });
  
  // Search functionality
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
  
  // Back to top
  elements.backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  // Quantum analysis
  elements.quantumAnalyzeBtn?.addEventListener("click", throttledRenderQuantumViz);
  
  // Dream mode
  elements.dreamModeBtn?.addEventListener("click", () => {
    document.body.classList.toggle('dream-state');
    
    // Add particle effects
    if (document.body.classList.contains('dream-state')) {
      createDreamParticles();
    }
  });
}

// Dream mode particle effects
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
    
    // Remove particles when animation ends
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
  }
}

// ========================
// Search Functionality
// ========================

function searchAll(query) {
  query = query.trim().toLowerCase();
  const allHighlights = document.querySelectorAll('.quantum-highlight');
  
  // Reset all highlights
  allHighlights.forEach(el => {
    el.classList.remove('quantum-highlight');
    if(el.classList.contains('hidden-content')) {
      el.classList.remove('visible');
    }
  });

  if (!query) return;

  // Expanded search scope (including hidden content)
  const searchTargets = [
    ...document.querySelectorAll('.welcome-card, .section, #recipes h3, .hidden-content h3')
  ];

  let firstMatch = null;
  
  searchTargets.forEach(item => {
    if (item.textContent.toLowerCase().includes(query)) {
      item.classList.add('quantum-highlight');
      
      // If it's hidden content, show the entire container
      const hiddenContent = item.closest('.hidden-content');
      if (hiddenContent) {
        hiddenContent.classList.add('visible');
        if (!firstMatch) firstMatch = hiddenContent;
      } else if (!firstMatch) {
        firstMatch = item;
      }
    }
  });

  // Scroll to first match
  if (firstMatch) {
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ========================
// Initialization
// ========================

function init() {
  // Dependency injection
  budget.injectDependencies({
    saveDataToLocalStorage,
    updateBudget,
    throttledRenderQuantumViz,
    updateCharts,
    updatePredictionUI,
    showError
  });
  
  // Load data
  loadDataFromLocalStorage();
  
  // Initialize UI
  budget.renderIncomeTable();
  budget.renderExpenseTable();
  renderRemindersList();
  updateBudget();
  updateCharts();
  renderCalendar();
  setupCalendarEvents();
  
  // Initialize event listeners
  setupEventListeners();
  budget.initDeleteHandlers();
  
  // Initial quantum visualization
  throttledRenderQuantumViz();
  updatePredictionUI();
  
  // Show welcome cards
  setTimeout(() => {
    document.querySelectorAll('.welcome-card').forEach(card => {
      card.classList.add('visible');
    });
    document.body.classList.add("loaded");
    hideLoading();
  }, 100);
}

// Launch the app
window.addEventListener("DOMContentLoaded", init);