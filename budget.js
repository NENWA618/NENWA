// 数据与工具函数集中管理
export let incomeRecords = [];
export let expenseRecords = [];
export let reminders = [];

let elements = {};
export function setElements(el) { elements = el; }
export function getElements() { return elements; }

// 增强的安全文本处理（防止XSS）
export function safeText(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// 依赖注入
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

// 数据验证函数
function validateRecord(record, type) {
  const errors = [];
  
  if (!record.date) {
    errors.push("日期不能为空");
  }

  if (type === 'income') {
    if (!record.source || record.source.trim().length < 2) {
      errors.push("收入来源至少需要2个字符");
    }
    if (isNaN(record.amount)) {
      errors.push("金额必须是数字");
    }
    if (record.amount <= 0) {
      errors.push("金额必须大于0");
    }
  } 
  else if (type === 'expense') {
    if (!record.name || record.name.trim().length < 2) {
      errors.push("项目名称至少需要2个字符");
    }
    if (isNaN(record.price) || isNaN(record.quantity)) {
      errors.push("价格和数量必须是数字");
    }
    if (record.price <= 0 || record.quantity <= 0) {
      errors.push("价格和数量必须大于0");
    }
  }
  
  return errors;
}

// 更新UI的通用函数
function updateUI() {
  renderIncomeTable();
  renderExpenseTable();
  updateBudget();
  saveDataToLocalStorage();
  throttledRenderQuantumViz();
  updateCharts();
  updatePredictionUI();
}

// 收入相关操作
export function addIncome() {
  const el = getElements();
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

  // 检查是否已存在相同记录
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
  
  // 重置表单
  el.incomeDate.value = "";
  el.incomeSource.value = "";
  el.incomeAmount.value = "";
}

// 支出相关操作
export function addExpense() {
  const el = getElements();
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

  // 检查类别预算限制
  const categoryTotal = expenseRecords
    .filter(r => r.category === record.category)
    .reduce((sum, r) => sum + r.price * r.quantity, 0);
  
  if (categoryTotal + (record.price * record.quantity) > 1000) {
    showError(`该类别累计支出已超过1000元限制`);
    return;
  }

  // 检查是否已存在相同记录
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
  
  // 重置表单
  el.expenseDate.value = "";
  el.itemName.value = "";
  el.itemPrice.value = "";
  el.itemQuantity.value = "1";
}

// 表格渲染函数
export function renderIncomeTable() {
  const el = getElements().incomeTable;
  if (!el) return;
  
  el.innerHTML = incomeRecords.map(record => `
    <tr>
      <td data-label="来源">${safeText(record.source)}</td>
      <td data-label="类别">${safeText(record.category)}</td>
      <td data-label="金额">${record.amount.toFixed(2)}</td>
      <td data-label="日期">${safeText(record.date)}</td>
      <td data-label="操作">
        <button class="delete-btn" data-id="${record.id}" data-type="income">删除</button>
      </td>
    </tr>
  `).join('');
}

export function renderExpenseTable() {
  const el = getElements().expenseTable;
  if (!el) return;
  
  el.innerHTML = expenseRecords.map(record => `
    <tr>
      <td data-label="项目">${safeText(record.name)}</td>
      <td data-label="类别">${safeText(record.category)}</td>
      <td data-label="单价">${record.price.toFixed(2)}</td>
      <td data-label="数量">${record.quantity}</td>
      <td data-label="总计">${(record.price * record.quantity).toFixed(2)}</td>
      <td data-label="日期">${safeText(record.date)}</td>
      <td data-label="操作">
        <button class="delete-btn" data-id="${record.id}" data-type="expense">删除</button>
      </td>
    </tr>
  `).join('');
}

// 删除记录函数
export function deleteRecord(id, type) {
  if (type === 'income') {
    incomeRecords = incomeRecords.filter(r => r.id !== id);
  } else {
    expenseRecords = expenseRecords.filter(r => r.id !== id);
  }
  
  updateUI();
}

// 初始化删除按钮事件委托
export function initDeleteHandlers() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;
      if (id && type) {
        if (confirm('确定要删除这条记录吗？')) {
          deleteRecord(id, type);
        }
      }
    }
  });
}

export function loadDataFromLocalStorage() {
  try {
    const data = JSON.parse(localStorage.getItem("nenwaData"));
    if (data && data.version === 2) {
      incomeRecords.splice(0, incomeRecords.length, ...(data.incomeRecords || []));
      expenseRecords.splice(0, expenseRecords.length, ...(data.expenseRecords || []));
      reminders.splice(0, reminders.length, ...(data.reminders || []));
    }
  } catch (e) {
    console.warn("加载本地数据失败:", e);
  }
}

// 兼容旧版本（可选）
export function deleteIncome(id) {
  deleteRecord(id, 'income');
}

export function deleteExpense(id) {
  deleteRecord(id, 'expense');
}