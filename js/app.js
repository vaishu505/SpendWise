
/* ========================================
   SPENDWISE - MAIN APPLICATION
======================================== */

/* EXCHANGE RATE API */
const EXCHANGE_RATE_API =
    "https://api.frankfurter.dev/v2/rate/INR/USD";

const THEME_STORAGE_KEY = "spendwise-theme";

let exchangeRateRequest = null;

/* ========================================
   LIGHT / DARK THEME
======================================== */

/* APPLY SELECTED THEME */
function applyTheme(theme, savePreference = true) {
    const selectedTheme = theme === "light" ? "light" : "dark";

    document.documentElement.dataset.theme = selectedTheme;

    // Keep compatibility with existing CSS if needed.
    document.body.classList.toggle(
        "light-mode",
        selectedTheme === "light"
    );

    if (savePreference) {
        try {
            localStorage.setItem(
                THEME_STORAGE_KEY,
                selectedTheme
            );
        } catch (error) {
            console.error("Unable to save theme preference:", error);
        }
    }

    updateThemeButtons(selectedTheme);

    // Notify other components, including charts.
    window.dispatchEvent(
        new CustomEvent("spendwise:themechange", {
            detail: { theme: selectedTheme }
        })
    );
}

/* UPDATE BOTH THEME BUTTONS */
function updateThemeButtons(theme) {
    const isLight = theme === "light";

    const themeToggle = document.getElementById("theme-toggle");
    const themeToggleIcon = document.getElementById("theme-toggle-icon");

    const settingsToggle = document.getElementById(
        "theme-setting-toggle"
    );
    const settingsIcon = document.getElementById(
        "theme-setting-icon"
    );
    const settingsLabel = document.getElementById(
        "theme-setting-label"
    );

    const actionLabel = isLight
        ? "Switch to dark mode"
        : "Switch to light mode";

    if (themeToggle) {
        themeToggle.setAttribute("aria-label", actionLabel);
        themeToggle.setAttribute("title", actionLabel);
        themeToggle.setAttribute("aria-pressed", String(isLight));
    }

    if (themeToggleIcon) {
        themeToggleIcon.className = isLight
            ? "fa-solid fa-moon"
            : "fa-solid fa-sun";
    }

    if (settingsToggle) {
        settingsToggle.setAttribute("aria-label", actionLabel);
        settingsToggle.setAttribute("aria-pressed", String(isLight));
    }

    if (settingsIcon) {
        settingsIcon.className = isLight
            ? "fa-solid fa-moon"
            : "fa-solid fa-sun";
    }

    if (settingsLabel) {
        settingsLabel.textContent = isLight
            ? "Dark Mode"
            : "Light Mode";
    }
}

/* TOGGLE BETWEEN LIGHT AND DARK */
function toggleTheme() {
    const currentTheme =
        document.documentElement.dataset.theme || "dark";

    const newTheme = currentTheme === "dark"
        ? "light"
        : "dark";

    applyTheme(newTheme);
}

/* INITIALIZE THEME SETTINGS */
function initializeThemeSettings() {
    let savedTheme = "dark";

    try {
        savedTheme =
            localStorage.getItem(THEME_STORAGE_KEY) || "dark";
    } catch (error) {
        console.error("Unable to load theme preference:", error);
    }

    if (!["light", "dark"].includes(savedTheme)) {
        savedTheme = "dark";
    }

    // Apply the saved theme without rewriting storage.
    applyTheme(savedTheme, false);

    const themeToggle = document.getElementById("theme-toggle");
    const settingsToggle = document.getElementById(
        "theme-setting-toggle"
    );

    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }

    if (settingsToggle) {
        settingsToggle.addEventListener("click", toggleTheme);
    }
}

/* ========================================
   SET CURRENT DATE
======================================== */

function setCurrentDate() {
    const dateElement = document.getElementById("current-date");

    if (!dateElement) return;

    const today = new Date();

    dateElement.textContent = today.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

/* ========================================
   SIDEBAR NAVIGATION
======================================== */

function initializeNavigation() {
    const navigationLinks = document.querySelectorAll(".nav-link");

    navigationLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            const target = this.getAttribute("href");

            if (!target || !target.startsWith("#")) return;

            event.preventDefault();

            navigationLinks.forEach(navLink => {
                navLink.classList.remove("active");
            });

            this.classList.add("active");

            if (target === "#") {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
                return;
            }

            const section = document.querySelector(target);

            if (section) {
                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            } else {
                alert("This section is coming soon!");
            }
        });
    });
}

/* ========================================
   NOTIFICATION BUTTON
======================================== */

function initializeNotifications() {
    const notificationButton =
        document.querySelector(".icon-btn[aria-label='Notifications']") ||
        document.querySelector(".notification-btn");

    if (!notificationButton) return;

    notificationButton.addEventListener("click", function () {
        alert("You're all caught up! No new notifications.");
    });
}

/* ========================================
   CURRENCY SETTINGS
======================================== */

/* GET CURRENCY SYMBOL */
function getCurrencySymbol(currency) {
    return currency === "USD" ? "$" : "₹";
}

