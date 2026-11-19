
/* ========================================
   SPENDWISE - LOCAL STORAGE
======================================== */

const STORAGE_KEY = "spendwise_transactions";
const CURRENCY_KEY = "spendwise_currency";
const EXCHANGE_RATE_KEY = "spendwise_exchange_rate";
const BUDGET_STORAGE_KEY = "spendwise_budgets";

/* ========================================
   TRANSACTION STORAGE
======================================== */

/**
 * Get all saved transactions.
 * Older transactions are treated as INR by default.
 */
function getTransactions() {
    try {
        const savedTransactions = localStorage.getItem(STORAGE_KEY);

        if (!savedTransactions) {
            return [];
        }

        const transactions = JSON.parse(savedTransactions);

        if (!Array.isArray(transactions)) {
            return [];
        }

        let needsMigration = false;

        const updatedTransactions = transactions.map(transaction => {
            if (
                transaction.originalAmount === undefined ||
                transaction.originalCurrency === undefined
            ) {
                needsMigration = true;

                return {
                    ...transaction,
                    originalAmount: Number(transaction.amount),
                    originalCurrency: "INR"
                };
            }

            return transaction;
        });

        if (needsMigration) {
            saveTransactions(updatedTransactions);
        }

        return updatedTransactions;

    } catch (error) {
        console.error("Error loading transactions:", error);
        return [];
    }
}

/**
 * Save transactions to LocalStorage.
 */
function saveTransactions(transactions) {
    try {
        if (!Array.isArray(transactions)) {
            throw new Error("Transactions must be an array.");
        }

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );

        return true;

    } catch (error) {
        console.error("Error saving transactions:", error);
        return false;
    }
}

/**
 * Add a new transaction.
 * Preserve the amount and currency in which it was entered.
 */
function addTransaction(transaction) {
    if (!transaction || typeof transaction !== "object") {
        console.error("Invalid transaction.");
        return false;
    }

    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        console.error("Invalid transaction amount.");
        return false;
    }

    const currency = transaction.currency || (
        localStorage.getItem(CURRENCY_KEY) || "INR"
    );

    if (!["INR", "USD"].includes(currency)) {
        console.error("Unsupported transaction currency.");
        return false;
    }

    const newTransaction = {
        ...transaction,
        amount,
        originalAmount: amount,
        originalCurrency: currency
    };

    const transactions = getTransactions();

    transactions.push(newTransaction);

    return saveTransactions(transactions);
}

/**
 * Delete a transaction using its ID.
 */
function deleteTransaction(transactionId) {
    const transactions = getTransactions();

    const updatedTransactions = transactions.filter(
        transaction => transaction.id !== transactionId
    );

    return saveTransactions(updatedTransactions);
}

/**
 * Clear all saved transactions.
 */
function clearTransactions() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;

    } catch (error) {
        console.error("Error clearing transactions:", error);
        return false;
    }
}

/* ========================================
   EXCHANGE RATE STORAGE
======================================== */

/**
 * Save the latest INR-to-USD exchange rate.
 */
