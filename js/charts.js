
/* ========================================
   SPENDWISE - CHARTS & ANALYTICS
======================================== */

/* CHART INSTANCES */
let incomeExpenseChart = null;
let categoryChart = null;

/* GET CURRENT CURRENCY */
function getChartCurrency() {
    return localStorage.getItem("spendwise_currency") || "INR";
}

/* FORMAT CHART VALUES */
function formatChartCurrency(amount) {
    const currency = getChartCurrency();

    return new Intl.NumberFormat(
        currency === "USD" ? "en-US" : "en-IN",
        {
            style: "currency",
            currency: currency,
            maximumFractionDigits: 2
        }
    ).format(Number(amount) || 0);
}

/* GET SELECTED CHART PERIOD */
function getSelectedChartPeriod() {
    const periodElement = document.getElementById("chart-period");

    if (!periodElement) return "monthly";

    return periodElement.value.toLowerCase();
}

/* FILTER TRANSACTIONS BY CHART PERIOD */
function getChartPeriodTransactions(transactions, period) {
    const now = new Date();

    return transactions.filter(transaction => {
        const transactionDate = new Date(
            transaction.date + "T00:00:00"
        );

        if (Number.isNaN(transactionDate.getTime())) {
            return false;
        }

        if (period.includes("week")) {
            const startOfWeek = new Date(now);
            const day = (now.getDay() + 6) % 7;

            startOfWeek.setDate(now.getDate() - day);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);

            return transactionDate >= startOfWeek &&
                transactionDate < endOfWeek;
        }

        if (period.includes("year")) {
            return transactionDate.getFullYear() === now.getFullYear();
        }

        // Default: current month
        return transactionDate.getMonth() === now.getMonth() &&
            transactionDate.getFullYear() === now.getFullYear();
    });
}

/* GET CONVERTED TRANSACTION AMOUNT */
function getChartTransactionAmount(transaction) {
    if (typeof getTransactionDisplayAmount === "function") {
        return getTransactionDisplayAmount(transaction);
    }

    return Number(transaction.amount) || 0;
}

/* TOTAL TRANSACTIONS OF A TYPE */
function calculateChartTotal(transactions, type) {
    let total = 0;

    for (const transaction of transactions) {
        if (transaction.type !== type) continue;

        const amount = getChartTransactionAmount(transaction);

        // Do not include an amount if its conversion is unavailable.
        if (amount === null) {
            return null;
        }

        total += amount;
    }

    return total;
}

/* GET DAILY INCOME AND EXPENSE DATA */
function getDailyChartData(transactions) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day.toString());

        const dayTransactions = transactions.filter(transaction => {
            const date = new Date(transaction.date + "T00:00:00");

            return date.getDate() === day &&
                date.getMonth() === month &&
                date.getFullYear() === year;
        });

        incomeData.push(
            calculateChartTotal(dayTransactions, "income")
        );

        expenseData.push(
            calculateChartTotal(dayTransactions, "expense")
        );
    }

    return { labels, incomeData, expenseData };
}

/* GET WEEKLY INCOME AND EXPENSE DATA */
function getWeeklyChartData(transactions) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);

        labels.push(
            currentDate.toLocaleDateString("en-IN", {
                weekday: "short"
            })
        );

        const dayTransactions = transactions.filter(transaction => {
            const date = new Date(transaction.date + "T00:00:00");

            return date.getFullYear() === currentDate.getFullYear() &&
                date.getMonth() === currentDate.getMonth() &&
                date.getDate() === currentDate.getDate();
        });

        incomeData.push(
            calculateChartTotal(dayTransactions, "income")
        );

        expenseData.push(
            calculateChartTotal(dayTransactions, "expense")
        );
    }

    return { labels, incomeData, expenseData };
}

/* GET YEARLY INCOME AND EXPENSE DATA */
function getYearlyChartData(transactions) {
    const now = new Date();
    const year = now.getFullYear();

    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let month = 0; month < 12; month++) {
        const currentMonthTransactions = transactions.filter(transaction => {
            const date = new Date(transaction.date + "T00:00:00");

            return date.getMonth() === month &&
                date.getFullYear() === year;
        });

        labels.push(
            new Date(year, month, 1).toLocaleDateString("en-IN", {
                month: "short"
            })
        );

        incomeData.push(
            calculateChartTotal(currentMonthTransactions, "income")
        );

        expenseData.push(
            calculateChartTotal(currentMonthTransactions, "expense")
        );
    }

    return { labels, incomeData, expenseData };
}

