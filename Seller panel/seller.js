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
                        window.location.href = "../Shoppage/shop.html?search=" + encodeURIComponent(query);
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

        
/* =========================================
   NOIRÉ — SELLER DASHBOARD JAVASCRIPT
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  // =========================================
  // 1. GET HTML ELEMENTS
  // =========================================

  const productForm = document.getElementById("productForm");
  const productName = document.getElementById("productName");
  const productCategory = document.getElementById("productCategory");
  const productPrice = document.getElementById("productPrice");
  const productOriginalPrice = document.getElementById("productOriginalPrice");
  const productStock = document.getElementById("productStock");
  const productColorValues = document.getElementById("productColorValues");
  const productSizeValues = document.getElementById("productSizeValues");
  const productDescription = document.getElementById("productDescription");
  const productImage = document.getElementById("productImage");
  const imagePreview = document.getElementById("imagePreview");
  const imagePreviewGallery = document.getElementById("imagePreviewGallery");
  const formMessage = document.getElementById("formMessage");

  const productsList = document.getElementById("productsList");
  const totalProducts = document.getElementById("totalProducts");
  const productCount = document.getElementById("productCount");
  const pendingProducts = document.getElementById("pendingProducts");
  const currentDate = document.getElementById("currentDate");

  // =========================================
  // 2. DATE
  // =========================================

  if (currentDate) {
    currentDate.textContent = new Date().toLocaleDateString(
      "en-PK",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  }

  // =========================================
  // 3. LOAD PRODUCTS FOR THE CURRENT SELLER
  // =========================================

  const LOGGED_IN_SELLER_KEY = "noireLoggedInSeller";

  function getLoggedSeller() {
    try {
      const seller = JSON.parse(localStorage.getItem(LOGGED_IN_SELLER_KEY));
      return seller && seller.email ? seller : null;
    } catch (error) {
      return null;
    }
  }

  const activeSeller = getLoggedSeller();
  if (!activeSeller) {
    window.location.href = "../Login page/login.html";
    return;
  }

  const productsKey = "noireSellerProducts_" + activeSeller.email.toLowerCase();
  // One-time compatibility: move old shared products to the first registered seller,
  // so a newly registered account never inherits another seller's products.
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
    // Keep the dashboard usable if old browser data is malformed.
  }

  // =========================================
  // 4. LOAD PRODUCTS FROM LOCAL STORAGE
  // =========================================

  let products = [];

  try {
    const savedProducts = localStorage.getItem(productsKey);
    const parsedProducts = savedProducts ? JSON.parse(savedProducts) : [];
    products = Array.isArray(parsedProducts) ? parsedProducts : [];
  } catch (error) {
    products = [];
  }

  let nextProductId = products.reduce(
    (largestId, product) => Math.max(largestId, Number(product.id) || 0),
    0
  ) + 1;

  function saveProducts() {
    try {
      localStorage.setItem(
        productsKey,
        JSON.stringify(products)
      );
      return true;
    } catch (error) {
      showMessage(
        "Browser storage is full. Please try a smaller image.",
        true
      );
      return false;
    }
  }

  // =========================================
  // 5. SHOW FORM MESSAGE
  // =========================================

  function showMessage(message, isError = false) {
    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.style.color = isError ? "#b54736" : "#426c4d";
  }

  // =========================================
  // 6. FORMAT PRICE
  // =========================================

  function formatPrice(price) {
    return "Rs. " + Number(price).toLocaleString("en-PK");
  }

  // =========================================
  // 7. CREATE PRODUCT CARD
  // =========================================

  function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageArea = document.createElement("div");

    if (product.image) {
      const image = document.createElement("img");

      image.className = "product-image";
      image.src = product.image;
      image.alt = product.name;
      image.loading = "lazy";

      imageArea.appendChild(image);
    } else {
      const placeholder = document.createElement("div");

      placeholder.className = "product-image-placeholder";

      const icon = document.createElement("i");
      icon.className = "fa-regular fa-image";
      icon.setAttribute("aria-hidden", "true");

      placeholder.appendChild(icon);
      imageArea.appendChild(placeholder);
    }

    card.appendChild(imageArea);

    const content = document.createElement("div");
    content.className = "product-card-content";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const category = document.createElement("p");
    category.className = "product-stock";
    category.textContent = product.category;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = formatPrice(product.price);

    const stock = document.createElement("p");
    stock.className = "product-stock";
    stock.textContent = "Stock: " + product.stock;

    const bottom = document.createElement("div");
    bottom.className = "product-card-bottom";

    const status = document.createElement("span");
    status.className = "status-badge";

    if (product.status === "Pending") {
      status.classList.add("pending");
    }

    status.textContent = product.status || "Pending";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-product";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      "Delete " + product.name
    );

    deleteButton.addEventListener("click", () => {
      deleteProduct(product.id);
    });

    bottom.append(status, deleteButton);
    content.append(name, category, price, stock, bottom);
    card.appendChild(content);

    return card;
  }

  // =========================================
  // 8. RENDER RECENT PRODUCTS
  // =========================================

  function renderProducts() {
    if (productsList) {
      productsList.replaceChildren();

      if (products.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("i");
        icon.className = "fa-regular fa-folder-open";

        const title = document.createElement("p");
        title.textContent = "No Products Yet";

        const message = document.createElement("small");
        message.textContent = "Add your first product using the form above.";

        emptyState.append(icon, title, message);
        productsList.appendChild(emptyState);
      } else {
        products.slice(0, 5).forEach((product) => {
          productsList.appendChild(createProductCard(product));
        });
      }
    }

    updateProductCounts();
  }

  // =========================================
  // 9. UPDATE PRODUCT COUNTS
  // =========================================

  function updateProductCounts() {
    if (totalProducts) {
      totalProducts.textContent = products.length;
    }

    if (productCount) {
      productCount.textContent = `${Math.min(products.length, 5)} of ${products.length} products`;
    }

    if (pendingProducts) {
      pendingProducts.textContent = products.filter(
        (product) => product.status === "Pending"
      ).length;
    }
  }

  // =========================================
  // 10. IMAGE PREVIEW & VALIDATION
  // =========================================

  let selectedImages = [];
  let selectedImage = "";
  let imagesLoading = false;
  let imageLoadToken = 0;

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read an image. Please try again."));
      reader.readAsDataURL(file);
    });
  }

  if (productImage) {
    productImage.addEventListener("change", () => {
      const currentLoadToken = ++imageLoadToken;
      imagesLoading = false;
      selectedImages = [];
      selectedImage = "";

      if (imagePreview) {
        imagePreview.removeAttribute("src");
        imagePreview.hidden = true;
      }
      if (imagePreviewGallery) imagePreviewGallery.replaceChildren();

      const files = Array.from(productImage.files || []);

      if (!files.length) return;

      if (files.length > 5) {
        showMessage("Please select no more than 5 product images.", true);
        productImage.value = "";
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (files.some(file => !allowedTypes.includes(file.type))) {
        showMessage("Please select JPG, PNG, or WebP images only.", true);
        productImage.value = "";
        return;
      }

      if (files.some(file => file.size > 1024 * 1024)) {
        showMessage("Each image must not exceed 1 MB.", true);
        productImage.value = "";
        return;
      }

      if (files.reduce((total, file) => total + file.size, 0) > 2 * 1024 * 1024) {
        showMessage("The combined image size must not exceed 2 MB.", true);
        productImage.value = "";
        return;
      }

      imagesLoading = true;
      Promise.all(files.map(readImageFile))
        .then(images => {
          if (currentLoadToken !== imageLoadToken) return;
          imagesLoading = false;
          selectedImages = images;
          selectedImage = selectedImages[0] || "";
          if (imagePreview && selectedImage) {
            imagePreview.src = selectedImage;
            imagePreview.hidden = false;
          }
          if (imagePreviewGallery) {
            selectedImages.slice(1).forEach((source, index) => {
              const preview = document.createElement("img");
              preview.src = source;
              preview.alt = `Additional product preview ${index + 2}`;
              imagePreviewGallery.appendChild(preview);
            });
          }
          showMessage(`${selectedImages.length} product image${selectedImages.length === 1 ? "" : "s"} ready.`);
        })
        .catch(error => {
          if (currentLoadToken !== imageLoadToken) return;
          imagesLoading = false;
          selectedImages = [];
          selectedImage = "";
          productImage.value = "";
          showMessage(error instanceof Error ? error.message : "Unable to read the selected images.", true);
        });
    });
  }

  // =========================================
  // 11. ADD NEW PRODUCT
  // =========================================

  if (productForm) {
    productForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (imagesLoading) {
        showMessage("Please wait for the selected images to finish loading.", true);
        return;
      }

      const name = productName.value.trim();
      const category = productCategory.value;
      const price = Number(productPrice.value);
      const originalPriceValue = productOriginalPrice.value.trim();
      const originalPrice = originalPriceValue ? Number(originalPriceValue) : null;
      const stock = Number(productStock.value);
      const description = productDescription.value.trim();
      const options = [...new Set(productColorValues.value.split(",").map(option => option.trim()).filter(Boolean))];
      const sizes = [...new Set(productSizeValues.value.split(",").map(option => option.trim()).filter(Boolean))];
      const optionName = options.length ? "Color" : "";
      const optionGroups = [
        ...(options.length ? [{ name: "Color", values: options }] : []),
        ...(sizes.length ? [{ name: "Size", values: sizes }] : [])
      ];

      if (
        !name ||
        !category ||
        !description ||
        productPrice.value.trim() === "" ||
        productStock.value.trim() === ""
      ) {
        showMessage("Please fill in all required fields.", true);
        return;
      }

      if (!Number.isFinite(price) || price <= 0) {
        showMessage("The price must be greater than zero.", true);
        return;
      }

      if (originalPriceValue && (!Number.isFinite(originalPrice) || originalPrice <= price)) {
        showMessage("Original price must be greater than the current price.", true);
        return;
      }

      if (!Number.isInteger(stock) || stock < 0) {
        showMessage("Stock quantity must be a non-negative whole number.", true);
        return;
      }

      const newProduct = {
        id: nextProductId,
        name,
        category,
        price,
        originalPrice,
        stock,
        description,
        image: selectedImage,
        images: selectedImages.slice(1),
        optionName,
        options,
        sizes,
        optionGroups,
        status: "Pending"
      };

      products.unshift(newProduct);

      if (!saveProducts()) {
        products.shift();
        return;
      }

      nextProductId++;

      renderProducts();
      productForm.reset();

      selectedImage = "";
      selectedImages = [];
      imagesLoading = false;
      imageLoadToken++;

      if (imagePreview) {
        imagePreview.removeAttribute("src");
        imagePreview.hidden = true;
      }
      if (imagePreviewGallery) imagePreviewGallery.replaceChildren();

      showMessage("Product added successfully! Approval is pending.");

      window.location.href = "My products/my-products.html";
    });
  }

  // =========================================
  // 12. DELETE PRODUCT
  // =========================================

  function deleteProduct(productId) {
    const product = products.find((item) => item.id === productId);

    if (!product) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete "' + product.name + '"?'
    );

    if (!confirmed) return;

    const previousProducts = [...products];

    products = products.filter(
      (item) => item.id !== productId
    );

    if (!saveProducts()) {
      products = previousProducts;
      return;
    }

    renderProducts();
  }

  // =========================================
  // 13. SIDEBAR ACTIVE LINKS
  // =========================================

  function updateSellerNavState() {
    const seller = getLoggedSeller();
    const sellerNavLink = document.getElementById("sellerNavLink");
    const sellerNavLabel = sellerNavLink && sellerNavLink.querySelector(".seller-menu-label");
    const sellerStoreName = document.getElementById("sellerStoreName");
    const sellerAvatar = document.getElementById("sellerAvatar");
    const welcomeStoreName = document.getElementById("welcomeStoreName");
    const storeName = seller && seller.storeName ? seller.storeName : "Seller Store";

    if (sellerStoreName) {
      sellerStoreName.textContent = storeName;
    }

    if (sellerAvatar) {
      sellerAvatar.textContent = storeName.trim().charAt(0).toUpperCase() || "S";
    }

    if (welcomeStoreName) {
      welcomeStoreName.textContent = (seller && seller.fullName) ? seller.fullName : storeName;
    }

    if (sellerNavLabel) {
      sellerNavLabel.textContent = seller ? storeName : "Become a seller";
    }
  }

  const loggedSeller = getLoggedSeller();
  if (!loggedSeller) {
    window.location.href = "../Login page/login.html";
  }

  updateSellerNavState();

  const sideLinks = document.querySelectorAll(".side-link");

  sideLinks.forEach((link) => {
    link.addEventListener("click", () => {
      sideLinks.forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");
    });
  });

  const currentSectionLink = [...sideLinks].find(
    (link) => link.getAttribute("href") === window.location.hash
  );

  if (currentSectionLink) {
    sideLinks.forEach((link) => link.classList.remove("active"));
    currentSectionLink.classList.add("active");
  }

  // =========================================
  // 14. INITIAL RENDER
  // =========================================

  renderProducts();

});

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