function saveExchangeRate(rate) {
    try {
        const numericRate = Number(rate);

        if (!Number.isFinite(numericRate) || numericRate <= 0) {
            throw new Error("Invalid exchange rate.");
        }

        const rateData = {
            rate: numericRate,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(
            EXCHANGE_RATE_KEY,
            JSON.stringify(rateData)
        );

        return true;

    } catch (error) {
        console.error("Error saving exchange rate:", error);
        return false;
    }
}

/**
 * Retrieve the saved exchange rate.
 */
function getSavedExchangeRate() {
    try {
        const savedRate = localStorage.getItem(EXCHANGE_RATE_KEY);

        if (!savedRate) {
            return null;
        }

        const rateData = JSON.parse(savedRate);

        if (
            !rateData ||
            !Number.isFinite(Number(rateData.rate)) ||
            Number(rateData.rate) <= 0
        ) {
            return null;
        }

        return rateData;

    } catch (error) {
        console.error("Error loading exchange rate:", error);
        return null;
    }
}

/**
 * Convert an amount between INR and USD.
 * Rate means USD received for 1 INR.
 */
function convertCurrency(amount, fromCurrency, toCurrency, rate) {
    const numericAmount = Number(amount);
    const exchangeRate = Number(rate);

    if (!Number.isFinite(numericAmount)) {
        return 0;
    }

    if (fromCurrency === toCurrency) {
        return numericAmount;
    }

    if (
        !["INR", "USD"].includes(fromCurrency) ||
        !["INR", "USD"].includes(toCurrency) ||
        !Number.isFinite(exchangeRate) ||
        exchangeRate <= 0
    ) {
        return numericAmount;
    }

    if (fromCurrency === "INR" && toCurrency === "USD") {
        return numericAmount * exchangeRate;
    }

    if (fromCurrency === "USD" && toCurrency === "INR") {
        return numericAmount / exchangeRate;
    }

    return numericAmount;
}

/* ========================================
   BUDGET STORAGE
======================================== */

/**
 * Get all saved budgets.
 */
function getBudgets() {
    try {
        const savedBudgets = localStorage.getItem(
            BUDGET_STORAGE_KEY
        );

        if (!savedBudgets) {
            return [];
        }

        const budgets = JSON.parse(savedBudgets);

        if (!Array.isArray(budgets)) {
            return [];
        }

        return budgets.filter(budget => {
            return (
                budget &&
                typeof budget.category === "string" &&
                Number.isFinite(Number(budget.amount)) &&
                Number(budget.amount) > 0 &&
                ["INR", "USD"].includes(budget.currency) &&
                typeof budget.month === "string"
            );
        });

    } catch (error) {
        console.error("Error loading budgets:", error);
        return [];
    }
}

/**
 * Save all budgets to LocalStorage.
 */
function saveBudgets(budgets) {
    try {
        if (!Array.isArray(budgets)) {
            throw new Error("Budgets must be an array.");
        }

        localStorage.setItem(
            BUDGET_STORAGE_KEY,
            JSON.stringify(budgets)
        );

        return true;

    } catch (error) {
        console.error("Error saving budgets:", error);
        return false;
    }
}

/**
 * Add a budget or update an existing category budget.
 * Each budget belongs to a category and a specific month.
 */
function addBudget(budget) {
    if (!budget || typeof budget !== "object") {
        console.error("Invalid budget.");
        return false;
    }

    const category = String(budget.category || "").trim();
    const amount = Number(budget.amount);
    const currency = budget.currency || (
        localStorage.getItem(CURRENCY_KEY) || "INR"
    );

    const month = String(budget.month || "");

    if (!category) {
        console.error("Budget category is required.");
        return false;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        console.error("Budget amount must be greater than zero.");
        return false;
    }

    if (!["INR", "USD"].includes(currency)) {
        console.error("Unsupported budget currency.");
        return false;
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
        console.error("Invalid budget month.");
        return false;
    }

    const budgets = getBudgets();

    const existingIndex = budgets.findIndex(item => {
        return (
            item.category.toLowerCase() === category.toLowerCase() &&
            item.month === month
        );
    });

    const newBudget = {
        id: existingIndex !== -1
            ? budgets[existingIndex].id
            : Date.now().toString(),

        category,
        amount,
        currency,
        month
    };

    if (existingIndex !== -1) {
        budgets[existingIndex] = newBudget;
    } else {
        budgets.push(newBudget);
    }

    return saveBudgets(budgets);
}

/**
 * Find a budget by category and month.
 */
function getBudgetByCategory(category, month) {
    const budgets = getBudgets();

    return budgets.find(budget => {
        return (
            budget.category.toLowerCase() ===
                String(category).toLowerCase() &&
            budget.month === month
        );
    }) || null;
}

/**
 * Delete a budget using its ID.
 */
function deleteBudget(budgetId) {
    const budgets = getBudgets();

    const updatedBudgets = budgets.filter(
        budget => budget.id !== budgetId
    );

    if (updatedBudgets.length === budgets.length) {
        return false;
    }

    return saveBudgets(updatedBudgets);
}

/**
 * Clear all saved budgets.
 */
function clearBudgets() {
    try {
        localStorage.removeItem(BUDGET_STORAGE_KEY);
        return true;

    } catch (error) {
        console.error("Error clearing budgets:", error);
        return false;
    }
}
