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

// 依赖注入
let saveDataToLocalStorage = () => {};
let updateBudget = () => {};
let throttledRenderQuantumViz = () => {};
let updateCharts = () => {};
let showError = (msg) => { alert(msg); }; // 默认实现

export function injectDependencies(deps) {
  if (deps.saveDataToLocalStorage) saveDataToLocalStorage = deps.saveDataToLocalStorage;
  if (deps.updateBudget) updateBudget = deps.updateBudget;
  if (deps.throttledRenderQuantumViz) throttledRenderQuantumViz = deps.throttledRenderQuantumViz;
  if (deps.updateCharts) updateCharts = deps.updateCharts;
  if (deps.showError) showError = deps.showError;
}

// 收入相关
export function addIncome() {
  const el = getElements();
  const date = el.incomeDate.value;
  const source = el.incomeSource.value;
  const category = el.incomeCategory.value;
  const amount = parseFloat(el.incomeAmount.value);

  if (!date || !source || isNaN(amount) || amount <= 0) {
    showError("请输入有效的收入信息");
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

  el.incomeDate.value = "";
  el.incomeSource.value = "";
  el.incomeAmount.value = "";
}

export function renderIncomeTable() {
  const el = getElements();
  if (!el.incomeTable) return;
  el.incomeTable.innerHTML = "";
  incomeRecords.forEach(record => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safeText(record.source)}</td>
      <td>${safeText(record.category)}</td>
      <td>${record.amount.toFixed(2)}</td>
      <td>${safeText(record.date)}</td>
      <td><button class="delete-btn" onclick="window.__deleteIncome && window.__deleteIncome('${record.id}')">删除</button></td>
    `;
    el.incomeTable.appendChild(tr);
  });
  // 兼容事件委托
  window.__deleteIncome = deleteIncome;
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
    showError(`该类别累计支出已超限（阈值1000），请调整`);
    return;
  }

  if (!date || !name || isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
    showError("请输入有效的支出信息");
    return;
  }

  let found = false;
  expenseRecords.forEach(record => {
    if (record.date === date && record.name === name && record.category === category && record.price === price) {
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

  el.expenseDate.value = "";
  el.itemName.value = "";
  el.itemPrice.value = "";
  el.itemQuantity.value = "1";
}

export function renderExpenseTable() {
  const el = getElements();
  if (!el.expenseTable) return;
  el.expenseTable.innerHTML = "";
  expenseRecords.forEach(record => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safeText(record.name)}</td>
      <td>${safeText(record.category)}</td>
      <td>${record.price.toFixed(2)}</td>
      <td>${record.quantity}</td>
      <td>${(record.price * record.quantity).toFixed(2)}</td>
      <td>${safeText(record.date)}</td>
      <td><button class="delete-btn" onclick="window.__deleteExpense && window.__deleteExpense('${record.id}')">删除</button></td>
    `;
    el.expenseTable.appendChild(tr);
  });
  // 兼容事件委托
  window.__deleteExpense = deleteExpense;
}

export function deleteExpense(id) {
  expenseRecords.splice(0, expenseRecords.length, ...expenseRecords.filter(r => r.id !== id));
  renderExpenseTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
}

export { showError };