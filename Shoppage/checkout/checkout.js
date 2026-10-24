(() => {
  if (window.noireCustomerAuth &&
    !window.noireCustomerAuth.requireCustomer("checkout")) return;
  if (window.noireCustomerAuth) window.noireCustomerAuth.resumePendingAction("checkout");
  const DRAFT_KEY = "noireCheckoutDraft";
  const CART_KEY = "noireCustomerCart";
  const ORDERS_KEY = "noireCustomerOrders";
  const ADDRESS_KEY = "noireCustomerShippingAddress";
  const notice = document.getElementById("checkoutNotice");
  const productList = document.getElementById("checkoutProducts");
  const placeOrderButton = document.getElementById("placeOrderButton");
  let draft = null;
  let resolvedItems = [];
  let address = null;

  function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  }

  function showNotice(text) {
    notice.hidden = false;
    notice.textContent = text;
  }

  function money(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-PK");
  }

  function itemKey(item) {
    return `${String(item.sellerEmail || "").toLowerCase()}:${String(item.productId)}:${String(item.optionValue || "")}`;
  }

  function productKey(item) {
    return `${String(item.sellerEmail || "").toLowerCase()}:${String(item.productId)}`;
  }

  function getSellerName(email) {
    const accounts = readJson("noireSellerAccounts", []);
    if (!Array.isArray(accounts)) throw new Error("Seller account data is invalid.");
    const seller = accounts.find(account => account && String(account.email || "").toLowerCase() === email);
    return seller && (seller.storeName || seller.name) ? seller.storeName || seller.name : "NOIRÉ Seller";
  }

  function getActiveSellerAccount() {
    const session = readJson("noireLoggedInSeller", null);
    if (!session || !session.email) return null;
    const accounts = readJson("noireSellerAccounts", []);
    if (!Array.isArray(accounts)) throw new Error("Seller account data is invalid.");
    return accounts.find(account =>
      account && String(account.email || "").trim().toLowerCase() === String(session.email).trim().toLowerCase()
    ) || session;
  }

  function getCheckoutCustomer(shippingAddress) {
    const seller = getActiveSellerAccount();
    if (seller) {
      return {
        name: seller.fullName || seller.name || "",
        email: seller.email || "",
        phone: seller.phone || ""
      };
    }
    const account = readJson("noireCustomerAccount_v1", null);
    const profile = account && account.profile && typeof account.profile === "object"
      ? account.profile
      : {};
    return {
      name: String(profile.name || shippingAddress.name || "").trim(),
      email: String(profile.email || "").trim().toLowerCase(),
      phone: String(profile.phone || "").trim()
    };
  }

  function getReturnPolicy(sellerEmail) {
    const accounts = readJson("noireSellerAccounts", []);
    if (!Array.isArray(accounts)) throw new Error("Seller account data is invalid.");
    const seller = accounts.find(account =>
      account && String(account.email || "").trim().toLowerCase() === String(sellerEmail || "").trim().toLowerCase()
    );
    return String(seller && seller.settings && seller.settings.returnPolicy || "No returns");
  }

  function isOwnSellerProduct(item) {
    const seller = getActiveSellerAccount();
    const sellerEmail = String(seller && seller.email || "").trim().toLowerCase();
    const account = readJson("noireCustomerAccount_v1", null);
    const customerEmail = String(account && account.profile && account.profile.email || "").trim().toLowerCase();
    const productSellerEmail = String(item.sellerEmail || "").trim().toLowerCase();
    return Boolean(productSellerEmail &&
      (sellerEmail === productSellerEmail || customerEmail === productSellerEmail));
  }

  function resolveDraftItems(items) {
    return items.map(item => {
      const sellerEmail = String(item.sellerEmail || "").trim().toLowerCase();
      const quantity = Number(item.quantity);
      if (!sellerEmail || item.productId === undefined || !Number.isInteger(quantity) || quantity < 1) {
        return { ...item, sellerEmail, product: null, invalid: true };
      }

      try {
        const products = readJson("noireSellerProducts_" + sellerEmail, []);
        const product = Array.isArray(products)
          ? products.find(candidate => candidate && String(candidate.id) === String(item.productId))
          : null;
        const stock = Number(product && product.stock);
        return {
          ...item,
          sellerEmail,
          quantity,
          product: product || null,
          unavailable: !product || !Number.isFinite(stock) || stock < 1
        };
      } catch (error) {
        return { ...item, sellerEmail, quantity, product: null, unavailable: true, storageError: true };
      }
    });
  }

  function isPurchaseable(item) {
    return Boolean(
      item.product &&
      !item.unavailable &&
      !item.invalid &&
      Number.isFinite(Number(item.product.price)) &&
      Number(item.product.price) > 0
    );
  }

  function getSubtotal(items) {
    return items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderProduct(item) {
    const product = item.product;
    const row = makeElement("article", `checkout-product${isPurchaseable(item) ? "" : " unavailable"}`);
    const imageWrap = makeElement("div", "checkout-product-image");
    const imageSource = product && (product.image || (Array.isArray(product.images) ? product.images[0] : ""));
    if (imageSource) {
      const image = document.createElement("img");
      image.src = imageSource;
      image.alt = product.name || "Product image";
      image.loading = "lazy";
      imageWrap.appendChild(image);
    } else {
      const icon = makeElement("i");
      icon.className = "fa-regular fa-image";
      imageWrap.appendChild(icon);
    }

    const info = makeElement("div", "checkout-product-info");
    const name = makeElement("h3", "", product ? product.name || "Unnamed product" : "Product unavailable");
    const optionText = item.optionValue ? ` · ${item.optionValue}` : "";
    const detail = makeElement(
      "p",
      "",
      product
        ? `${item.quantity} item${item.quantity === 1 ? "" : "s"}${optionText}`
        : "This product is no longer available."
    );
    info.append(name, detail);

    const priceWrap = makeElement("div", "checkout-product-price");
    if (product && Number.isFinite(Number(product.price))) {
      priceWrap.append(
        makeElement("strong", "", money(Number(product.price) * item.quantity)),
        makeElement("small", "", `${money(product.price)} each`)
      );
    } else {
      priceWrap.append(makeElement("strong", "", "Unavailable"));
    }
    row.append(imageWrap, info, priceWrap);
    return row;
  }

  function renderSummary(items) {
    const available = items.filter(isPurchaseable);
    const summaryProducts = document.getElementById("summaryProducts");
    summaryProducts.replaceChildren();
    available.forEach(item => {
      const row = makeElement("div", "summary-product");
      row.append(
        makeElement("span", "summary-product-name", `${item.product.name || "Product"} × ${item.quantity}`),
        makeElement("strong", "", money(Number(item.product.price) * item.quantity))
      );
      summaryProducts.appendChild(row);
    });

    const count = available.reduce((total, item) => total + item.quantity, 0);
    const subtotal = getSubtotal(available);
    document.getElementById("summaryItemCount").textContent = `${count} item${count === 1 ? "" : "s"}`;
    document.getElementById("itemsTotal").textContent = money(subtotal);
    document.getElementById("orderTotal").textContent = money(subtotal);
    const sellers = new Set(available.map(item => item.sellerEmail));
    document.getElementById("packageCount").textContent = String(Math.max(sellers.size, 1));
    document.getElementById("packageSeller").textContent =
      sellers.size === 1 ? getSellerName([...sellers][0]) : sellers.size ? `${sellers.size} NOIRÉ sellers` : "NOIRÉ sellers";
    placeOrderButton.disabled = !available.length || available.length !== items.length ||
      !validateStock(available) || available.some(isOwnSellerProduct);
  }

  function renderItems() {
    productList.replaceChildren();
    resolvedItems.forEach(item => productList.appendChild(renderProduct(item)));
    renderSummary(resolvedItems);

    if (!resolvedItems.length) {
      showNotice("There are no products in this checkout. Return to your cart or choose a product to buy.");
      placeOrderButton.disabled = true;
    } else if (resolvedItems.some(item => !isPurchaseable(item))) {
      showNotice("One or more products are unavailable. Return to your cart or shop to choose available items.");
    } else if (!validateStock(resolvedItems)) {
      showNotice("One or more quantities exceed the seller's available stock. Update your cart or product quantity.");
    }
  }

  function displayAddress(saved) {
    address = saved;
    const savedAddress = document.getElementById("savedAddress");
    const addressForm = document.getElementById("addressForm");
    const editButton = document.getElementById("editAddressButton");
    if (saved && saved.name && saved.phone && saved.address) {
      document.getElementById("savedCustomerName").textContent = saved.name;
      document.getElementById("savedCustomerPhone").textContent = saved.phone;
      document.getElementById("savedCustomerAddress").textContent = saved.address;
      savedAddress.hidden = false;
      addressForm.hidden = true;
      editButton.hidden = false;
    } else {
      savedAddress.hidden = true;
      addressForm.hidden = false;
      editButton.hidden = true;
      address = null;
      const seller = getActiveSellerAccount();
      if (seller) {
        addressForm.elements.namedItem("name").value = seller.fullName || seller.name || "";
        addressForm.elements.namedItem("phone").value = seller.phone || "";
      }
    }
  }

  function readAddressForm() {
    const form = document.getElementById("addressForm");
    const data = new FormData(form);
    return {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      address: String(data.get("address") || "").trim()
    };
  }

  function persistAddress(value) {
    if (!value.name || !value.phone || !value.address) {
      throw new Error("Enter your name, phone number, and delivery address.");
    }
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(value));
    displayAddress(value);
    return value;
  }

  function validateStock(items) {
    const quantities = new Map();
    items.forEach(item => {
      const key = productKey(item);
      quantities.set(key, (quantities.get(key) || 0) + item.quantity);
    });
    return items.every(item => Number(item.product.stock) >= quantities.get(productKey(item)));
  }

  function updateCartCount() {
    const cart = readJson(CART_KEY, []);
    if (!Array.isArray(cart)) throw new Error("Your saved cart data is invalid.");
    const count = cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => {
      element.textContent = String(count);
    });
  }

  function getCartAfterPurchase(items) {
    const cart = readJson(CART_KEY, []);
    if (!Array.isArray(cart)) throw new Error("Your saved cart data is invalid.");
    const remaining = cart.map(item => ({ ...item }));

    items.forEach(purchased => {
      const index = remaining.findIndex(item => itemKey(item) === itemKey(purchased));
      if (index < 0 || Number(remaining[index].quantity) < purchased.quantity) {
        throw new Error("Your cart changed during checkout. Review it and try again.");
      }
      remaining[index].quantity = Number(remaining[index].quantity) - purchased.quantity;
    });

    return JSON.stringify(remaining.filter(item => item.quantity > 0));
  }

  function showSuccess(order) {
    const layout = document.querySelector(".checkout-layout");
    const success = makeElement("section", "checkout-success");
    const icon = makeElement("i");
    icon.className = "fa-solid fa-circle-check";
    success.append(
      icon,
      makeElement("h2", "", "Demo order placed"),
      makeElement("p", "", `Order ${order.id} has been saved in this browser. No payment was processed.`)
    );
    const link = makeElement("a", "", "Continue shopping");
    link.href = "../shop.html";
    success.appendChild(link);
    layout.replaceChildren(success);
    document.querySelectorAll(".checkout-notice").forEach(element => {
      element.hidden = true;
    });
    document.getElementById("checkoutNotice").hidden = true;
  }

  function placeOrder() {
    if (!resolvedItems.length || resolvedItems.some(item => !isPurchaseable(item))) {
      showNotice("Resolve unavailable products before placing this demo order.");
      return;
    }
    if (resolvedItems.some(isOwnSellerProduct)) {
      showNotice("You cannot purchase products from your own seller account. Remove them from this checkout.");
      placeOrderButton.disabled = true;
      return;
    }
    if (!validateStock(resolvedItems)) {
      showNotice("A product's stock changed. Return to the cart or product page and update the quantity.");
      placeOrderButton.disabled = true;
      return;
    }

    const form = document.getElementById("addressForm");
    let shippingAddress = address;
    if (!shippingAddress) {
      if (!form.reportValidity()) return;
      shippingAddress = readAddressForm();
    }

    try {
      const latestItems = resolveDraftItems(draft.items);
      if (latestItems.some(item => !isPurchaseable(item)) || !validateStock(latestItems)) {
        showNotice("Product availability or stock changed. Review the checkout before placing your order.");
        resolvedItems = latestItems;
        renderItems();
        return;
      }
      shippingAddress = persistAddress(shippingAddress);

      const orders = readJson(ORDERS_KEY, []);
      if (!Array.isArray(orders)) throw new Error("Saved order data is invalid.");
      const order = {
        id: `NR-${Date.now()}`,
        createdAt: new Date().toISOString(),
        source: draft.source,
        status: "Demo order",
        customer: getCheckoutCustomer(shippingAddress),
        paymentMethod: document.getElementById("paymentMethod").value,
        shippingAddress,
        items: latestItems.map((item, index) => ({
          id: `NR-${Date.now()}-${index}`,
          sellerEmail: item.sellerEmail,
          productId: item.productId,
          productName: item.product.name,
          optionValue: item.optionValue || "",
          optionValues: item.optionValues || {},
          quantity: item.quantity,
          unitPrice: Number(item.product.price),
          subtotal: Number(item.product.price) * item.quantity,
          fulfillmentStatus: "Processing",
          returnPolicyAtPurchase: getReturnPolicy(item.sellerEmail)
        })),
        itemsTotal: getSubtotal(latestItems),
        deliveryFee: null,
        platformFee: null,
        total: getSubtotal(latestItems)
      };
      orders.unshift(order);
      const previousOrders = localStorage.getItem(ORDERS_KEY);
      const nextCart = draft.source === "cart" ? getCartAfterPurchase(latestItems) : null;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      try {
        if (nextCart !== null) localStorage.setItem(CART_KEY, nextCart);
      } catch (error) {
        if (previousOrders === null) localStorage.removeItem(ORDERS_KEY);
        else localStorage.setItem(ORDERS_KEY, previousOrders);
        throw error;
      }
      localStorage.removeItem(DRAFT_KEY);
      updateCartCount();
      showSuccess(order);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to save your demo order.");
    }
  }

  function wireNavigation() {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");
    hamburger.addEventListener("click", () => {
      const open = navLinks.classList.toggle("show");
      hamburger.setAttribute("aria-expanded", String(open));
      hamburger.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
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
    let loggedInSeller = null;
    try {
      const savedSeller = readJson("noireLoggedInSeller", null);
      if (savedSeller && savedSeller.email) loggedInSeller = savedSeller;
    } catch (error) {
      showNotice("Seller account details could not be read from browser storage.");
    }
    const hasReturningSeller = () => {
      if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
      try {
        const accounts = readJson("noireSellerAccounts", []);
        return Array.isArray(accounts) && accounts.some(account => account && account.email);
      } catch (error) {
        return false;
      }
    };
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
      if (event.key === "Escape") {
        closeCategories();
        closeSellerDropdown();
      }
    });
    document.getElementById("sellerLogoutButton").addEventListener("click", () => {
      localStorage.removeItem("noireLoggedInSeller");
      localStorage.setItem("noireSellerLoggedOut", "true");
      window.location.href = sellerAccountMenu.dataset.homeUrl;
    });
  }

  function initialize() {
    wireNavigation();
    document.getElementById("promotionForm").addEventListener("submit", event => {
      event.preventDefault();
      const code = event.currentTarget.elements.code.value.trim();
      document.getElementById("promotionMessage").textContent = code
        ? "Promotion codes are not configured for this demo."
        : "Enter a promotion code to apply.";
    });
    document.getElementById("addressForm").addEventListener("submit", event => {
      event.preventDefault();
      const message = document.getElementById("addressMessage");
      try {
        persistAddress(readAddressForm());
        message.classList.remove("error");
        message.textContent = "Delivery details saved on this device.";
      } catch (error) {
        message.classList.add("error");
        message.textContent = error instanceof Error ? error.message : "Unable to save delivery details.";
      }
    });
    document.getElementById("editAddressButton").addEventListener("click", () => {
      document.getElementById("savedAddress").hidden = true;
      const form = document.getElementById("addressForm");
      form.hidden = false;
      form.elements.namedItem("name").value = address.name;
      form.elements.namedItem("phone").value = address.phone;
      form.elements.namedItem("address").value = address.address;
      document.getElementById("editAddressButton").hidden = true;
      address = null;
    });
    try {
      const seller = getActiveSellerAccount();
      const email = document.getElementById("checkoutCustomerEmail");
      if (seller && email) email.textContent = `Seller account: ${seller.email}`;
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Seller account details could not be read.");
    }
    placeOrderButton.addEventListener("click", placeOrder);

    try {
      updateCartCount();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Your cart count could not be loaded.");
    }

    try {
      draft = readJson(DRAFT_KEY, null);
      if (!draft || !["buy-now", "cart"].includes(draft.source) || !Array.isArray(draft.items) || !draft.items.length) {
        showNotice("Checkout details are missing or invalid. Return to your cart or choose a product to buy.");
        placeOrderButton.disabled = true;
        return;
      }
      resolvedItems = resolveDraftItems(draft.items);
      renderItems();
      if (resolvedItems.some(isOwnSellerProduct)) {
        showNotice("You cannot purchase products from your own seller account. Remove them from this checkout.");
        placeOrderButton.disabled = true;
      }
      const savedAddress = readJson(ADDRESS_KEY, null);
      displayAddress(savedAddress);
    } catch (error) {
      showNotice(error instanceof Error ? `Checkout data could not be loaded: ${error.message}` : "Checkout data could not be loaded.");
      placeOrderButton.disabled = true;
    }
  }

  initialize();
})();
