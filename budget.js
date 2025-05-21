// Data and utility functions management
export let incomeRecords = [];
export let expenseRecords = [];
export let reminders = [];

let elements = {};
export function setElements(el) { elements = el; }
export function getElements() { return elements; }

// Enhanced safe text processing (XSS prevention)
export function safeText(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Dependency injection
let saveDataToLocalStorage = () => {};
let updateBudget = () => {};
let throttledRenderQuantumViz = () => {};
let updateCharts = () => {};
let updatePredictionUI = () => {};
let showError = (msg) => { console.error(msg); };

export function injectDependencies(deps) {
  if (deps.saveDataToLocalStorage) saveDataToLocalStorage = deps.saveDataToLocalStorage;
  if (deps.updateBudget) updateBudget = deps.updateBudget;
  if (deps.throttledRenderQuantumViz) throttledRenderQuantumViz = deps.throttledRenderQuantumViz;
  if (deps.updateCharts) updateCharts = deps.updateCharts;
  if (deps.updatePredictionUI) updatePredictionUI = deps.updatePredictionUI;
  if (deps.showError) showError = deps.showError;
}

// Data validation function with improved error messages
function validateRecord(record, type) {
  const errors = [];
  
  if (!record.date) {
    errors.push("Date is required");
  } else if (isNaN(new Date(record.date).getTime())) {
    errors.push("Invalid date format");
  }

  if (type === 'income') {
    if (!record.source || record.source.trim().length < 2) {
      errors.push("Income source requires at least 2 characters");
    }
    if (isNaN(record.amount)) {
      errors.push("Amount must be a number");
    } else if (record.amount <= 0) {
      errors.push("Amount must be greater than 0");
    } else if (record.amount > 1000000) {
      errors.push("Amount exceeds maximum limit");
    }
  } 
  else if (type === 'expense') {
    if (!record.name || record.name.trim().length < 2) {
      errors.push("Item name requires at least 2 characters");
    }
    if (isNaN(record.price)) {
      errors.push("Price must be a number");
    } else if (record.price <= 0) {
      errors.push("Price must be greater than 0");
    }
    if (isNaN(record.quantity)) {
      errors.push("Quantity must be a number");
    } else if (record.quantity <= 0) {
      errors.push("Quantity must be greater than 0");
    } else if (!Number.isInteger(record.quantity)) {
      errors.push("Quantity must be a whole number");
    }
  }
  
  return errors;
}

// Generic UI update function
function updateUI() {
  renderIncomeTable();
  renderExpenseTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
  updatePredictionUI();
}

// Income operations with improved validation
export function addIncome() {
  const el = getElements();
  if (!el) {
    showError("System error: UI elements not loaded");
    return;
  }

  const record = {
    id: Date.now() + Math.random(),
    date: el.incomeDate.value,
    source: el.incomeSource.value.trim(),
    category: el.incomeCategory.value,
    amount: parseFloat(el.incomeAmount.value)
  };

  const errors = validateRecord(record, 'income');
  if (errors.length > 0) {
    showError(errors.join("\n"));
    return;
  }

  // Check for existing record with same details
  const existingIndex = incomeRecords.findIndex(r => 
    r.date === record.date && 
    r.source === record.source && 
    r.category === record.category
  );

  if (existingIndex >= 0) {
    incomeRecords[existingIndex].amount += record.amount;
  } else {
    incomeRecords.push(record);
  }

  updateUI();
  
  // Reset form
  el.incomeDate.value = "";
  el.incomeSource.value = "";
  el.incomeAmount.value = "";
}

// Expense operations with improved validation
export function addExpense() {
  const el = getElements();
  if (!el) {
    showError("System error: UI elements not loaded");
    return;
  }

  const record = {
    id: Date.now() + Math.random(),
    date: el.expenseDate.value,
    name: el.itemName.value.trim(),
    category: el.expenseCategory.value,
    price: parseFloat(el.itemPrice.value),
    quantity: parseInt(el.itemQuantity.value)
  };

  const errors = validateRecord(record, 'expense');
  if (errors.length > 0) {
    showError(errors.join("\n"));
    return;
  }

  // Check category budget limit
  const categoryTotal = expenseRecords
    .filter(r => r.category === record.category)
    .reduce((sum, r) => sum + r.price * r.quantity, 0);
  
  if (categoryTotal + (record.price * record.quantity) > 1000) {
    showError(`Category spending limit exceeded (RM1000)`);
    return;
  }

  // Check for existing record with same details
  const existingIndex = expenseRecords.findIndex(r => 
    r.date === record.date && 
    r.name === record.name && 
    r.category === record.category
  );

  if (existingIndex >= 0) {
    expenseRecords[existingIndex].quantity += record.quantity;
  } else {
    expenseRecords.push(record);
  }

  updateUI();
  
  // Reset form
  el.expenseDate.value = "";
  el.itemName.value = "";
  el.itemPrice.value = "";
  el.itemQuantity.value = "1";
}

// Table rendering functions with improved accessibility
export function renderIncomeTable() {
  const el = getElements().incomeTable;
  if (!el) return;
  
  el.innerHTML = incomeRecords.map(record => `
    <tr>
      <td data-label="Source">${safeText(record.source)}</td>
      <td data-label="Category">${safeText(record.category)}</td>
      <td data-label="Amount">RM${record.amount.toFixed(2)}</td>
      <td data-label="Date">${safeText(record.date)}</td>
      <td data-label="Actions">
        <button class="delete-btn" data-id="${record.id}" data-type="income" aria-label="Delete income record">Delete</button>
      </td>
    </tr>
  `).join('');
}

export function renderExpenseTable() {
  const el = getElements().expenseTable;
  if (!el) return;
  
  el.innerHTML = expenseRecords.map(record => `
    <tr>
      <td data-label="Item">${safeText(record.name)}</td>
      <td data-label="Category">${safeText(record.category)}</td>
      <td data-label="Price">RM${record.price.toFixed(2)}</td>
      <td data-label="Quantity">${record.quantity}</td>
      <td data-label="Total">RM${(record.price * record.quantity).toFixed(2)}</td>
      <td data-label="Date">${safeText(record.date)}</td>
      <td data-label="Actions">
        <button class="delete-btn" data-id="${record.id}" data-type="expense" aria-label="Delete expense record">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Delete record function with improved error handling
export function deleteRecord(id, type) {
  try {
    if (type === 'income') {
      incomeRecords = incomeRecords.filter(r => r.id !== id);
    } else if (type === 'expense') {
      expenseRecords = expenseRecords.filter(r => r.id !== id);
    } else {
      throw new Error("Invalid record type");
    }
    
    updateUI();
  } catch (error) {
    showError("Failed to delete record: " + error.message);
  }
}

// Initialize delete handlers with improved event delegation
export function initDeleteHandlers() {
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const type = deleteBtn.dataset.type;
      if (id && type && confirm('Are you sure you want to delete this record?')) {
        deleteRecord(id, type);
      }
    }
  });
}

// Load data from localStorage with version checking
export function loadDataFromLocalStorage() {
  try {
    const data = JSON.parse(localStorage.getItem("nenwaData"));
    if (data) {
      if (data.version === 2) {
        incomeRecords = data.incomeRecords || [];
        expenseRecords = data.expenseRecords || [];
        reminders = data.reminders || [];
      } else {
        // Handle legacy data format if needed
        incomeRecords = data.incomeRecords || [];
        expenseRecords = data.expenseRecords || [];
        reminders = data.reminders || [];
      }
    }
  } catch (e) {
    console.error("Failed to load data:", e);
    showError("Failed to load saved data");
  }
}

// Compatibility functions (optional)
export function deleteIncome(id) {
  deleteRecord(id, 'income');
}

export function deleteExpense(id) {
  deleteRecord(id, 'expense');
}