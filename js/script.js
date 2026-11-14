

document.addEventListener("DOMContentLoaded", function () {

  // =====================================
  // MONETA — EXPENSE TRACKER
  // =====================================

  const STORAGE_KEY = "moneta_transactions";
  const GOAL_KEY = "moneta_savings_goal";

  const categories = {
    expense: [
      "Food",
      "Groceries",
      "Transport",
      "Shopping",
      "Bills",
      "Housing",
      "Health",
      "Entertainment",
      "Gym",
      "Education",
      "Other"
    ],
    income: [
      "Salary",
      "Tips",
      "Freelance",
      "Business",
      "Investment",
      "Other"
    ]
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    todayLabel: $("todayLabel"),
    year: $("year"),
    monthFilter: $("monthFilter"),

    balanceValue: $("balanceValue"),
    incomeValue: $("incomeValue"),
    expenseValue: $("expenseValue"),

    goalInput: $("goalInput"),
    saveGoalBtn: $("saveGoalBtn"),
    goalPercent: $("goalPercent"),
    goalProgress: $("goalProgress"),
    goalMessage: $("goalMessage"),

    categoryChart: $("categoryChart"),
    chartIncome: $("chartIncome"),
    chartExpense: $("chartExpense"),
    incomeBar: $("incomeBar"),
    expenseBar: $("expenseBar"),

    transactionForm: $("transactionForm"),
    formHeading: $("formHeading"),
    editId: $("editId"),
    typeInput: $("typeInput"),
    titleInput: $("titleInput"),
    categoryInput: $("categoryInput"),
    amountInput: $("amountInput"),
    dateInput: $("dateInput"),
    submitBtn: $("submitBtn"),
    cancelEditBtn: $("cancelEditBtn"),
    formMessage: $("formMessage"),

    searchInput: $("searchInput"),
    typeFilter: $("typeFilter"),
    categoryFilter: $("categoryFilter"),
    transactionList: $("transactionList"),
    transactionCount: $("transactionCount"),
    filteredTotal: $("filteredTotal"),

    addTransactionBtn: $("addTransactionBtn"),
    exportBtn: $("exportBtn")
  };

  // =====================================
  // DATE AND CURRENCY HELPERS
  // =====================================

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function currentMonthString() {
    return localDateString().slice(0, 7);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2
    }).format(amount);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  // =====================================
  // LOCAL STORAGE
  // =====================================

  function loadTransactions() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const data = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(data)) return [];

      return data.filter(item =>
        item &&
        typeof item.id === "string" &&
        ["income", "expense"].includes(item.type) &&
        typeof item.title === "string" &&
        typeof item.category === "string" &&
        Number.isFinite(Number(item.amount)) &&
        Number(item.amount) > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      );
    } catch (error) {
      console.error("Could not load transactions:", error);
      return [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error("Could not save transactions:", error);
      showMessage("Storage is unavailable. Your changes may not be saved.");
    }
  }

  function loadGoal() {
    const saved = Number(localStorage.getItem(GOAL_KEY));

    return Number.isFinite(saved) && saved >= 0
      ? saved
      : 1000;
  }

  let transactions = loadTransactions();
  let savingsGoal = loadGoal();

  // =====================================
  // INITIAL SETUP
  // =====================================

  elements.todayLabel.textContent =
    new Intl.DateTimeFormat("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date());

  elements.year.textContent = new Date().getFullYear();

  elements.monthFilter.value = currentMonthString();
  elements.dateInput.value = localDateString();
  elements.goalInput.value = savingsGoal;

  updateCategories();
  updateCategoryFilter();
  renderDashboard();

  // =====================================
  // MESSAGES
  // =====================================

  function showMessage(message) {
    elements.formMessage.textContent = message;
  }

  // =====================================
  // CATEGORY OPTIONS
  // =====================================

  function updateCategories(selected = "") {
    const type = elements.typeInput.value;
    const available = categories[type];

    elements.categoryInput.innerHTML = "";

    available.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;

      if (category === selected) {
        option.selected = true;
      }

      elements.categoryInput.appendChild(option);
    });
  }

  function updateCategoryFilter() {
    const previous = elements.categoryFilter.value;

    const allCategories = [
      ...new Set(
        transactions.map(item => item.category)
      )
    ].sort();

    elements.categoryFilter.innerHTML =
      '<option value="all">All categories</option>';

    allCategories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;

      elements.categoryFilter.appendChild(option);
    });

    if (allCategories.includes(previous)) {
      elements.categoryFilter.value = previous;
    }
  }

  // =====================================
  // SELECTED MONTH DATA
  // =====================================

  function getSelectedMonthTransactions() {
    const month = elements.monthFilter.value;

    return transactions.filter(item =>
      item.date.startsWith(month)
    );
  }

  // =====================================
  // DASHBOARD
  // =====================================

  function renderDashboard() {
    const monthly = getSelectedMonthTransactions();

    const income = monthly
      .filter(item => item.type === "income")
      .reduce((total, item) => total + Number(item.amount), 0);

    const expenses = monthly
      .filter(item => item.type === "expense")
      .reduce((total, item) => total + Number(item.amount), 0);

    const balance = income - expenses;

    elements.balanceValue.textContent = formatCurrency(balance);
    elements.incomeValue.textContent = formatCurrency(income);
    elements.expenseValue.textContent = formatCurrency(expenses);

    renderGoal(balance);
    renderCategoryChart(monthly);
    renderComparisonChart(income, expenses);
    renderTransactions();
  }

  // =====================================
  // SAVINGS GOAL
  // =====================================

  function renderGoal(balance) {
    const progress = savingsGoal > 0
      ? Math.max(0, (balance / savingsGoal) * 100)
      : 0;

    const safeProgress = Math.min(progress, 100);

    elements.goalPercent.textContent =
      `${Math.round(safeProgress)}%`;

    elements.goalProgress.style.width =
      `${safeProgress}%`;

    if (savingsGoal === 0) {
      elements.goalMessage.textContent =
        "Set a savings target above zero to track progress.";
    } else if (balance <= 0) {
      elements.goalMessage.textContent =
        "Your monthly income is currently equal to or below your expenses.";
    } else if (balance >= savingsGoal) {
      elements.goalMessage.textContent =
        "Congratulations! You've reached your savings goal.";
    } else {
      const remaining = savingsGoal - balance;

      elements.goalMessage.textContent =
        `${formatCurrency(remaining)} more to reach your goal.`;
    }
  }

  elements.saveGoalBtn.addEventListener("click", function () {
    const value = Number(elements.goalInput.value);

    if (!Number.isFinite(value) || value < 0) {
      alert("Please enter a valid savings goal.");
      return;
    }

    savingsGoal = value;

    try {
      localStorage.setItem(GOAL_KEY, String(savingsGoal));
    } catch (error) {
      console.error("Could not save goal:", error);
      alert("Could not save your goal in this browser.");
      return;
    }

    const monthly = getSelectedMonthTransactions();

    const income = monthly
      .filter(item => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = monthly
      .filter(item => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    renderGoal(income - expenses);
  });

  // =====================================
  // CATEGORY CHART
  // =====================================

  function renderCategoryChart(monthly) {
    const expenseItems = monthly.filter(
      item => item.type === "expense"
    );

    const totals = {};

    expenseItems.forEach(item => {
      totals[item.category] =
        (totals[item.category] || 0) + Number(item.amount);
    });

    const sorted = Object.entries(totals)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      elements.categoryChart.innerHTML =
        '<p class="empty-message">No expenses to display yet.</p>';
      return;
    }

    const maximum = Math.max(...sorted.map(item => item[1]));

    elements.categoryChart.innerHTML = sorted.map(
      ([category, amount]) => {
        const width = (amount / maximum) * 100;

        return `
          <div class="category-row">
            <span class="category-name">${escapeHTML(category)}</span>

            <div class="category-track">
              <div
                class="category-fill"
                style="width:${width}%"
              ></div>
            </div>

            <span class="category-amount">
              ${formatCurrency(amount)}
            </span>
          </div>
        `;
      }
    ).join("");
  }

  // =====================================
  // INCOME VS EXPENSE CHART
  // =====================================

  function renderComparisonChart(income, expenses) {
    const maximum = Math.max(income, expenses, 1);

    elements.incomeBar.style.width =
      `${(income / maximum) * 100}%`;

    elements.expenseBar.style.width =
      `${(expenses / maximum) * 100}%`;

    elements.chartIncome.textContent = formatCurrency(income);
    elements.chartExpense.textContent = formatCurrency(expenses);
  }

  // =====================================
  // TRANSACTION LIST
  // =====================================

  function getFilteredTransactions() {
    const month = elements.monthFilter.value;
    const search = elements.searchInput.value.trim().toLowerCase();
    const type = elements.typeFilter.value;
    const category = elements.categoryFilter.value;

    return transactions
      .filter(item => item.date.startsWith(month))
      .filter(item => type === "all" || item.type === type)
      .filter(item => category === "all" || item.category === category)
      .filter(item =>
        item.title.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
      )
      .sort((a, b) =>
        b.date.localeCompare(a.date) ||
        b.id.localeCompare(a.id)
      );
  }

  function renderTransactions() {
    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
      elements.transactionList.innerHTML =
        '<p class="empty-message">No matching transactions found.</p>';
    } else {
      elements.transactionList.innerHTML = filtered.map(item => {
        const isIncome = item.type === "income";

        return `
          <article class="transaction-item">

            <div class="transaction-left">

              <div class="transaction-symbol ${isIncome ? "" : "expense"}">
                ${isIncome ? "↗" : "↘"}
              </div>

              <div class="transaction-details">
                <h3>${escapeHTML(item.title)}</h3>
                <p>
                  ${escapeHTML(item.category)}
                  ·
                  ${escapeHTML(item.date)}
                </p>
              </div>

            </div>

            <div class="transaction-right">

              <span class="transaction-amount ${isIncome ? "income" : ""}">
                ${isIncome ? "+" : "−"}${formatCurrency(Number(item.amount))}
              </span>

              <div class="transaction-actions">
                <button
                  class="icon-button"
                  data-action="edit"
                  data-id="${escapeHTML(item.id)}"
                  aria-label="Edit ${escapeHTML(item.title)}"
                  type="button"
                >✎</button>

                <button
                  class="icon-button delete"
                  data-action="delete"
                  data-id="${escapeHTML(item.id)}"
                  aria-label="Delete ${escapeHTML(item.title)}"
                  type="button"
                >×</button>
              </div>

            </div>

          </article>
        `;
      }).join("");
    }

    elements.transactionCount.textContent =
      `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;

    const total = filtered.reduce((sum, item) => {
      return sum + (
        item.type === "income"
          ? Number(item.amount)
          : -Number(item.amount)
      );
    }, 0);

    elements.filteredTotal.textContent =
      `Net: ${formatCurrency(total)}`;
  }

  // =====================================
  // ADD TRANSACTION
  // =====================================

  elements.typeInput.addEventListener("change", function () {
    updateCategories();
  });

  elements.transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = elements.titleInput.value.trim();
    const type = elements.typeInput.value;
    const category = elements.categoryInput.value;
    const amount = Number(elements.amountInput.value);
    const date = elements.dateInput.value;

    if (
      !title ||
      !category ||
      !date ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !["income", "expense"].includes(type)
    ) {
      showMessage("Please enter valid transaction details.");
      return;
    }

    const editingId = elements.editId.value;

    if (editingId) {
      const index = transactions.findIndex(
        item => item.id === editingId
      );

      if (index !== -1) {
        transactions[index] = {
          ...transactions[index],
          title,
          type,
          category,
          amount,
          date
        };
      }

      showMessage("Transaction updated successfully.");
    } else {
      const transaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        type,
        category,
        amount,
        date
      };

      transactions.push(transaction);
      showMessage("Transaction added successfully.");
    }

    saveTransactions();
    updateCategoryFilter();

    // Show the month containing the saved transaction.
    elements.monthFilter.value = date.slice(0, 7);

    resetForm();
    renderDashboard();
  });

  // =====================================
  // RESET FORM
  // =====================================

  function resetForm() {
    elements.transactionForm.reset();

    elements.editId.value = "";
    elements.typeInput.value = "expense";
    elements.dateInput.value = localDateString();

    updateCategories();

    elements.formHeading.textContent = "Add a transaction";
    elements.submitBtn.textContent = "Add transaction";
    elements.cancelEditBtn.hidden = true;
  }

  elements.cancelEditBtn.addEventListener("click", function () {
    resetForm();
    showMessage("");
  });

  // =====================================
  // EDIT AND DELETE TRANSACTIONS
  // =====================================

  elements.transactionList.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const transaction = transactions.find(
      item => item.id === id
    );

    if (!transaction) return;

    if (action === "edit") {
      elements.editId.value = transaction.id;
      elements.titleInput.value = transaction.title;
      elements.typeInput.value = transaction.type;
      elements.amountInput.value = transaction.amount;
      elements.dateInput.value = transaction.date;

      updateCategories(transaction.category);

      elements.formHeading.textContent = "Edit transaction";
      elements.submitBtn.textContent = "Save changes";
      elements.cancelEditBtn.hidden = false;

      showMessage("Editing transaction.");

      $("transactionSection").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    if (action === "delete") {
      const confirmed = confirm(
        `Delete "${transaction.title}"? This cannot be undone.`
      );

      if (!confirmed) return;

      transactions = transactions.filter(
        item => item.id !== id
      );

      saveTransactions();
      updateCategoryFilter();
      renderDashboard();

      if (elements.editId.value === id) {
        resetForm();
      }
    }
  });

  // =====================================
  // FILTERS AND MONTH
  // =====================================

  elements.monthFilter.addEventListener("change", function () {
    renderDashboard();
  });

  elements.searchInput.addEventListener("input", renderTransactions);
  elements.typeFilter.addEventListener("change", renderTransactions);

  elements.categoryFilter.addEventListener("change", renderTransactions);

  // =====================================
  // ADD BUTTON
  // =====================================

  elements.addTransactionBtn.addEventListener("click", function () {
    $("transactionSection").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    elements.titleInput.focus();
  });

  // =====================================
  // EXPORT CSV
  // =====================================

  elements.exportBtn.addEventListener("click", function () {
    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
      alert("There are no transactions to export.");
      return;
    }

    const headers = [
      "Date",
      "Description",
      "Type",
      "Category",
      "Amount (AED)"
    ];

    const rows = filtered.map(item => [
      item.date,
      item.title,
      item.type,
      item.category,
      Number(item.amount).toFixed(2)
    ]);

    function csvCell(value) {
      return `"${String(value).replace(/"/g, '""')}"`;
    }

    const csv = [
      headers,
      ...rows
    ].map(row => row.map(csvCell).join(",")).join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `moneta-${elements.monthFilter.value}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  });

  console.log("MONETA Expense Tracker loaded successfully.");

});