/* CREATE INCOME VS EXPENSE CHART */
function createIncomeExpenseChart() {
    const canvas = document.getElementById("income-expense-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const transactions = getTransactions();
    const period = getSelectedChartPeriod();

    let chartData;

    if (period.includes("week")) {
        chartData = getWeeklyChartData(transactions);
    } else if (period.includes("year")) {
        chartData = getYearlyChartData(transactions);
    } else {
        chartData = getDailyChartData(transactions);
    }

    const chartConfig = {
        type: "bar",

        data: {
            labels: chartData.labels,

            datasets: [
                {
                    label: "Income",
                    data: chartData.incomeData,
                    backgroundColor: "#10b981",
                    borderRadius: 5,
                    barPercentage: 0.65
                },
                {
                    label: "Expenses",
                    data: chartData.expenseData,
                    backgroundColor: "#f87171",
                    borderRadius: 5,
                    barPercentage: 0.65
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#a1a1aa",
                        usePointStyle: true,
                        padding: 20
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.raw === null) {
                                return context.dataset.label +
                                    ": Exchange rate unavailable";
                            }

                            return context.dataset.label + ": " +
                                formatChartCurrency(context.raw);
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#a1a1aa"
                    }
                },

                y: {
                    beginAtZero: true,
                    grid: {
                        color: "rgba(255,255,255,0.06)"
                    },
                    ticks: {
                        color: "#a1a1aa",
                        callback: function (value) {
                            return formatChartCurrency(value);
                        }
                    }
                }
            }
        }
    };

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(canvas, chartConfig);
}

/* CREATE CATEGORY BREAKDOWN CHART */
function createCategoryChart() {
    const canvas = document.getElementById("category-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const transactions = getTransactions();
    const period = getSelectedChartPeriod();

    const filteredTransactions = getChartPeriodTransactions(
        transactions,
        period
    );

    const expenses = filteredTransactions.filter(
        transaction => transaction.type === "expense"
    );

    const categoryTotals = {};

    let conversionUnavailable = false;

    expenses.forEach(transaction => {
        const category = transaction.category || "Other";
        const amount = getChartTransactionAmount(transaction);

        if (amount === null) {
            conversionUnavailable = true;
            return;
        }

        categoryTotals[category] =
            (categoryTotals[category] || 0) + amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const chartConfig = {
        type: "doughnut",

        data: {
            labels: labels.length
                ? labels
                : [conversionUnavailable
                    ? "Exchange rate unavailable"
                    : "No expenses yet"],

            datasets: [
                {
                    data: values.length
                        ? values
                        : [1],

                    backgroundColor: labels.length
                        ? [
                            "#6366f1",
                            "#10b981",
                            "#f59e0b",
                            "#f87171",
                            "#8b5cf6",
                            "#06b6d4",
                            "#ec4899",
                            "#84cc16",
                            "#14b8a6",
                            "#a78bfa"
                        ]
                        : ["#3f3f46"],

                    borderWidth: 2,
                    borderColor: "#18181b",
                    hoverOffset: 8
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            cutout: "65%",

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        color: "#a1a1aa",
                        usePointStyle: true,
                        padding: 15
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (!labels.length) {
                                return conversionUnavailable
                                    ? "Exchange rate unavailable"
                                    : "No expenses yet";
                            }

                            return context.label + ": " +
                                formatChartCurrency(context.raw);
                        }
                    }
                }
            }
        }
    };

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(canvas, chartConfig);
}

/* UPDATE ALL CHARTS */
function updateCharts() {
    createIncomeExpenseChart();
    createCategoryChart();
}

/* INITIALIZE CHARTS */
document.addEventListener("DOMContentLoaded", function () {
    updateCharts();

    const periodSelect = document.getElementById("chart-period");

    if (periodSelect) {
        periodSelect.addEventListener("change", updateCharts);
    }
});