/* UPDATE TRANSACTION AMOUNT LABEL */
function updateTransactionCurrencyLabel(currency) {
    const symbol = getCurrencySymbol(currency);

    const amountLabel = document.querySelector(
        "label[for='transaction-amount']"
    );

    const amountInput = document.getElementById("transaction-amount");

    if (amountLabel) {
        amountLabel.textContent = `Amount (${symbol} ${currency})`;
    }

    if (amountInput) {
        amountInput.placeholder = `Enter amount in ${currency}`;
    }
}

/* UPDATE DASHBOARD, CHARTS AND BUDGETS */
function refreshFinancialDisplay() {
    if (typeof updateDashboard === "function") {
        updateDashboard();
    }

    if (typeof updateCharts === "function") {
        updateCharts();
    }

    if (typeof updateBudgets === "function") {
        updateBudgets();
    }
}

/* DISPLAY EXCHANGE RATE STATUS */
function updateExchangeRateMessage(message) {
    const currencyMessage = document.getElementById(
        "currency-save-message"
    );

    if (currencyMessage) {
        currencyMessage.textContent = message;
    }
}

/* FETCH LATEST REFERENCE EXCHANGE RATE */
async function fetchExchangeRate() {
    // Avoid duplicate API requests.
    if (exchangeRateRequest) {
        return exchangeRateRequest;
    }

    exchangeRateRequest = (async function () {
        try {
            updateExchangeRateMessage(
                "Fetching the latest exchange rate..."
            );

            const response = await fetch(EXCHANGE_RATE_API, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(
                    `Exchange rate request failed: ${response.status}`
                );
            }

            const data = await response.json();

            const rate = Number(data.rate);

            if (
                !Number.isFinite(rate) ||
                rate <= 0 ||
                data.base !== "INR" ||
                data.quote !== "USD"
            ) {
                throw new Error("Invalid exchange rate received.");
            }

            if (typeof saveExchangeRate !== "function") {
                throw new Error("Exchange rate storage is unavailable.");
            }

            const saved = saveExchangeRate(rate);

            if (!saved) {
                throw new Error("Unable to save exchange rate.");
            }

            updateExchangeRateMessage(
                `Exchange rate updated: ₹1 = $${rate.toFixed(4)} USD (Rate date: ${data.date}).`
            );

            console.log("Exchange rate updated:", data);

            return {
                rate: rate,
                date: data.date,
                source: "live"
            };

        } catch (error) {
            console.error("Exchange rate fetch failed:", error);

            // Use the last saved rate if the API is unavailable.
            const savedRate = typeof getSavedExchangeRate === "function"
                ? getSavedExchangeRate()
                : null;

            if (savedRate) {
                const rate = Number(savedRate.rate);

                updateExchangeRateMessage(
                    `Using saved exchange rate: ₹1 = $${rate.toFixed(4)} USD. Live rate unavailable.`
                );

                return {
                    rate: rate,
                    date: savedRate.updatedAt,
                    source: "saved"
                };
            }

            updateExchangeRateMessage(
                "Exchange rate unavailable. Connect to the internet and try again."
            );

            return null;

        } finally {
            exchangeRateRequest = null;
        }
    })();

    return exchangeRateRequest;
}

/* INITIALIZE CURRENCY SETTINGS */
function initializeCurrencySettings() {
    const currencySelect = document.getElementById("currency-select");

    let savedCurrency = "INR";

    try {
        savedCurrency =
            localStorage.getItem("spendwise_currency") || "INR";
    } catch (error) {
        console.error("Unable to load currency preference:", error);
    }

    if (!["INR", "USD"].includes(savedCurrency)) {
        savedCurrency = "INR";
    }

    if (currencySelect) {
        currencySelect.value = savedCurrency;
    }

    updateTransactionCurrencyLabel(savedCurrency);

    if (currencySelect) {
        currencySelect.addEventListener("change", async function () {
            const selectedCurrency = this.value;

            if (!["INR", "USD"].includes(selectedCurrency)) {
                this.value = savedCurrency;
                return;
            }

            try {
                localStorage.setItem(
                    "spendwise_currency",
                    selectedCurrency
                );

                savedCurrency = selectedCurrency;

                updateTransactionCurrencyLabel(selectedCurrency);

                updateExchangeRateMessage(
                    `Currency selected: ${selectedCurrency}. Updating exchange rate...`
                );

                // Fetch the rate before refreshing converted totals.
                await fetchExchangeRate();

                refreshFinancialDisplay();

            } catch (error) {
                console.error(
                    "Unable to save currency preference:",
                    error
                );

                this.value = savedCurrency;

                updateExchangeRateMessage(
                    "Unable to save your currency preference. Please try again."
                );
            }
        });
    }

    // Fetch the latest rate when the application starts.
    fetchExchangeRate().then(() => {
        refreshFinancialDisplay();
    });
}

/* ========================================
   INITIALIZE APPLICATION
======================================== */

function initializeSpendWise() {
    initializeThemeSettings();

    setCurrentDate();
    initializeNavigation();
    initializeNotifications();
    initializeCurrencySettings();

    refreshFinancialDisplay();

    console.log("SpendWise initialized successfully!");
}

/* START APPLICATION */
document.addEventListener(
    "DOMContentLoaded",
    initializeSpendWise
);
