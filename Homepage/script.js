const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const searchToggle = document.getElementById("searchToggle");
const mobileSearchBox = document.getElementById("mobileSearchBox");

function updateCustomerCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem("noireCustomerCart") || "[]");
        const count = Array.isArray(cart)
            ? cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
            : 0;
        document.querySelectorAll(".cart-count").forEach(counter => {
            counter.textContent = String(count);
        });
    } catch (error) {
        document.querySelectorAll(".cart-count").forEach(counter => {
            counter.textContent = "0";
        });
    }
}

updateCustomerCartCount();

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

const LOGGED_IN_SELLER_KEY = "noireLoggedInSeller";

function getLoggedSeller() {
    try {
        const seller = JSON.parse(localStorage.getItem(LOGGED_IN_SELLER_KEY));
        return seller && seller.email ? seller : null;
    } catch (error) {
        return null;
    }
}

function hasReturningSeller() {
    if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;

    try {
        const sellers = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
        return Array.isArray(sellers) && sellers.some((seller) => seller && seller.email);
    } catch (error) {
        return false;
    }
}

function updateSellerNavState() {
    const seller = getLoggedSeller();
    const sellerNavLink = document.getElementById("sellerNavLink");
    const sellerNavLabel = sellerNavLink && sellerNavLink.querySelector(".seller-menu-label");
    const heroSellerLink = document.getElementById("heroSellerLink");
    const returningSeller = hasReturningSeller();

    if (sellerNavLabel) {
        sellerNavLabel.textContent = seller ? seller.storeName : returningSeller ? "Login" : "Become a seller";
    }

    if (heroSellerLink) {
        heroSellerLink.textContent = seller
            ? "Go to Dashboard"
            : returningSeller ? "Login" : "Sell With Us";
        heroSellerLink.href = seller
            ? "../Seller panel/seller-dashboard.html"
            : returningSeller ? "../Login page/login.html" : "../Seller registration/seller-register.html";
    }
}

updateSellerNavState();

(() => {
    const accountMenu = document.getElementById("sellerAccountMenu");
    const trigger = document.getElementById("sellerNavLink");
    const label = trigger && trigger.querySelector(".seller-menu-label");
    const dropdown = document.getElementById("sellerDropdown");
    const logoutButton = document.getElementById("sellerLogoutButton");
    if (!accountMenu || !trigger || !label || !dropdown || !logoutButton) return;

    const getSeller = () => {
        try {
            const seller = JSON.parse(localStorage.getItem("noireLoggedInSeller"));
            return seller && seller.email ? seller : null;
        } catch (error) {
            return null;
        }
    };
    const hasReturningSeller = () => {
        if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
        try {
            const sellers = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
            return Array.isArray(sellers) && sellers.some((seller) => seller && seller.email);
        } catch (error) {
            return false;
        }
    };
    const closeDropdown = () => {
        dropdown.hidden = true;
        accountMenu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
    };
    const updateMenu = () => {
        const seller = getSeller();
        const loggedIn = Boolean(seller);
        const returningSeller = !loggedIn && hasReturningSeller();
        const text = loggedIn ? (seller.storeName || "Seller Store") : returningSeller ? "Login" : "Become a seller";
        label.textContent = text;
        trigger.setAttribute("aria-label", loggedIn ? `${text} account menu` : text);
        accountMenu.classList.toggle("is-logged-in", loggedIn);
        accountMenu.classList.toggle("is-returning-seller", returningSeller);
        accountMenu.querySelector('[data-seller-destination="dashboard"]').href = accountMenu.dataset.dashboardUrl;
        accountMenu.querySelector('[data-seller-destination="settings"]').href = accountMenu.dataset.settingsUrl;
        if (!loggedIn) closeDropdown();
    };
    trigger.addEventListener("click", () => {
        if (!getSeller()) {
            window.location.href = hasReturningSeller() ? accountMenu.dataset.loginUrl : accountMenu.dataset.registerUrl;
            return;
        }
        const open = dropdown.hidden;
        dropdown.hidden = !open;
        accountMenu.classList.toggle("open", open);
        trigger.setAttribute("aria-expanded", String(open));
    });
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("noireLoggedInSeller");
        localStorage.setItem("noireSellerLoggedOut", "true");
        window.location.href = accountMenu.dataset.homeUrl;
    });
    document.addEventListener("click", (event) => {
        if (!accountMenu.contains(event.target)) closeDropdown();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !dropdown.hidden) {
            closeDropdown();
            trigger.focus();
        }
    });
    window.addEventListener("storage", (event) => {
        if (event.key === "noireLoggedInSeller" || event.key === null) updateMenu();
    });
    updateMenu();
})();