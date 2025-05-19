// 数据与工具函数集中管理
export let incomeRecords = [];
export let expenseRecords = [];
export let reminders = [];

let elements = {};
export function setElements(el) { elements = el; }
export function getElements() { return elements; }

export function safeText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 这些变量和函数由 main.js 在初始化时赋值
export let updateBudget = () => {};
export let saveDataToLocalStorage = () => {};
export let throttledRenderQuantumViz = () => {};
export let updateCharts = () => {};

// 收入相关
export function addIncome() {
  const el = getElements();
  const date = el.incomeDate.value;
  const source = el.incomeSource.value;
  const category = el.incomeCategory.value;
  const amount = parseFloat(el.incomeAmount.value);

  if (!date || !source || isNaN(amount) || amount <= 0) {
    showError("请填写完整收入信息且金额大于0");
    return;
  }

  let found = false;
  incomeRecords.forEach(record => {
    if (record.date === date && record.source === source && record.category === category) {
      record.amount += amount;
      found = true;
    }
  });

  if (!found) {
    incomeRecords.push({
      id: Date.now() + Math.random(),
      date,
      source,
      category,
      amount
    });
  }

  renderIncomeTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
}

export function renderIncomeTable() {
  const el = getElements();
  el.incomeTable.innerHTML = "";
  incomeRecords.forEach(record => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Source">${safeText(record.source)}</td>
      <td data-label="Category">${safeText(record.category)}</td>
      <td data-label="Amount (RM)">${record.amount.toFixed(2)}</td>
      <td data-label="Date">${safeText(record.date)}</td>
      <td data-label="Action"><button class="delete-btn" data-id="${record.id}">Delete</button></td>
    `;
    el.incomeTable.appendChild(tr);
  });
}

export function deleteIncome(id) {
  incomeRecords.splice(0, incomeRecords.length, ...incomeRecords.filter(r => r.id !== id));
  renderIncomeTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
}

// 支出相关
export function addExpense() {
  const el = getElements();
  const date = el.expenseDate.value;
  const name = el.itemName.value;
  const category = el.expenseCategory.value;
  const price = parseFloat(el.itemPrice.value);
  const quantity = parseInt(el.itemQuantity.value);

  // 类别预算限制（示例阈值1000）
  const total = price * quantity;
  const categorySpent = expenseRecords
    .filter(r => r.category === category)
    .reduce((sum, r) => sum + r.price * r.quantity, 0);

  if (categorySpent + total > 1000) {
    showError(`超过${category}类别的预算限制！`);
    return;
  }

  if (!date || !name || isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
    showError("请填写完整支出信息且金额/数量大于0");
    return;
  }

  let found = false;
  expenseRecords.forEach(record => {
    if (record.date === date && record.name === name && record.category === category) {
      record.price += price;
      record.quantity += quantity;
      found = true;
    }
  });

  if (!found) {
    expenseRecords.push({
      id: Date.now() + Math.random(),
      date,
      name,
      category,
      price,
      quantity
    });
  }

  renderExpenseTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
}

export function renderExpenseTable() {
  const el = getElements();
  el.expenseTable.innerHTML = "";
  expenseRecords.forEach(record => {
    const total = record.price * record.quantity;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Item Name">${safeText(record.name)}</td>
      <td data-label="Category">${safeText(record.category)}</td>
      <td data-label="Price (RM)">${record.price.toFixed(2)}</td>
      <td data-label="Quantity">${record.quantity}</td>
      <td data-label="Total (RM)">${total.toFixed(2)}</td>
      <td data-label="Date">${safeText(record.date)}</td>
      <td data-label="Action"><button class="delete-btn" data-id="${record.id}">Delete</button></td>
    `;
    el.expenseTable.appendChild(tr);
  });
}

export function deleteExpense(id) {
  expenseRecords.splice(0, expenseRecords.length, ...expenseRecords.filter(r => r.id !== id));
  renderExpenseTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
}

// 通用错误提示
export function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 3000);
}