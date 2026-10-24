(() => {
    const loggedInSellerKey = "noireLoggedInSeller";
    let seller = null;

    try {
        seller = JSON.parse(localStorage.getItem(loggedInSellerKey));
    } catch (error) {
        seller = null;
    }

    if (!seller || !seller.email) {
        window.location.href = "../../Login page/login.html";
        return;
    }

    const productsKey = "noireSellerProducts_" + seller.email.toLowerCase();
    const storeName = seller.storeName || "Seller Store";
    document.getElementById("sellerStoreName").textContent = storeName;
    document.getElementById("sellerAvatar").textContent = storeName.trim().charAt(0).toUpperCase() || "S";
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    const sellerNavLabel = document.querySelector("#sellerNavLink .seller-menu-label");
    if (sellerNavLabel) sellerNavLabel.textContent = storeName;

    // One-time migration of older shared product data to the first registered seller.
    try {
        const legacyProducts = localStorage.getItem("noireSellerProducts");
        const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
        if (legacyProducts && Array.isArray(accounts) && accounts.length && accounts[0].email) {
            const firstSellerKey = "noireSellerProducts_" + accounts[0].email.toLowerCase();
            if (localStorage.getItem(firstSellerKey) === null) {
                const parsedLegacyProducts = JSON.parse(legacyProducts);
                localStorage.setItem(firstSellerKey, JSON.stringify(Array.isArray(parsedLegacyProducts) ? parsedLegacyProducts : []));
            }
            localStorage.removeItem("noireSellerProducts");
        }
    } catch (error) {
        // Continue with the current seller's own saved products.
    }

    let products = [];

    try {
        const savedProducts = localStorage.getItem(productsKey);
        const parsedProducts = savedProducts ? JSON.parse(savedProducts) : [];
        products = Array.isArray(parsedProducts) ? parsedProducts : [];
    } catch (error) {
        products = [];
    }

    const productsList = document.getElementById("productsList");
    const productCount = document.getElementById("productCount");
    const productsPagination = document.getElementById("productsPagination");
    const productsRange = document.getElementById("productsRange");
    const productsPageNumber = document.getElementById("productsPageNumber");
    const previousProductsPage = document.getElementById("previousProductsPage");
    const nextProductsPage = document.getElementById("nextProductsPage");
    const productsPerPage = 20;
    let currentProductsPage = 1;

    function formatPrice(price) {
        return "Rs. " + Number(price).toLocaleString("en-PK");
    }

    function createProductCard(product) {
        const card = document.createElement("article");
        card.className = "product-card";

        if (product.image) {
            const image = document.createElement("img");
            image.className = "product-image";
            image.src = product.image;
            image.alt = product.name || "Product image";
            image.loading = "lazy";
            card.appendChild(image);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "product-image-placeholder";
            const icon = document.createElement("i");
            icon.className = "fa-regular fa-image";
            icon.setAttribute("aria-hidden", "true");
            placeholder.appendChild(icon);
            card.appendChild(placeholder);
        }

        const content = document.createElement("div");
        content.className = "product-card-content";

        const name = document.createElement("h3");
        name.textContent = product.name || "Untitled product";

        const category = document.createElement("p");
        category.className = "product-stock";
        category.textContent = product.category || "Uncategorized";

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = formatPrice(product.price);

        const stock = document.createElement("p");
        stock.className = "product-stock";
        stock.textContent = "Stock: " + (Number(product.stock) || 0);

        const bottom = document.createElement("div");
        bottom.className = "product-card-bottom";

        const status = document.createElement("span");
        status.className = "status-badge";
        if (product.status === "Pending") status.classList.add("pending");
        status.textContent = product.status || "Pending";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-product";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", "Delete " + (product.name || "product"));
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        bottom.append(status, deleteButton);
        content.append(name, category, price, stock, bottom);
        card.appendChild(content);
        return card;
    }

    function renderProducts() {
        productsList.replaceChildren();
        productCount.textContent = products.length + (products.length === 1 ? " product" : " products");
        const totalPages = Math.max(1, Math.ceil(products.length / productsPerPage));
        currentProductsPage = Math.min(currentProductsPage, totalPages);

        if (products.length === 0) {
            productsPagination.hidden = true;
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";

            const icon = document.createElement("i");
            icon.className = "fa-regular fa-folder-open";
            icon.setAttribute("aria-hidden", "true");

            const title = document.createElement("p");
            title.textContent = "No Products Yet";

            const message = document.createElement("small");
            message.textContent = "Add your first product from the dashboard.";

            emptyState.append(icon, title, message);
            productsList.appendChild(emptyState);
            return;
        }

        const startIndex = (currentProductsPage - 1) * productsPerPage;
        const visibleProducts = products.slice(startIndex, startIndex + productsPerPage);
        visibleProducts.forEach((product) => productsList.appendChild(createProductCard(product)));

        productsPagination.hidden = totalPages <= 1;
        productsRange.textContent = `Showing ${startIndex + 1}-${startIndex + visibleProducts.length} of ${products.length} products`;
        productsPageNumber.textContent = `Page ${currentProductsPage} of ${totalPages}`;
        previousProductsPage.disabled = currentProductsPage === 1;
        nextProductsPage.disabled = currentProductsPage === totalPages;
    }

    previousProductsPage.addEventListener("click", () => {
        if (currentProductsPage > 1) {
            currentProductsPage--;
            renderProducts();
        }
    });

    nextProductsPage.addEventListener("click", () => {
        if (currentProductsPage < Math.ceil(products.length / productsPerPage)) {
            currentProductsPage++;
            renderProducts();
        }
    });

    function deleteProduct(productId) {
        const product = products.find((item) => item.id === productId);
        if (!product) return;

        if (!window.confirm('Are you sure you want to delete "' + product.name + '"?')) return;

        const updatedProducts = products.filter((item) => item.id !== productId);

        try {
            localStorage.setItem(productsKey, JSON.stringify(updatedProducts));
            products = updatedProducts;
            renderProducts();
        } catch (error) {
            window.alert("Unable to save changes. Please check available browser storage.");
        }
    }

    renderProducts();
})();

(() => {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");
    const searchToggle = document.getElementById("searchToggle");
    const mobileSearchBox = document.getElementById("mobileSearchBox");
    const categoriesToggle = document.getElementById("categoriesToggle");
    const categoriesDropdown = document.querySelector(".nav-dropdown");

    if (hamburger && navLinks) {
        hamburger.addEventListener("click", () => {
            const opened = navLinks.classList.toggle("show");
            hamburger.setAttribute("aria-expanded", String(opened));
            hamburger.innerHTML = opened
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-bars"></i>';
        });
    }

    if (searchToggle && mobileSearchBox) {
        searchToggle.addEventListener("click", () => {
            mobileSearchBox.classList.toggle("show-search");
            if (mobileSearchBox.classList.contains("show-search")) {
                mobileSearchBox.querySelector("input")?.focus();
            }
        });
    }

    if (categoriesToggle && categoriesDropdown) {
        categoriesToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            const opened = categoriesDropdown.classList.toggle("open");
            categoriesToggle.setAttribute("aria-expanded", String(opened));
        });

        document.addEventListener("click", (event) => {
            if (!categoriesDropdown.contains(event.target)) {
                categoriesDropdown.classList.remove("open");
                categoriesToggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    document.querySelectorAll("#searchForm, #mobileSearchBox").forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const query = form.querySelector("input")?.value.trim();
            if (query) {
                window.location.href = `../../Shoppage/shop.html?search=${encodeURIComponent(query)}`;
            }
        });
    });
})();

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
