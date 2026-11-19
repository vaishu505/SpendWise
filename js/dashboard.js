
/* ========================================
   SPENDWISE - DASHBOARD
======================================== */

/* GET SELECTED DISPLAY CURRENCY */
function getDisplayCurrency() {
    return localStorage.getItem("spendwise_currency") || "INR";
}

/* FORMAT CURRENCY */
function formatCurrency(amount, currency = getDisplayCurrency()) {
    const locale = currency === "USD" ? "en-US" : "en-IN";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

/* GET EXCHANGE RATE */
function getCurrentExchangeRate() {
    if (typeof getSavedExchangeRate !== "function") {
        return null;
    }

    const savedRate = getSavedExchangeRate();

    if (!savedRate || !Number.isFinite(Number(savedRate.rate))) {
        return null;
    }

    return Number(savedRate.rate);
}

/* GET ORIGINAL TRANSACTION AMOUNT */
function getOriginalTransactionAmount(transaction) {
    const amount = transaction.originalAmount !== undefined
        ? transaction.originalAmount
        : transaction.amount;

    return Number(amount) || 0;
}

/* GET ORIGINAL TRANSACTION CURRENCY */
function getOriginalTransactionCurrency(transaction) {
    return transaction.originalCurrency ||
        transaction.currency ||
        "INR";
}

/* CONVERT TRANSACTION INTO SELECTED DISPLAY CURRENCY */
function getTransactionDisplayAmount(transaction) {
    const originalAmount = getOriginalTransactionAmount(transaction);
    const originalCurrency = getOriginalTransactionCurrency(transaction);
    const displayCurrency = getDisplayCurrency();

    if (originalCurrency === displayCurrency) {
        return originalAmount;
    }

    const rate = getCurrentExchangeRate();

    if (!rate) {
        return null;
    }

    if (typeof convertCurrency === "function") {
        return convertCurrency(
            originalAmount,
            originalCurrency,
            displayCurrency,
            rate
        );
    }

    return null;
}

/* FORMAT DATE */
function formatTransactionDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        return dateString || "";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

/* ESCAPE HTML */
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

/* UPDATE FINANCIAL SUMMARY */
function updateSummary(transactions) {
    const totalIncomeElement = document.getElementById("total-income");
    const totalExpensesElement = document.getElementById("total-expenses");
    const totalBalanceElement = document.getElementById("total-balance");

    let totalIncome = 0;
    let totalExpenses = 0;
    let conversionUnavailable = false;

    transactions.forEach(transaction => {
        const convertedAmount = getTransactionDisplayAmount(transaction);

        if (convertedAmount === null) {
            conversionUnavailable = true;
            return;
        }

        if (transaction.type === "income") {
            totalIncome += convertedAmount;
        } else if (transaction.type === "expense") {
            totalExpenses += convertedAmount;
        }
    });

    if (conversionUnavailable) {
        if (totalIncomeElement) {
            totalIncomeElement.textContent = "Rate unavailable";
        }

        if (totalExpensesElement) {
            totalExpensesElement.textContent = "Rate unavailable";
        }

        if (totalBalanceElement) {
            totalBalanceElement.textContent = "Rate unavailable";
        }

        return;
    }

    const totalBalance = totalIncome - totalExpenses;

    if (totalIncomeElement) {
        totalIncomeElement.textContent = formatCurrency(totalIncome);
    }

    if (totalExpensesElement) {
        totalExpensesElement.textContent = formatCurrency(totalExpenses);
    }

    if (totalBalanceElement) {
        totalBalanceElement.textContent = formatCurrency(totalBalance);
    }
}

/* GET FILTERED AND SORTED TRANSACTIONS */
function getFilteredTransactions(transactions) {
    const searchInput = document.getElementById("transaction-search");
    const typeFilter = document.getElementById("filter-type");
    const categoryFilter = document.getElementById("filter-category");
    const sortFilter = document.getElementById("sort-transactions");

    const startDateInput = document.getElementById("filter-start-date");
    const endDateInput = document.getElementById("filter-end-date");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedType = typeFilter ? typeFilter.value : "all";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const sortOrder = sortFilter ? sortFilter.value : "newest";

    const startDate = startDateInput ? startDateInput.value : "";
    const endDate = endDateInput ? endDateInput.value : "";

    let filteredTransactions = transactions.filter(transaction => {
        const title = String(transaction.title || "").toLowerCase();
        const category = String(transaction.category || "").toLowerCase();

        const matchesSearch =
            title.includes(searchText) ||
            category.includes(searchText);

        const matchesType =
            selectedType === "all" ||
            transaction.type === selectedType;

        const matchesCategory =
            selectedCategory === "all" ||
            transaction.category === selectedCategory;

        const transactionDate = String(transaction.date || "");

        const matchesStartDate =
            !startDate ||
            transactionDate >= startDate;

        const matchesEndDate =
            !endDate ||
            transactionDate <= endDate;

        return (
            matchesSearch &&
            matchesType &&
            matchesCategory &&
            matchesStartDate &&
            matchesEndDate
        );
    });

    filteredTransactions.sort((a, b) => {
        const dateDifference = new Date(b.date) - new Date(a.date);

        if (dateDifference === 0) {
            return Number(b.id) - Number(a.id);
        }

        return sortOrder === "oldest"
            ? -dateDifference
            : dateDifference;
    });

    return filteredTransactions;
}

/* DISPLAY TRANSACTIONS */
function updateTransactionList(transactions) {
    const transactionList = document.getElementById("transaction-list");

    if (!transactionList) return;

    transactionList.innerHTML = "";

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:25px;">
                    No matching transactions found.
                </td>
            </tr>
        `;
        return;
    }

    transactions.forEach(transaction => {
        const row = document.createElement("tr");

        const type = transaction.type === "income" ? "Income" : "Expense";
        const amountPrefix = transaction.type === "income" ? "+" : "-";

        const convertedAmount = getTransactionDisplayAmount(transaction);

        let displayedAmount;

        if (convertedAmount !== null) {
            displayedAmount = formatCurrency(convertedAmount);
        } else {
            const originalAmount = getOriginalTransactionAmount(transaction);
            const originalCurrency = getOriginalTransactionCurrency(transaction);

            displayedAmount = formatCurrency(
                originalAmount,
                originalCurrency
            );
        }

        row.innerHTML = `
            <td>${escapeHTML(transaction.title)}</td>

            <td>${escapeHTML(transaction.category)}</td>

            <td>${formatTransactionDate(transaction.date)}</td>

            <td class="${escapeHTML(transaction.type)}">
                ${amountPrefix}${displayedAmount}
            </td>

            <td>
                <span class="transaction-type ${escapeHTML(transaction.type)}">
                    ${type}
                </span>

                <button
                    class="delete-transaction-btn"
                    data-id="${escapeHTML(transaction.id)}"
                    aria-label="Delete ${escapeHTML(transaction.title)}"
                    title="Delete transaction"
                    type="button"
                >
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        transactionList.appendChild(row);
    });

    /* DELETE BUTTON EVENTS */
    transactionList.querySelectorAll(".delete-transaction-btn").forEach(button => {
        button.addEventListener("click", function () {
            const transactionId = this.dataset.id;

            const confirmed = confirm(
                "Are you sure you want to delete this transaction?"
            );

            if (!confirmed) return;

            removeTransaction(transactionId);
        });
    });
}

