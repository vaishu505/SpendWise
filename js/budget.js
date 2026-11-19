
/* ========================================
   SPENDWISE - BUDGET MANAGEMENT
======================================== */

/* BUDGET CATEGORIES */
const BUDGET_CATEGORIES = [
    "Food",
    "Shopping",
    "Transport",
    "Entertainment",
    "Bills",
    "Health",
    "Education",
    "Other"
];

/* GET CURRENT DISPLAY CURRENCY */
function getBudgetCurrency() {
    try {
        const currency = localStorage.getItem("spendwise_currency");
        return ["INR", "USD"].includes(currency) ? currency : "INR";
    } catch (error) {
        return "INR";
    }
}

/* GET CURRENT EXCHANGE RATE */
function getBudgetExchangeRate() {
    if (typeof getCurrentExchangeRate === "function") {
        const rate = Number(getCurrentExchangeRate());

        if (Number.isFinite(rate) && rate > 0) {
            return rate;
        }
    }

    if (typeof getSavedExchangeRate === "function") {
        const savedRate = getSavedExchangeRate();
        const rate = Number(savedRate?.rate);

        if (Number.isFinite(rate) && rate > 0) {
            return rate;
        }
    }

    return null;
}

/* FORMAT BUDGET CURRENCY */
function formatBudgetCurrency(amount, currency) {
    const locale = currency === "USD" ? "en-US" : "en-IN";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

/* CONVERT BUDGET AMOUNT */
function convertBudgetAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        return Number(amount);
    }

    const rate = getBudgetExchangeRate();

    if (!rate || typeof convertCurrency !== "function") {
        return null;
    }

    return convertCurrency(
        amount,
        fromCurrency,
        toCurrency,
        rate
    );
}

/* GET LOCAL YYYY-MM */
function getCurrentBudgetMonth() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

