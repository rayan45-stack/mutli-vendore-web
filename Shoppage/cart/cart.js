(() => {
  if (window.noireCustomerAuth &&
    !window.noireCustomerAuth.requireCustomer("cart")) return;
  if (window.noireCustomerAuth) window.noireCustomerAuth.resumePendingAction("cart");
  const CART_KEY = "noireCustomerCart";
  const WISHLIST_KEY = "noireCustomerWishlist";
  const message = document.getElementById("cartMessage");
  const cartItemsElement = document.getElementById("cartItems");
  const unavailableItemsElement = document.getElementById("unavailableItems");
  const unavailableSection = document.getElementById("unavailableSection");
  const selectedKeys = new Set();
  let cart = readCart();

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(saved)) throw new Error("Saved cart is invalid.");
      return saved;
    } catch (error) {
      message.hidden = false;
      message.textContent = "Your saved cart could not be read. Please clear browser storage or try again.";
      return [];
    }
  }

  function money(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-PK");
  }

  function getOptionDetails(item, product) {
    if (item.optionValues && typeof item.optionValues === "object" && !Array.isArray(item.optionValues)) {
      const entries = Object.entries(item.optionValues);
      if (entries.length) return entries
        .map(([name, value]) => `${name}: ${value}`)
        .join(", ");
    }
    return item.optionValue ? `${product.optionName || "Option"}: ${item.optionValue}` : "";
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      return true;
    } catch (error) {
      message.hidden = false;
      message.textContent = "Unable to save your cart. Please check available browser storage.";
      return false;
    }
  }

  function keyFor(item) {
    return `${String(item.sellerEmail || "").toLowerCase()}:${String(item.productId)}:${String(item.optionValue || "")}`;
  }

  function resolveItems() {
    return cart.map((item, index) => {
      try {
        const products = JSON.parse(localStorage.getItem("noireSellerProducts_" + (item.sellerEmail || "")) || "[]");
        const product = Array.isArray(products)
          ? products.find(candidate => candidate && String(candidate.id) === String(item.productId))
          : null;
        return { ...item, index, product: product || null, sellerEmail: String(item.sellerEmail || "").toLowerCase() };
      } catch (error) {
        return { ...item, index, product: null, sellerEmail: String(item.sellerEmail || "").toLowerCase() };
      }
    });
  }

  function isAvailable(item) {
    return Boolean(item.product && Number(item.product.stock) > 0);
  }

  function getSellerName(email) {
    try {
      const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
      const seller = Array.isArray(accounts)
        ? accounts.find(account => account && String(account.email || "").toLowerCase() === email)
        : null;
      return seller && seller.storeName ? seller.storeName : "NOIRÉ Seller";
    } catch (error) {
      return "NOIRÉ Seller";
    }
  }

  function updateCartCount() {
    const count = cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => {
      element.textContent = String(count);
    });
  }

  function createItemRow(item, unavailable) {
    const product = item.product;
    const row = document.createElement("article");
    row.className = `cart-item${unavailable ? " is-unavailable" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cart-item-select";
    checkbox.checked = !unavailable && selectedKeys.has(keyFor(item));
    checkbox.disabled = unavailable;
    checkbox.setAttribute("aria-label", `Select ${product ? product.name : "unavailable product"}`);
    checkbox.addEventListener("change", () => {
      checkbox.checked ? selectedKeys.add(keyFor(item)) : selectedKeys.delete(keyFor(item));
      render();
    });

    const photo = document.createElement("a");
    photo.className = "cart-item-photo";
    if (product && product.image) {
      photo.href = `../product/product.html?seller=${encodeURIComponent(item.sellerEmail)}&id=${encodeURIComponent(item.productId)}`;
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name || "Product image";
      image.loading = "lazy";
      photo.appendChild(image);
    } else {
      const icon = document.createElement("i");
      icon.className = "fa-regular fa-image";
      icon.setAttribute("aria-hidden", "true");
      photo.appendChild(icon);
    }

    const info = document.createElement("div");
    info.className = "cart-item-info";
    const name = document.createElement("a");
    name.className = "cart-item-name";
    name.textContent = product ? product.name || "Untitled product" : "Unavailable product";
    if (product) name.href = `../product/product.html?seller=${encodeURIComponent(item.sellerEmail)}&id=${encodeURIComponent(item.productId)}`;
    const details = document.createElement("p");
    const optionDetails = product ? getOptionDetails(item, product) : "";
    details.className = "cart-item-details";
    details.textContent = product
      ? [product.category, optionDetails].filter(Boolean).join(" · ")
      : "This product is no longer available.";
    const actions = document.createElement("div");
    actions.className = "cart-item-actions";
    const wishlistButton = document.createElement("button");
    wishlistButton.type = "button";
    wishlistButton.className = "icon-action";
    wishlistButton.title = "Move to wishlist";
    wishlistButton.setAttribute("aria-label", "Move to wishlist");
    wishlistButton.innerHTML = '<i class="fa-regular fa-heart" aria-hidden="true"></i>';
    wishlistButton.addEventListener("click", () => moveToWishlist([item]));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-action";
    deleteButton.title = "Remove from cart";
    deleteButton.setAttribute("aria-label", "Remove from cart");
    deleteButton.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
    deleteButton.addEventListener("click", () => removeItems([item]));
    actions.append(wishlistButton, deleteButton);
    info.append(name, details, actions);

    const pricing = document.createElement("div");
    pricing.className = "cart-item-pricing";
    const price = document.createElement("strong");
    price.textContent = product ? money(product.price) : "Unavailable";
    pricing.appendChild(price);
    if (product && Number(product.originalPrice || product.compareAtPrice) > Number(product.price)) {
      const oldPrice = document.createElement("del");
      oldPrice.textContent = money(product.originalPrice || product.compareAtPrice);
      pricing.appendChild(oldPrice);
    }

    if (unavailable) {
      const status = document.createElement("small");
      status.className = "unavailable-label";
      status.textContent = "Unavailable";
      pricing.appendChild(status);
    } else {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const stock = Math.max(0, Number(product.stock) || 0);
      const control = document.createElement("div");
      control.className = "cart-item-quantity";
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.textContent = "−";
      decrease.disabled = quantity <= 1;
      decrease.setAttribute("aria-label", "Decrease quantity");
      decrease.addEventListener("click", () => changeQuantity(item, -1));
      const value = document.createElement("span");
      value.textContent = String(quantity);
      const increase = document.createElement("button");
      increase.type = "button";
      increase.textContent = "+";
      increase.setAttribute("aria-label", "Increase quantity");
      const totalQuantity = cart
        .filter(candidate => candidate.sellerEmail === item.sellerEmail && String(candidate.productId) === String(item.productId))
        .reduce((total, candidate) => total + (Number(candidate.quantity) || 0), 0);
      increase.disabled = totalQuantity >= stock;
      increase.addEventListener("click", () => changeQuantity(item, 1));
      control.append(decrease, value, increase);
      pricing.appendChild(control);
    }
    row.append(checkbox, photo, info, pricing);
    return row;
  }

  function render() {
    const resolved = resolveItems();
    const available = resolved.filter(isAvailable);
    const unavailable = resolved.filter(item => !isAvailable(item));
    const sellerGroups = new Map();
    available.forEach(item => {
      if (!sellerGroups.has(item.sellerEmail)) sellerGroups.set(item.sellerEmail, []);
      sellerGroups.get(item.sellerEmail).push(item);
    });

    cartItemsElement.replaceChildren();
    if (!available.length) {
      const empty = document.createElement("div");
      empty.className = "empty-cart";
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-bag-shopping";
      icon.setAttribute("aria-hidden", "true");
      const title = document.createElement("strong");
      title.textContent = cart.length ? "No available products" : "Your cart is empty";
      const copy = document.createElement("p");
      copy.textContent = cart.length
        ? "Unavailable products are listed below."
        : "Find something lovely for your everyday.";
      const link = document.createElement("a");
      link.href = "../shop.html";
      link.textContent = "Explore the shop";
      empty.append(icon, title, copy, link);
      cartItemsElement.appendChild(empty);
    }
    sellerGroups.forEach((items, sellerEmail) => {
      const group = document.createElement("section");
      group.className = "seller-cart-group";
      const heading = document.createElement("div");
      heading.className = "seller-cart-heading";
      const sellerCheckbox = document.createElement("input");
      sellerCheckbox.type = "checkbox";
      sellerCheckbox.checked = items.every(item => selectedKeys.has(keyFor(item)));
      sellerCheckbox.setAttribute("aria-label", `Select products from ${getSellerName(sellerEmail)}`);
      sellerCheckbox.addEventListener("change", () => {
        items.forEach(item => sellerCheckbox.checked
          ? selectedKeys.add(keyFor(item))
          : selectedKeys.delete(keyFor(item)));
        render();
      });
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-store";
      const sellerName = document.createElement("strong");
      sellerName.textContent = getSellerName(sellerEmail);
      const arrow = document.createElement("i");
      arrow.className = "fa-solid fa-chevron-right seller-chevron";
      heading.append(sellerCheckbox, icon, sellerName, arrow);
      group.appendChild(heading);
      items.forEach(item => group.appendChild(createItemRow(item, false)));
      cartItemsElement.appendChild(group);
    });

    unavailableItemsElement.replaceChildren();
    unavailable.forEach(item => unavailableItemsElement.appendChild(createItemRow(item, true)));
    unavailableSection.hidden = !unavailable.length;
    document.getElementById("unavailableItemCount").textContent = String(unavailable.length);
    document.getElementById("cartItemCount").textContent = `(${cart.length})`;

    const selected = available.filter(item => selectedKeys.has(keyFor(item)));
    const selectedQuantity = selected.reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);
    const subtotal = selected.reduce((total, item) =>
      total + (Number(item.product.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);
    const selectAll = document.getElementById("selectAllItems");
    selectAll.checked = available.length > 0 && selected.length === available.length;
    selectAll.indeterminate = selected.length > 0 && selected.length < available.length;
    document.getElementById("selectableItemCount").textContent = String(available.length);
    document.getElementById("selectedQuantityCount").textContent = String(selectedQuantity);
    document.getElementById("cartSubtotal").textContent = money(subtotal);
    document.getElementById("cartTotal").textContent = money(subtotal);
    document.getElementById("checkoutItemCount").textContent = String(selected.length);
    document.getElementById("checkoutButton").disabled = selected.length === 0;
    document.getElementById("deleteSelectedButton").disabled = selected.length === 0;
    updateCartCount();
  }

  function changeQuantity(item, delta) {
    const current = cart.find(candidate =>
      candidate.sellerEmail === item.sellerEmail &&
      String(candidate.productId) === String(item.productId) &&
      String(candidate.optionValue || "") === String(item.optionValue || "")
    );
    if (!current) return;
    const productItem = resolveItems().find(candidate =>
      candidate.sellerEmail === item.sellerEmail && String(candidate.productId) === String(item.productId)
    );
    const stock = productItem ? Math.max(0, Number(productItem.product && productItem.product.stock) || 0) : 0;
    const otherQuantity = cart
      .filter(candidate =>
        candidate !== current &&
        candidate.sellerEmail === item.sellerEmail &&
        String(candidate.productId) === String(item.productId)
      )
      .reduce((total, candidate) => total + (Number(candidate.quantity) || 0), 0);
    current.quantity = Math.min(
      Math.max(1, stock - otherQuantity),
      Math.max(1, (Number(current.quantity) || 1) + delta)
    );
    if (saveCart()) render();
  }

  function removeItems(items) {
    const indexes = new Set(items.map(item => item.index));
    items.forEach(item => selectedKeys.delete(keyFor(item)));
    cart = cart.filter((item, index) => !indexes.has(index));
    if (saveCart()) render();
  }

  function moveToWishlist(items) {
    try {
      const wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      if (!Array.isArray(wishlist)) throw new Error("Saved wishlist is invalid.");
      const cartIndexes = new Set(items.map(item => item.index));
      const nextCart = cart.filter((item, index) => !cartIndexes.has(index));
      const nextWishlist = wishlist.slice();
      items.forEach(item => {
        if (!item.product) return;
        const exists = nextWishlist.some(saved =>
          saved && String(saved.sellerEmail || "").trim().toLowerCase() === item.sellerEmail &&
          String(saved.productId) === String(item.product.id)
        );
        if (!exists) {
          nextWishlist.push({
            sellerEmail: item.sellerEmail,
            productId: item.product.id,
            name: item.product.name || "Untitled product",
            price: Number(item.product.price) || 0,
            image: item.product.image || "",
            savedAt: new Date().toISOString()
          });
        }
      });
      const previousCart = localStorage.getItem(CART_KEY);
      const previousWishlist = localStorage.getItem(WISHLIST_KEY);
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextWishlist));
      } catch (error) {
        if (previousCart === null) localStorage.removeItem(CART_KEY);
        else localStorage.setItem(CART_KEY, previousCart);
        if (previousWishlist === null) localStorage.removeItem(WISHLIST_KEY);
        else localStorage.setItem(WISHLIST_KEY, previousWishlist);
        throw error;
      }
      items.forEach(item => selectedKeys.delete(keyFor(item)));
      cart = nextCart;
      render();
      message.hidden = false;
      message.textContent = "Selected product(s) moved to your wishlist.";
    } catch (error) {
      message.hidden = false;
      message.textContent = "Unable to update your wishlist. Please check browser storage and try again.";
    }
  }

  document.getElementById("selectAllItems").addEventListener("change", event => {
    resolveItems().filter(isAvailable).forEach(item => event.currentTarget.checked
      ? selectedKeys.add(keyFor(item))
      : selectedKeys.delete(keyFor(item)));
    render();
  });
  document.getElementById("deleteSelectedButton").addEventListener("click", () => {
    removeItems(resolveItems().filter(item => selectedKeys.has(keyFor(item))));
  });
  document.getElementById("deleteUnavailableButton").addEventListener("click", () => {
    removeItems(resolveItems().filter(item => !isAvailable(item)));
  });
  document.getElementById("moveUnavailableButton").addEventListener("click", () => {
    const items = resolveItems().filter(item => !isAvailable(item) && item.product);
    if (!items.length) {
      message.hidden = false;
      message.textContent = "Unavailable product details are no longer available to save.";
      return;
    }
    moveToWishlist(items);
  });
  document.getElementById("voucherForm").addEventListener("submit", event => {
    event.preventDefault();
    const voucherCode = document.getElementById("voucherCode").value.trim();
    document.getElementById("voucherMessage").textContent = voucherCode
      ? "Voucher codes are not configured for this demo."
      : "Enter a voucher code to apply.";
  });
  document.getElementById("checkoutButton").addEventListener("click", () => {
    if (!selectedKeys.size) return;
    const selected = resolveItems().filter(item => selectedKeys.has(keyFor(item)) && isAvailable(item));
    if (!selected.length) {
      message.hidden = false;
      message.textContent = "Select at least one available product before checkout.";
      return;
    }
    const quantitiesByProduct = new Map();
    selected.forEach(item => {
      const key = `${item.sellerEmail}:${item.productId}`;
      quantitiesByProduct.set(key, (quantitiesByProduct.get(key) || 0) + (Number(item.quantity) || 0));
    });
    const stockIssue = selected.some(item =>
      Number(item.product.stock) < quantitiesByProduct.get(`${item.sellerEmail}:${item.productId}`)
    );
    if (stockIssue) {
      message.hidden = false;
      message.textContent = "A product's stock changed. Review your cart quantities before checkout.";
      render();
      return;
    }
    try {
      localStorage.setItem("noireCheckoutDraft", JSON.stringify({
        source: "cart",
        createdAt: new Date().toISOString(),
        items: selected.map(item => ({
          sellerEmail: item.sellerEmail,
          productId: item.productId,
          optionValue: item.optionValue || "",
          optionValues: item.optionValues || {},
          quantity: Number(item.quantity) || 1
        }))
      }));
      window.location.href = "../checkout/checkout.html";
    } catch (error) {
      message.hidden = false;
      message.textContent = "Unable to start checkout. Please check available browser storage.";
    }
  });

  document.getElementById("hamburger").addEventListener("click", event => {
    const button = event.currentTarget;
    const nav = document.getElementById("navLinks");
    const open = nav.classList.toggle("show");
    button.setAttribute("aria-expanded", String(open));
    button.innerHTML = open
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });
  const navLinks = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("show");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  const categoriesToggle = document.getElementById("categoriesToggle");
  const categoriesDropdown = categoriesToggle.closest(".nav-dropdown");
  const closeCategories = () => {
    categoriesDropdown.classList.remove("open");
    categoriesToggle.setAttribute("aria-expanded", "false");
  };
  categoriesToggle.addEventListener("click", () => {
    const open = categoriesDropdown.classList.toggle("open");
    categoriesToggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", event => {
    if (!categoriesDropdown.contains(event.target)) closeCategories();
  });

  const searchToggle = document.getElementById("searchToggle");
  const mobileSearchBox = document.getElementById("mobileSearchBox");
  searchToggle.addEventListener("click", () => {
    const open = mobileSearchBox.classList.toggle("show-search");
    searchToggle.setAttribute("aria-expanded", String(open));
    if (open) mobileSearchBox.querySelector("input").focus();
  });
  document.querySelectorAll("#searchForm, #mobileSearchBox").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const query = form.querySelector("input").value.trim();
      const destination = new URL("../shop.html", window.location.href);
      if (query) destination.searchParams.set("search", query);
      window.location.href = destination.href;
    });
  });

  const sellerAccountMenu = document.getElementById("sellerAccountMenu");
  const sellerNavLink = document.getElementById("sellerNavLink");
  const sellerNavLabel = sellerNavLink.querySelector(".seller-menu-label");
  const sellerDropdown = document.getElementById("sellerDropdown");
  const sellerLogoutButton = document.getElementById("sellerLogoutButton");
  let loggedInSeller = null;
  try {
    const savedSeller = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
    if (savedSeller && savedSeller.email) loggedInSeller = savedSeller;
  } catch (error) {
    loggedInSeller = null;
  }
  function hasReturningSeller() {
    if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
    try {
      const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
      return Array.isArray(accounts) && accounts.some(account => account && account.email);
    } catch (error) {
      return false;
    }
  }
  if (loggedInSeller) {
    sellerNavLabel.textContent = loggedInSeller.storeName || "Seller Store";
    sellerAccountMenu.classList.add("is-logged-in");
  } else if (hasReturningSeller()) {
    sellerNavLabel.textContent = "Login";
  }
  const closeSellerDropdown = () => {
    sellerDropdown.hidden = true;
    sellerAccountMenu.classList.remove("open");
    sellerNavLink.setAttribute("aria-expanded", "false");
  };
  sellerNavLink.addEventListener("click", () => {
    if (!loggedInSeller) {
      window.location.href = hasReturningSeller()
        ? sellerAccountMenu.dataset.loginUrl
        : sellerAccountMenu.dataset.registerUrl;
      return;
    }
    const open = sellerDropdown.hidden;
    sellerDropdown.hidden = !open;
    sellerAccountMenu.classList.toggle("open", open);
    sellerNavLink.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", event => {
    if (!sellerAccountMenu.contains(event.target)) closeSellerDropdown();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeCategories();
    closeSellerDropdown();
    if (!checkoutSection.hidden) checkoutSection.hidden = true;
  });
  sellerLogoutButton.addEventListener("click", () => {
    localStorage.removeItem("noireLoggedInSeller");
    localStorage.setItem("noireSellerLoggedOut", "true");
    window.location.href = sellerAccountMenu.dataset.homeUrl;
  });

  render();
})();
