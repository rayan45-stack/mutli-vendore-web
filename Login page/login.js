const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const searchToggle = document.getElementById("searchToggle");
const mobileSearchBox = document.getElementById("mobileSearchBox");

hamburger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("show");

    hamburger.setAttribute("aria-expanded", open);
    hamburger.innerHTML = open
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
});

searchToggle.addEventListener("click", () => {
    mobileSearchBox.classList.toggle("show-search");

    if (mobileSearchBox.classList.contains("show-search")) {
        mobileSearchBox.querySelector("input").focus();
    }
});

navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("show");
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
});

document.querySelectorAll("#searchForm, #mobileSearchBox")
    .forEach(form => {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const query = form.querySelector("input").value.trim();

            if (query) {
                const shopLink = document.querySelector('.nav-links a[href*="shop.html"]');
                if (shopLink) {
                    const shopUrl = new URL(shopLink.href);
                    shopUrl.searchParams.set("search", query);
                    window.location.href = shopUrl.href;
                }
            }
        });
    });


/* ===== CATEGORIES DROPDOWN ===== */

const categoriesToggle = document.getElementById("categoriesToggle");
const categoriesDropdown = document.querySelector(".nav-dropdown");

if (categoriesToggle && categoriesDropdown) {
    categoriesToggle.addEventListener("click", () => {
        const isOpen = categoriesDropdown.classList.toggle("open");

        categoriesToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    document.addEventListener("click", (event) => {
        if (!categoriesDropdown.contains(event.target)) {
            categoriesDropdown.classList.remove("open");
            categoriesToggle.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            categoriesDropdown.classList.remove("open");
            categoriesToggle.setAttribute("aria-expanded", "false");
            categoriesToggle.focus();
        }
    });
}

const SELLERS_KEY = "noireSellerAccounts";
const LOGGED_IN_SELLER_KEY = "noireLoggedInSeller";
const REMEMBER_ME_KEY = "noireSellerRememberMe";
const CUSTOMERS_KEY = "noireCustomerAccounts";
const LOGGED_IN_CUSTOMER_KEY = "noireLoggedInCustomer";
const CUSTOMER_REMEMBER_ME_KEY = "noireCustomerRememberMe";
const loginParams = new URLSearchParams(window.location.search);
const requestedRole = loginParams.get("role");
const loginRole = requestedRole === "customer" ||
    (requestedRole !== "seller" && localStorage.getItem("noireLoginAccountType") === "customer")
    ? "customer"
    : "seller";
if (loginRole === "customer") {
    document.title = "Customer Login | NOIRÉ";
    const sectionLabel = document.querySelector(".section-label");
    const formDescription = document.querySelector(".form-description");
    if (sectionLabel) sectionLabel.textContent = "CUSTOMER LOGIN";
    if (formDescription) formDescription.textContent =
        "Enter your customer email and password to continue shopping.";
}
const loginEmail = document.getElementById("email");
const loginPassword = document.getElementById("password");
const loginRoleStorageKey = loginRole === "customer" ? CUSTOMER_REMEMBER_ME_KEY : REMEMBER_ME_KEY;

if (loginRole === "customer") {
    const customerEmail = localStorage.getItem("noireCustomerOnboardingEmail") ||
        localStorage.getItem("noireCustomerLastEmail") ||
        (() => {
            try {
                const savedAccount = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
                return savedAccount?.profile?.email || "";
            } catch (error) {
                console.error("Unable to read the saved customer profile email.", error);
                return "";
            }
        })();
    try {
        const customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || "[]");
        const customer = Array.isArray(customers) && customers.find(account =>
            account && String(account.email || "").trim().toLowerCase() === customerEmail.toLowerCase()
        );
        if (customer) {
            loginEmail.value = customer.email || "";
            loginPassword.value = customer.password || "";
        }
    } catch (error) {
        console.error("Unable to prefill customer login details.", error);
    }
} else {
    const sellerEmail = localStorage.getItem("noireSellerOnboardingEmail") || "";
    try {
        const sellers = JSON.parse(localStorage.getItem(SELLERS_KEY) || "[]");
        const seller = Array.isArray(sellers) && sellers.find(account =>
            account && String(account.email || "").trim().toLowerCase() === sellerEmail.toLowerCase()
        );
        if (seller) {
            loginEmail.value = seller.email || "";
            loginPassword.value = seller.password || "";
        }
    } catch (error) {
        console.error("Unable to prefill seller login details.", error);
    }
}

function getLoggedSeller() {
    try {
        const seller = JSON.parse(localStorage.getItem(LOGGED_IN_SELLER_KEY));
        return seller && seller.email ? seller : null;
    } catch (error) {
        return null;
    }
}

const currentSeller = getLoggedSeller();
if (loginRole === "seller" && currentSeller) {
    window.location.href = "../Seller panel/seller-dashboard.html";
}

const loginForm = document.querySelector(".login-form");
const rememberCheckbox = loginForm && loginForm.querySelector('input[name="remember"]');

if (rememberCheckbox) {
    rememberCheckbox.checked = localStorage.getItem(loginRoleStorageKey) === "true" ||
        Boolean(localStorage.getItem(`noire${loginRole === "customer" ? "Customer" : "Seller"}OnboardingEmail`));
    rememberCheckbox.addEventListener("change", () => {
        localStorage.setItem(loginRoleStorageKey, String(rememberCheckbox.checked));
    });
}

const passwordInput = document.getElementById("password");
const passwordToggle = document.querySelector(".password-toggle");

if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener("click", () => {
        const isPasswordHidden = passwordInput.type === "password";

        passwordInput.type = isPasswordHidden ? "text" : "password";
        passwordToggle.setAttribute(
            "aria-label",
            isPasswordHidden ? "Hide password" : "Show password"
        );

        const icon = passwordToggle.querySelector("i");
        if (icon) {
            icon.classList.toggle("fa-eye", !isPasswordHidden);
            icon.classList.toggle("fa-eye-slash", isPasswordHidden);
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const email = loginEmail.value.trim().toLowerCase();
        const password = loginPassword.value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        if (rememberCheckbox) {
            localStorage.setItem(loginRoleStorageKey, String(rememberCheckbox.checked));
        }

        if (loginRole === "customer") {
            let customers;
            try {
                customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || "[]");
            } catch (error) {
                alert("Saved customer accounts could not be read. Please check browser storage.");
                return;
            }
            const matchedCustomer = Array.isArray(customers) && customers.find(customer =>
                customer && String(customer.email || "").trim().toLowerCase() === email &&
                customer.password === password
            );
            if (!matchedCustomer) {
                alert("Invalid customer email or password. Please try again.");
                return;
            }
            let profile = {
                name: matchedCustomer.fullName || "",
                email: matchedCustomer.email,
                phone: matchedCustomer.phone || "",
                dob: "",
                gender: "Prefer not to say"
            };
            let savedAddresses = [];
            try {
                const savedAccount = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
                if (savedAccount && String(savedAccount.profile?.email || "").trim().toLowerCase() === email) {
                    profile = { ...profile, ...savedAccount.profile, email: matchedCustomer.email };
                    if (Array.isArray(savedAccount.addresses)) {
                        savedAddresses = savedAccount.addresses;
                    }
                }
            } catch (error) {
                alert("Saved customer profile data could not be read. Please check browser storage.");
                return;
            }
            localStorage.setItem("noireCustomerAccount_v1", JSON.stringify({
                profile,
                addresses: savedAddresses
            }));
            localStorage.setItem(LOGGED_IN_CUSTOMER_KEY, JSON.stringify({
                email,
                name: matchedCustomer.fullName || "Customer",
                loggedInAt: new Date().toISOString()
            }));
            localStorage.setItem("noireCustomerLastEmail", email);
            const isFirstCustomerLogin =
                localStorage.getItem("noireCustomerOnboardingEmail") === email;
            localStorage.removeItem("noireCustomerOnboardingEmail");
            localStorage.removeItem("noireLoginAccountType");
            const returnTo = sessionStorage.getItem("noireCustomerPostLoginReturn") ||
                loginParams.get("next");
            sessionStorage.removeItem("noireCustomerPostLoginReturn");
            if (returnTo) {
                try {
                    const destination = new URL(returnTo, window.location.href);
                    if (destination.origin === window.location.origin) {
                        window.location.href = destination.href;
                        return;
                    }
                } catch (error) {
                    console.error("Unable to return to the requested page after customer login.", error);
                }
            }
            window.location.href = isFirstCustomerLogin
                ? "../Costumer panel/customer-account.html#addresses"
                : "../Costumer panel/customer-account.html#profile";
            return;
        }

        let sellers;
        try {
            sellers = JSON.parse(localStorage.getItem(SELLERS_KEY) || "[]");
        } catch (error) {
            alert("Saved seller accounts could not be read. Please check browser storage.");
            return;
        }
        const matchedSeller = Array.isArray(sellers) && sellers.find((seller) =>
            String(seller.email || "").trim().toLowerCase() === email && seller.password === password
        );
        if (!matchedSeller) {
            alert("Invalid seller email or password. Please try again.");
            return;
        }
        const onboardingEmail = localStorage.getItem("noireSellerOnboardingEmail");
        const isFirstLogin = onboardingEmail === email;
        if (isFirstLogin) localStorage.removeItem("noireSellerOnboardingEmail");
        localStorage.removeItem("noireSellerLoggedOut");
        localStorage.setItem(LOGGED_IN_SELLER_KEY, JSON.stringify(matchedSeller));
        localStorage.removeItem("noireLoginAccountType");
        window.location.href = isFirstLogin
            ? "../Seller panel/settings/seller-settings.html"
            : "../Seller panel/seller-dashboard.html";
    });
}

