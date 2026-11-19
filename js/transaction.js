
/* ========================================
   SPENDWISE - TRANSACTIONS
======================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("SpendWise transactions.js loaded");

    const modal = document.getElementById("transaction-modal");
    const addBtn = document.getElementById("add-transaction-btn");
    const closeBtn = document.getElementById("close-modal");
    const cancelBtn = document.getElementById("cancel-modal");
    const form = document.getElementById("transaction-form");

    // CHECK REQUIRED ELEMENTS
    if (!modal || !addBtn) {
        console.error("Modal or Add Transaction button not found!");
        return;
    }

    // OPEN MODAL
    addBtn.addEventListener("click", function (event) {
        event.preventDefault();

        modal.classList.add("active");

        const dateInput = document.getElementById("transaction-date");

        if (dateInput) {
            const today = new Date();

            dateInput.value = [
                today.getFullYear(),
                String(today.getMonth() + 1).padStart(2, "0"),
                String(today.getDate()).padStart(2, "0")
            ].join("-");
        }

        updateAmountCurrencyLabel();
    });

    // UPDATE AMOUNT LABEL BASED ON SELECTED CURRENCY
    function updateAmountCurrencyLabel() {
        const currency = localStorage.getItem("spendwise_currency") || "INR";

        const amountLabel = document.querySelector(
            'label[for="transaction-amount"]'
        );

        const amountInput = document.getElementById("transaction-amount");

        const currencySymbol = currency === "USD" ? "$" : "₹";

        if (amountLabel) {
            amountLabel.textContent = `Amount (${currencySymbol} ${currency})`;
        }

        if (amountInput) {
            amountInput.placeholder = `Enter amount in ${currency}`;
        }
    }

    // CLOSE MODAL
    function closeModal() {
        modal.classList.remove("active");

        if (form) {
            form.reset();
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeModal);
    }

    // CLICK OUTSIDE MODAL
    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // ESCAPE KEY
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });

    // SAVE TRANSACTION
    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const title = document.getElementById("transaction-title").value.trim();

            const amount = Number(
                document.getElementById("transaction-amount").value
            );

            const category = document.getElementById("transaction-category").value;
            const date = document.getElementById("transaction-date").value;

            const selectedType = document.querySelector(
                'input[name="transaction-type"]:checked'
            );

            const currency = localStorage.getItem("spendwise_currency") || "INR";

            // VALIDATION
            if (
                !selectedType ||
                !title ||
                !Number.isFinite(amount) ||
                amount <= 0 ||
                !category ||
                !date
            ) {
                alert("Please complete all transaction details.");
                return;
            }

            // CREATE TRANSACTION
            const transaction = {
                id: Date.now().toString(),
                title: title,
                type: selectedType.value,
                amount: amount,
                originalAmount: amount,
                currency: currency,
                originalCurrency: currency,
                category: category,
                date: date
            };

            // SAVE TRANSACTION
            if (!addTransaction(transaction)) {
                alert("Unable to save transaction.");
                return;
            }

            closeModal();

            // REFRESH DASHBOARD
            if (typeof updateDashboard === "function") {
                updateDashboard();
            }

            // REFRESH CHARTS
            if (typeof updateCharts === "function") {
                updateCharts();
            }

            // REFRESH BUDGETS
            if (typeof updateBudgets === "function") {
                updateBudgets();
            }

            alert("Transaction added successfully!");
        });
    }

    // UPDATE LABEL IF CURRENCY CHANGES
    const currencySelect = document.getElementById("currency-select");

    if (currencySelect) {
        currencySelect.addEventListener("change", updateAmountCurrencyLabel);
    }

    updateAmountCurrencyLabel();

    console.log("SpendWise transaction events initialized");

});