/* REFRESH TRANSACTION TABLE */
function refreshTransactionList() {
    const transactions = getTransactions();
    const filteredTransactions = getFilteredTransactions(transactions);

    updateTransactionList(filteredTransactions);
}

/* CLEAR ALL SEARCH AND FILTER OPTIONS */
function clearTransactionFilters() {
    const searchInput = document.getElementById("transaction-search");
    const typeFilter = document.getElementById("filter-type");
    const categoryFilter = document.getElementById("filter-category");
    const sortFilter = document.getElementById("sort-transactions");

    if (searchInput) searchInput.value = "";
    if (typeFilter) typeFilter.value = "all";
    if (categoryFilter) categoryFilter.value = "all";
    if (sortFilter) sortFilter.value = "newest";

    const startDateInput = document.getElementById("filter-start-date");
    const endDateInput = document.getElementById("filter-end-date");

    if (startDateInput) startDateInput.value = "";
    if (endDateInput) endDateInput.value = "";

    refreshTransactionList();
}

/* APPLY DATE FILTER */
function applyDateFilter() {
    const startDateInput = document.getElementById("filter-start-date");
    const endDateInput = document.getElementById("filter-end-date");

    if (!startDateInput || !endDateInput) return;

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate && endDate && startDate > endDate) {
        alert("Start date cannot be later than end date.");
        return;
    }

    refreshTransactionList();
}

/* RESET ONLY DATE FILTER */
function resetDateFilter() {
    const startDateInput = document.getElementById("filter-start-date");
    const endDateInput = document.getElementById("filter-end-date");

    if (startDateInput) startDateInput.value = "";
    if (endDateInput) endDateInput.value = "";

    refreshTransactionList();
}

/* DELETE TRANSACTION */
function removeTransaction(transactionId) {
    const deleted = deleteTransaction(transactionId);

    if (!deleted) {
        alert("Unable to delete transaction. Please try again.");
        return;
    }

    // REFRESH DASHBOARD
    updateDashboard();

    // REFRESH CHARTS
    if (typeof updateCharts === "function") {
        updateCharts();
    }

    // REFRESH BUDGETS
    if (typeof updateBudgets === "function") {
        updateBudgets();
    }
}

/* UPDATE ENTIRE DASHBOARD */
function updateDashboard() {
    const transactions = getTransactions();

    updateSummary(transactions);
    refreshTransactionList();
}

/* INITIALIZE SEARCH AND FILTERS */
function initializeTransactionFilters() {
    const searchInput = document.getElementById("transaction-search");
    const typeFilter = document.getElementById("filter-type");
    const categoryFilter = document.getElementById("filter-category");
    const sortFilter = document.getElementById("sort-transactions");

    const clearButton = document.getElementById("clear-filters");

    const applyDateButton = document.getElementById("apply-date-filter");
    const resetDateButton = document.getElementById("reset-date-filter");

    if (searchInput) {
        searchInput.addEventListener("input", refreshTransactionList);
    }

    if (typeFilter) {
        typeFilter.addEventListener("change", refreshTransactionList);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", refreshTransactionList);
    }

    if (sortFilter) {
        sortFilter.addEventListener("change", refreshTransactionList);
    }

    if (clearButton) {
        clearButton.addEventListener("click", clearTransactionFilters);
    }

    if (applyDateButton) {
        applyDateButton.addEventListener("click", applyDateFilter);
    }

    if (resetDateButton) {
        resetDateButton.addEventListener("click", resetDateFilter);
    }
}

/* INITIALIZE DASHBOARD */
document.addEventListener("DOMContentLoaded", function () {
    initializeTransactionFilters();
    updateDashboard();

    console.log("SpendWise dashboard initialized successfully!");
});
