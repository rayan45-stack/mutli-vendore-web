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
const TERMS_ACCEPTED_KEY = "noireSellerTermsAccepted";

const registrationForm = document.querySelector(".registration-form");
const termsCheckbox = registrationForm && registrationForm.querySelector('input[name="terms"]');
let customerPrefilled = false;
const customerProfiles = (() => {
    try {
        return JSON.parse(localStorage.getItem("noireCustomerAccounts") || "[]");
    } catch (error) {
        return [];
    }
})();
const customerEmailInput = registrationForm && registrationForm.querySelector('input[name="email"]');
if (registrationForm && Array.isArray(customerProfiles) && customerEmailInput) {
    let customerEmail = localStorage.getItem("noireCustomerOnboardingEmail") || "";
    try {
        const customerSession = JSON.parse(localStorage.getItem("noireLoggedInCustomer") || "null");
        if (customerSession && customerSession.email) customerEmail = customerSession.email;
    } catch (error) {
        console.error("Unable to read the active customer session.", error);
    }
    const customer = customerProfiles.find(account =>
        account && String(account.email || "").trim().toLowerCase() ===
        String(customerEmail).trim().toLowerCase()
    );
    if (customer) {
        customerPrefilled = true;
        registrationForm.querySelector('input[name="fullName"]').value = customer.fullName || "";
        customerEmailInput.value = customer.email || "";
        registrationForm.querySelector('input[name="phone"]').value = customer.phone || "";
        registrationForm.querySelector('input[name="password"]').value = customer.password || "";
    }
}

if (termsCheckbox) {
    termsCheckbox.checked = localStorage.getItem(TERMS_ACCEPTED_KEY) === "true" ||
        (customerPrefilled && localStorage.getItem("noireCustomerTermsAccepted") === "true");
}

if (registrationForm) {
    registrationForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(registrationForm);
        const seller = {
            fullName: formData.get("fullName").toString().trim(),
            email: formData.get("email").toString().trim().toLowerCase(),
            phone: formData.get("phone").toString().trim(),
            storeName: formData.get("storeName").toString().trim(),
            password: formData.get("password").toString().trim(),
            paymentDetails: {},
            createdAt: new Date().toISOString()
        };

        if (!seller.fullName || !seller.email || !seller.phone || !seller.storeName || !seller.password) {
            alert("Please fill in all required seller details.");
            return;
        }

        let existingSellers;
        try {
            existingSellers = JSON.parse(localStorage.getItem(SELLERS_KEY) || "[]");
        } catch (error) {
            alert("Saved seller accounts could not be read. Please check browser storage.");
            return;
        }
        if (!Array.isArray(existingSellers)) {
            alert("Saved seller accounts are invalid. Please check browser storage.");
            return;
        }
        const alreadyExists = existingSellers.some((item) => item.email.toLowerCase() === seller.email);

        if (alreadyExists) {
            alert("An account with this email already exists.");
            return;
        }

        existingSellers.push(seller);
        localStorage.setItem(SELLERS_KEY, JSON.stringify(existingSellers));
        localStorage.setItem(TERMS_ACCEPTED_KEY, String(Boolean(termsCheckbox && termsCheckbox.checked)));
        localStorage.setItem("noireSellerOnboardingEmail", seller.email);
        localStorage.setItem("noireSellerSetupInProgress", seller.email);
        localStorage.setItem("noireLoginAccountType", "seller");
        localStorage.removeItem("noireCustomerOnboardingEmail");
        localStorage.removeItem("noireSellerLoggedOut");

        window.location.href = "../Login page/login.html";
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