/* FORMAT MONTH HEADING */
function formatBudgetMonth(month) {
    const date = new Date(`${month}-01T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return month;
    }

    return date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });
}

/* GET MONTHLY CATEGORY SPENDING */
function getCategorySpending(category, month, displayCurrency) {
    const transactions = getTransactions();

    let total = 0;
    let conversionUnavailable = false;

    transactions.forEach(transaction => {
        if (
            transaction.type !== "expense" ||
            transaction.category !== category ||
            !transaction.date ||
            String(transaction.date).slice(0, 7) !== month
        ) {
            return;
        }

        const amount = typeof getTransactionDisplayAmount === "function"
            ? getTransactionDisplayAmount(transaction)
            : null;

        if (amount === null || !Number.isFinite(Number(amount))) {
            conversionUnavailable = true;
            return;
        }

        total += Number(amount);
    });

    return {
        total,
        conversionUnavailable
    };
}

/* INITIALIZE BUDGET FORM */
function initializeBudgetForm() {
    const form = document.getElementById("budget-form");
    const amountInput = document.getElementById("budget-amount");
    const monthInput = document.getElementById("budget-month");
    const categoryInput = document.getElementById("budget-category");
    const message = document.getElementById("budget-form-message");

    if (!form || !amountInput || !monthInput || !categoryInput) {
        return;
    }

    monthInput.value = getCurrentBudgetMonth();

    function updateAmountPlaceholder() {
        const currency = getBudgetCurrency();
        amountInput.placeholder = `Enter budget in ${currency}`;
    }

    updateAmountPlaceholder();

    const currencySelect = document.getElementById("currency-select");

    if (currencySelect) {
        currencySelect.addEventListener("change", updateAmountPlaceholder);
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const category = categoryInput.value;
        const amount = Number(amountInput.value);
        const month = monthInput.value;
        const currency = getBudgetCurrency();

        if (!BUDGET_CATEGORIES.includes(category)) {
            message.textContent = "Please select a valid category.";
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            message.textContent = "Please enter a valid budget amount.";
            return;
        }

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            message.textContent = "Please select a valid month.";
            return;
        }

        const saved = addBudget({
            category,
            amount,
            currency,
            month
        });

        if (!saved) {
            message.textContent = "Unable to save budget. Please try again.";
            return;
        }

        message.textContent = `${category} budget saved successfully!`;

        amountInput.value = "";

        updateBudgets();

        setTimeout(() => {
            message.textContent = "";
        }, 3500);
    });
}

/* DISPLAY BUDGET SUMMARY */
function updateBudgetSummary(budgets, month, displayCurrency) {
    const summary = document.getElementById("budget-summary");

    if (!summary) return;

    let totalBudget = 0;
    let totalSpent = 0;
    let conversionUnavailable = false;

    budgets.forEach(budget => {
        const convertedBudget = convertBudgetAmount(
            budget.amount,
            budget.currency,
            displayCurrency
        );

        const spending = getCategorySpending(
            budget.category,
            month,
            displayCurrency
        );

        if (
            convertedBudget === null ||
            !Number.isFinite(convertedBudget) ||
            spending.conversionUnavailable
        ) {
            conversionUnavailable = true;
            return;
        }

        totalBudget += convertedBudget;
        totalSpent += spending.total;
    });

    if (conversionUnavailable) {
        summary.innerHTML = `
            <div class="budget-summary-card">
                <p>Budget summary</p>
                <h3>Rate unavailable</h3>
                <small>
                    Some amounts could not be converted.
                    Please check your exchange rate.
                </small>
            </div>
        `;
        return;
    }

    const remaining = totalBudget - totalSpent;

    summary.innerHTML = `
        <div class="budget-summary-card">
            <p>Total budget</p>
            <h3>${formatBudgetCurrency(totalBudget, displayCurrency)}</h3>
        </div>

        <div class="budget-summary-card">
            <p>Total spent</p>
            <h3>${formatBudgetCurrency(totalSpent, displayCurrency)}</h3>
        </div>

        <div class="budget-summary-card">
            <p>Remaining</p>
            <h3 class="${remaining < 0 ? "budget-danger-text" : "budget-success-text"}">
                ${formatBudgetCurrency(remaining, displayCurrency)}
            </h3>
        </div>
    `;
}

/* DISPLAY ALL BUDGETS */
function updateBudgets() {
    const budgetList = document.getElementById("budget-list");
    const monthInput = document.getElementById("budget-month");
    const monthHeading = document.getElementById("budget-month-heading");

    if (!budgetList || !monthInput) return;

    const month = monthInput.value || getCurrentBudgetMonth();
    const displayCurrency = getBudgetCurrency();

    const budgets = getBudgets().filter(
        budget => budget.month === month
    );

    if (monthHeading) {
        monthHeading.textContent = formatBudgetMonth(month);
    }

    updateBudgetSummary(budgets, month, displayCurrency);

    if (budgets.length === 0) {
        budgetList.innerHTML = `
            <div class="empty-message">
                <i class="fa-solid fa-wallet"></i>
                <p>No budgets created for this month yet.</p>
                <small>Create your first category budget above.</small>
            </div>
        `;
        return;
    }

    budgetList.innerHTML = budgets.map(budget => {
        const convertedBudget = convertBudgetAmount(
            budget.amount,
            budget.currency,
            displayCurrency
        );

        const spending = getCategorySpending(
            budget.category,
            month,
            displayCurrency
        );

        if (
            convertedBudget === null ||
            !Number.isFinite(convertedBudget) ||
            spending.conversionUnavailable
        ) {
            return `
                <div class="budget-card budget-unavailable">
                    <div class="budget-card-heading">
                        <div>
                            <h3>${escapeHTML(budget.category)}</h3>
                            <p>Monthly budget</p>
                        </div>

                        <button
                            class="delete-budget-btn"
                            data-id="${escapeHTML(String(budget.id))}"
                            aria-label="Delete ${escapeHTML(budget.category)} budget"
                            title="Delete budget"
                            type="button"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>

                    <p class="budget-unavailable-message">
                        Exchange rate unavailable. Some amounts cannot be displayed.
                    </p>
                </div>
            `;
        }

        const spent = spending.total;
        const remaining = convertedBudget - spent;

        const percentage = convertedBudget > 0
            ? (spent / convertedBudget) * 100
            : 0;

        const progressWidth = Math.max(0, Math.min(percentage, 100));
        const accessiblePercentage = Math.max(0, Math.min(percentage, 100));

        let statusClass = "budget-normal";
        let statusMessage = "Within budget";

        if (percentage >= 100) {
            statusClass = "budget-exceeded";
            statusMessage = "Budget exceeded!";
        } else if (percentage >= 80) {
            statusClass = "budget-warning";
            statusMessage = "Approaching budget limit";
        }

        return `
            <div class="budget-card ${statusClass}">
                <div class="budget-card-heading">
                    <div>
                        <h3>${escapeHTML(budget.category)}</h3>
                        <p>Monthly budget</p>
                    </div>

                    <button
                        class="delete-budget-btn"
                        data-id="${escapeHTML(String(budget.id))}"
                        aria-label="Delete ${escapeHTML(budget.category)} budget"
                        title="Delete budget"
                        type="button"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                <div class="budget-amount-details">
                    <div>
                        <span>Spent</span>
                        <strong>${formatBudgetCurrency(spent, displayCurrency)}</strong>
                    </div>

                    <div>
                        <span>Budget</span>
                        <strong>${formatBudgetCurrency(convertedBudget, displayCurrency)}</strong>
                    </div>
                </div>

                <div
                    class="budget-progress-track"
                    role="progressbar"
                    aria-label="${escapeHTML(budget.category)} budget usage"
                    aria-valuenow="${accessiblePercentage.toFixed(1)}"
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div
                        class="budget-progress-fill ${statusClass}"
                        style="width: ${progressWidth}%;"
                    ></div>
                </div>

                <div class="budget-progress-info">
                    <span>${percentage.toFixed(1)}% used</span>

                    <span class="${remaining < 0 ? "budget-danger-text" : "budget-success-text"}">
                        ${remaining < 0 ? "Over by " : "Remaining "}
                        ${formatBudgetCurrency(Math.abs(remaining), displayCurrency)}
                    </span>
                </div>

                <p class="budget-status-message ${statusClass}">
                    ${statusMessage}
                </p>
            </div>
        `;
    }).join("");

    initializeBudgetDeleteButtons();
}

/* DELETE BUDGET BUTTONS */
function initializeBudgetDeleteButtons() {
    const deleteButtons = document.querySelectorAll(
        ".delete-budget-btn"
    );

    deleteButtons.forEach(button => {
        button.addEventListener("click", function () {
            const budgetId = this.dataset.id;

            const confirmed = confirm(
                "Are you sure you want to delete this budget?"
            );

            if (!confirmed) return;

            const deleted = deleteBudget(budgetId);

            if (deleted) {
                updateBudgets();
            } else {
                alert("Unable to delete this budget.");
            }
        });
    });
}

/* INITIALIZE BUDGET MANAGEMENT */
function initializeBudgets() {
    initializeBudgetForm();

    const monthInput = document.getElementById("budget-month");

    if (monthInput) {
        monthInput.addEventListener("change", updateBudgets);
    }

    updateBudgets();
}

/* START BUDGET MANAGEMENT */
document.addEventListener("DOMContentLoaded", initializeBudgets);