(() => {
    const menu = document.getElementById("sellerAccountMenu");
    const trigger = document.getElementById("sellerNavLink");
    const label = trigger && trigger.querySelector(".seller-menu-label");
    const dropdown = document.getElementById("sellerDropdown");
    const logout = document.getElementById("sellerLogoutButton");
    if (!menu || !trigger || !label || !dropdown || !logout) return;

    const seller = () => {
        try {
            const value = JSON.parse(localStorage.getItem("noireLoggedInSeller"));
            return value && value.email ? value : null;
        } catch (error) { return null; }
    };
    const returning = () => {
        if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
        try {
            const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
            return Array.isArray(accounts) && accounts.some((account) => account && account.email);
        } catch (error) { return false; }
    };
    const close = () => {
        dropdown.hidden = true;
        menu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
    };
    const sync = () => {
        const currentSeller = seller();
        const loggedIn = Boolean(currentSeller);
        const returningSeller = !loggedIn && returning();
        const text = loggedIn ? (currentSeller.storeName || "Seller Store") : returningSeller ? "Login" : "Become a seller";
        label.textContent = text;
        trigger.setAttribute("aria-label", loggedIn ? `${text} account menu` : text);
        menu.classList.toggle("is-logged-in", loggedIn);
        menu.classList.toggle("is-returning-seller", returningSeller);
        menu.querySelector('[data-seller-destination="dashboard"]').href = menu.dataset.dashboardUrl;
        menu.querySelector('[data-seller-destination="settings"]').href = menu.dataset.settingsUrl;
        if (!loggedIn) close();
    };
    trigger.addEventListener("click", () => {
        if (!seller()) {
            window.location.href = returning() ? menu.dataset.loginUrl : menu.dataset.registerUrl;
            return;
        }
        const open = dropdown.hidden;
        dropdown.hidden = !open;
        menu.classList.toggle("open", open);
        trigger.setAttribute("aria-expanded", String(open));
    });
    logout.addEventListener("click", () => {
        localStorage.removeItem("noireLoggedInSeller");
        localStorage.setItem("noireSellerLoggedOut", "true");
        window.location.href = menu.dataset.homeUrl;
    });
    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !dropdown.hidden) {
            close();
            trigger.focus();
        }
    });
    window.addEventListener("storage", (event) => {
        if (event.key === "noireLoggedInSeller" || event.key === null) sync();
    });
    sync();
})();