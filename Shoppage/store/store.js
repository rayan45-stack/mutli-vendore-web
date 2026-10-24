(() => {
  const FOLLOW_KEY = "noireCustomerFollowedStores";
  const CART_KEY = "noireCustomerCart";
  const sellerEmail = (new URLSearchParams(window.location.search).get("seller") || "").trim().toLowerCase();
  const chatKey = `noireStoreChat_${sellerEmail}`;
  const chatReadKey = `noireCustomerChatRead_${sellerEmail}`;
  const customerChatId = getCustomerChatIdentity();
  const storeMessage = document.getElementById("storeMessage");
  const profile = document.getElementById("storeProfile");
  const storePanel = document.getElementById("storePanel");
  const storeOverview = document.getElementById("storeOverview");
  const productsSection = document.getElementById("storeProductsSection");
  const productsGrid = document.getElementById("storeProducts");
  const followButton = document.getElementById("followStoreButton");
  const chatButton = document.getElementById("chatSellerButton");
  const chatDialog = document.getElementById("storeChatDialog");
  const chatMessages = document.getElementById("storeChatMessages");
  const chatForm = document.getElementById("storeChatForm");
  const chatInput = document.getElementById("storeChatInput");
  let seller = null;
  let products = [];
  let followedStores = [];

  function getCustomerChatIdentity() {
    try {
      const account = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
      const profile = account && account.profile && typeof account.profile === "object"
        ? account.profile
        : {};
      const email = String(profile.email || "").trim().toLowerCase();
      if (email) return { id: `customer:${email}`, name: String(profile.name || "Customer").trim() || "Customer" };

      let id = localStorage.getItem("noireCustomerChatId");
      if (!id) {
        id = typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("noireCustomerChatId", id);
      }
      return { id: `guest:${id}`, name: String(profile.name || "Guest customer").trim() || "Guest customer" };
    } catch (error) {
      return { id: "guest:unavailable", name: "Guest customer" };
    }
  }

  function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  }

  function money(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-PK");
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showError(text) {
    storeMessage.hidden = false;
    storeMessage.textContent = text;
    profile.hidden = true;
    storePanel.hidden = true;
  }

  function getProductUrl(product) {
    const url = new URL("../product/product.html", window.location.href);
    url.searchParams.set("seller", sellerEmail);
    url.searchParams.set("id", String(product.id));
    return url.href;
  }

  function getRatings(product) {
    const reviews = Array.isArray(product.reviews)
      ? product.reviews.filter(review =>
        review && Number.isInteger(Number(review.rating)) &&
        Number(review.rating) >= 1 && Number(review.rating) <= 5
      )
      : [];
    const average = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
      : 0;
    return { reviews, average };
  }

  function renderProduct(product) {
    const card = element("article", "store-product-card");
    const url = getProductUrl(product);
    const imageArea = element("div", "store-product-image");
    const imageSource = product.image || (Array.isArray(product.images) && product.images[0]) || "";
    if (imageSource) {
      const image = document.createElement("img");
      image.src = imageSource;
      image.alt = product.name || "Product image";
      image.loading = "lazy";
      imageArea.appendChild(image);
    } else {
      const icon = element("i");
      icon.className = "fa-solid fa-box";
      icon.setAttribute("aria-hidden", "true");
      imageArea.appendChild(icon);
    }
    const name = element("a", "store-product-name", product.name || "Untitled product");
    name.href = url;
    const category = element("p", "store-product-category", product.category || "Uncategorized");
    const price = element("p", "store-product-price", money(product.price));
    const { reviews, average } = getRatings(product);
    const rating = element(
      "p",
      "store-product-rating",
      reviews.length
        ? `${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))} ${average.toFixed(1)} · ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`
        : "No reviews yet"
    );
    const link = element("a", "store-product-link", "View product");
    link.href = url;
    card.append(imageArea, name, category, price, rating, link);
    return card;
  }

  function renderFollowState() {
    const isFollowing = followedStores.includes(sellerEmail);
    followButton.classList.toggle("is-following", isFollowing);
    followButton.setAttribute("aria-pressed", String(isFollowing));
    followButton.innerHTML = isFollowing
      ? '<i class="fa-solid fa-heart" aria-hidden="true"></i><span>Following</span>'
      : '<i class="fa-regular fa-heart" aria-hidden="true"></i><span>Follow</span>';
  }

  function formatJoinedDate(value) {
    if (!value) return "—";
    const joined = new Date(value);
    const now = new Date();
    if (Number.isNaN(joined.getTime()) || joined > now) return "—";
    let years = now.getFullYear() - joined.getFullYear();
    let months = now.getMonth() - joined.getMonth();
    let days = now.getDate() - joined.getDate();
    if (days < 0) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
    const elapsedMonths = years * 12 + months;
    if (elapsedMonths < 1) return "Less than a month";
    const elapsedYears = Math.floor(elapsedMonths / 12);
    const remainingMonths = elapsedMonths % 12;
    const parts = [];
    if (elapsedYears) parts.push(`${elapsedYears} ${elapsedYears === 1 ? "year" : "years"}`);
    if (remainingMonths) parts.push(`${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`);
    return parts.join(", ");
  }

  function getFollowerCount() {
    const raw = seller.followerCount ?? seller.followers ??
      (seller.stats && seller.stats.followers);
    if (Array.isArray(raw)) return raw.length.toLocaleString("en-PK");
    const count = Number(raw);
    return raw !== undefined && raw !== null && raw !== "" && Number.isFinite(count) && count >= 0
      ? count.toLocaleString("en-PK")
      : "—";
  }

  function getFollowerCountNumber() {
    const raw = seller.followerCount ?? seller.followers ??
      (seller.stats && seller.stats.followers);
    const count = Array.isArray(raw) ? raw.length : Number(raw);
    return raw !== undefined && raw !== null && raw !== "" && Number.isFinite(count) && count >= 0
      ? count
      : 0;
  }

  function saveLocalFollowerCount(count) {
    const accounts = readJson("noireSellerAccounts", []);
    if (!Array.isArray(accounts)) throw new Error("Seller account list is invalid.");
    const accountIndex = accounts.findIndex(account =>
      account && String(account.email || "").trim().toLowerCase() === sellerEmail
    );
    if (accountIndex < 0) throw new Error("Seller account was not found.");

    const previousAccounts = localStorage.getItem("noireSellerAccounts");
    const updatedSeller = { ...accounts[accountIndex], followerCount: count };
    accounts[accountIndex] = updatedSeller;
    localStorage.setItem("noireSellerAccounts", JSON.stringify(accounts));
    seller = updatedSeller;
    return previousAccounts;
  }

  function renderFollowerCount() {
    const followerCount = getFollowerCount();
    document.getElementById("storeFollowerCount").textContent = followerCount;
    document.getElementById("storeFollowerNote").textContent = followerCount === "—"
      ? "Total follower count is not available in seller records yet."
      : "Follower count saved in this browser.";
    const followerItem = [...document.getElementById("storeMeta").children]
      .find(item => item.querySelector(".fa-users"));
    if (followerItem) followerItem.lastChild.textContent = ` ${followerCount} followers`;
  }

  function getSellerOrderItems() {
    const orders = readJson("noireCustomerOrders", []);
    if (!Array.isArray(orders)) throw new Error("Saved order history is invalid.");
    return orders.flatMap(order => {
      if (!order || !Array.isArray(order.items)) return [];
      return order.items
        .filter(item => item && String(item.sellerEmail || "").trim().toLowerCase() === sellerEmail)
        .map(item => ({ order, item }));
    });
  }

  function getOnTimeShippingRate() {
    const deliveries = getSellerOrderItems().flatMap(({ order, item }) => {
      const status = String(item.status || order.status || "").toLowerCase();
      const deliveredAt = item.deliveredAt || order.deliveredAt;
      const dueAt = item.expectedDeliveryAt || item.deliveryDueAt ||
        order.expectedDeliveryAt || order.deliveryDueAt;
      if (!deliveredAt || !dueAt || !/delivered|complete/.test(status)) return [];
      const deliveredDate = new Date(deliveredAt);
      const dueDate = new Date(dueAt);
      if (Number.isNaN(deliveredDate.getTime()) || Number.isNaN(dueDate.getTime())) return [];
      return [deliveredDate.getTime() <= dueDate.getTime()];
    });
    if (!deliveries.length) return null;
    const onTime = deliveries.filter(Boolean).length;
    return Math.round(onTime / deliveries.length * 100);
  }

  function formatResponseTime(milliseconds) {
    const minutes = Math.max(0, Math.round(milliseconds / 60000));
    if (minutes < 60) return `${minutes} min average`;
    const hours = minutes / 60;
    if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr average`;
    const days = hours / 24;
    return `${Number.isInteger(days) ? days : days.toFixed(1)} day average`;
  }

  function getChatPerformance() {
    const messages = readJson(chatKey, []);
    if (!Array.isArray(messages)) throw new Error("Saved chat history is invalid.");
    const ordered = messages
      .filter(message => message && ["customer", "seller"].includes(message.sender))
      .map(message => ({ ...message, timestamp: new Date(message.createdAt).getTime() }))
      .filter(message => Number.isFinite(message.timestamp))
      .sort((first, second) => first.timestamp - second.timestamp);
    const unanswered = [];
    const responseTimes = [];
    ordered.forEach(message => {
      if (message.sender === "customer") {
        unanswered.push(message.timestamp);
      } else if (unanswered.length) {
        responseTimes.push(message.timestamp - unanswered.shift());
      }
    });
    const customerMessages = ordered.filter(message => message.sender === "customer").length;
    const sellerResponses = customerMessages - unanswered.length;
    return {
      responseTimes,
      responseRate: customerMessages
        ? Math.round(sellerResponses / customerMessages * 100)
        : null
    };
  }

  function showStoreTab(tabName, moveFocus) {
    const tabs = [
      { name: "store", button: document.getElementById("storeTab") },
      { name: "products", button: document.getElementById("productsTab") },
      { name: "profile", button: document.getElementById("profileTab"), panel: document.getElementById("profilePanel") }
    ];
    tabs.forEach(tab => {
      const active = tab.name === tabName;
      tab.button.classList.toggle("active", active);
      tab.button.setAttribute("aria-selected", String(active));
      tab.button.tabIndex = active ? 0 : -1;
    });
    const showingStore = tabName === "store" || tabName === "products";
    storePanel.hidden = !showingStore;
    storePanel.setAttribute("aria-labelledby", `${tabName === "products" ? "products" : "store"}Tab`);
    storeOverview.hidden = tabName === "products";
    productsSection.hidden = !showingStore;
    document.getElementById("profilePanel").hidden = tabName !== "profile";
    if (moveFocus) {
      const activeTab = tabs.find(tab => tab.name === tabName);
      if (activeTab) activeTab.button.focus();
    }
  }

  function setupStoreTabs() {
    const tabs = [
      { name: "store", button: document.getElementById("storeTab") },
      { name: "products", button: document.getElementById("productsTab") },
      { name: "profile", button: document.getElementById("profileTab") }
    ];
    tabs.forEach((tab, index) => {
      tab.button.addEventListener("click", () => showStoreTab(tab.name, false));
      tab.button.addEventListener("keydown", event => {
        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        showStoreTab(tabs[nextIndex].name, true);
      });
    });
  }

  function renderChatMessages() {
    const messages = readJson(chatKey, []);
    if (!Array.isArray(messages)) throw new Error("Saved chat messages are invalid.");
    chatMessages.replaceChildren();
    const customerMessages = messages.filter(message =>
      message && (!message.customerId || message.customerId === customerChatId.id)
    );
    if (!customerMessages.length) {
      chatMessages.appendChild(element("p", "store-chat-empty", `Start a conversation with ${seller.storeName || "this seller"}.`));
      return;
    }

    customerMessages.forEach(message => {
      if (!message || typeof message.text !== "string") return;
      const sender = message.sender === "seller" ? "Seller" : "You";
      const bubble = element("article", `store-chat-message${message.sender === "seller" ? " from-seller" : " from-customer"}`);
      const heading = element("span", "store-chat-sender", sender);
      const content = element("p", "store-chat-text", message.text);
      const time = new Date(message.createdAt);
      const timestamp = element(
        "time",
        "store-chat-time",
        Number.isNaN(time.getTime()) ? "" : time.toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })
      );
      bubble.append(heading, content, timestamp);
      chatMessages.appendChild(bubble);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function updateChatNotification(markRead = false) {
    const badge = document.getElementById("chatSellerUnread");
    try {
      const messages = readJson(chatKey, []);
      const receipts = readJson(chatReadKey, {});
      if (!Array.isArray(messages) || !receipts || typeof receipts !== "object" || Array.isArray(receipts)) {
        throw new Error("Saved chat notification data is invalid.");
      }
      if (markRead) {
        const latestSellerReply = messages.reduce((latest, message) => {
          if (!message || message.sender !== "seller" || message.customerId !== customerChatId.id) return latest;
          const timestamp = new Date(message.createdAt).getTime();
          return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
        }, 0);
        if (latestSellerReply) {
          receipts[customerChatId.id] = latestSellerReply;
          localStorage.setItem(chatReadKey, JSON.stringify(receipts));
        }
      }
      const readAt = Number(receipts[customerChatId.id]) || 0;
      const unread = messages.filter(message => {
        if (!message || message.sender !== "seller" || message.customerId !== customerChatId.id) return false;
        const timestamp = new Date(message.createdAt).getTime();
        return Number.isFinite(timestamp) && timestamp > readAt;
      }).length;
      badge.hidden = unread === 0;
      badge.textContent = unread > 99 ? "99+" : String(unread);
      badge.setAttribute("aria-label", unread ? `${unread} unread seller replies` : "");
    } catch (error) {
      badge.hidden = true;
      document.getElementById("storeNotice").textContent =
        "Seller reply notifications could not be read from this browser.";
    }
  }

  function renderStore() {
    const logo = seller.storeLogo || "";
    const avatar = document.getElementById("storeAvatar");
    if (logo) {
      const image = document.createElement("img");
      image.src = logo;
      image.alt = `${seller.storeName || "Seller"} store logo`;
      avatar.replaceChildren(image);
    } else {
      avatar.textContent = (seller.storeName || "S").trim().charAt(0).toUpperCase() || "S";
    }

    const name = seller.storeName || "Seller Store";
    document.title = `${name} | NOIRÉ`;
    document.getElementById("storeName").textContent = name;
    const settings = seller.settings && typeof seller.settings === "object" ? seller.settings : {};
    const metadata = document.getElementById("storeMeta");
    metadata.replaceChildren();
    const reviewStats = products.reduce((stats, product) => {
      const ratings = getRatings(product).reviews;
      stats.count += ratings.length;
      stats.total += ratings.reduce((sum, review) => sum + Number(review.rating), 0);
      return stats;
    }, { count: 0, total: 0 });
    const sellerRating = reviewStats.count
      ? Math.round((reviewStats.total / reviewStats.count) / 5 * 100)
      : null;
    [
      ["fa-solid fa-tag", String(settings.storeCategory || "").trim()],
      ["fa-solid fa-location-dot", String(settings.storeCity || "").trim()],
      ["fa-solid fa-users", `${getFollowerCount()} followers`],
      ["fa-solid fa-star", sellerRating === null ? "Rating unavailable" : `${sellerRating}% rating`]
    ].forEach(([iconClass, text]) => {
      if (!text) return;
      const item = element("span");
      const icon = element("i");
      icon.className = iconClass;
      item.append(icon, document.createTextNode(text));
      metadata.appendChild(item);
    });
    document.getElementById("storeDescription").textContent =
      String(settings.storeDescription || "").trim() || "Explore products uploaded by this NOIRÉ seller.";

    document.getElementById("storeProductCount").textContent = String(products.length);
    document.getElementById("storeOverviewProductCount").textContent = String(products.length);
    document.getElementById("storeAverageRating").textContent = sellerRating === null ? "—" : `${sellerRating}%`;
    document.getElementById("storeReviewCount").textContent =
      reviewStats.count
        ? `Seller rating · ${reviewStats.count} ${reviewStats.count === 1 ? "review" : "reviews"}`
        : "Seller rating · no reviews yet";
    renderFollowerCount();
    document.getElementById("sellerJoinedDate").textContent = formatJoinedDate(seller.createdAt);
    let shippedRate = null;
    let chatPerformance = { responseTimes: [], responseRate: null };
    try {
      shippedRate = getOnTimeShippingRate();
    } catch (error) {
      document.getElementById("storeFollowerNote").textContent =
        "Seller performance history could not be read from this browser.";
    }
    try {
      chatPerformance = getChatPerformance();
    } catch (error) {
      document.getElementById("sellerChatResponseTime").textContent = "History unavailable";
      document.getElementById("sellerChatResponseRate").textContent = "Unable to read chat history";
    }
    document.getElementById("sellerOnTimeRate").textContent =
      shippedRate === null ? "No shipment data" : `${shippedRate}% on time`;
    const averageResponse = chatPerformance.responseTimes.length
      ? chatPerformance.responseTimes.reduce((sum, duration) => sum + duration, 0) /
        chatPerformance.responseTimes.length
      : null;
    document.getElementById("sellerChatResponseTime").textContent =
      averageResponse === null ? "No replies yet" : formatResponseTime(averageResponse);
    const responseRate = chatPerformance.responseRate;
    document.getElementById("sellerChatResponseRate").textContent =
      responseRate === null ? "Response rate unavailable" : `${responseRate}% response rate`;
    productsGrid.replaceChildren();
    if (products.length) {
      products.forEach(product => productsGrid.appendChild(renderProduct(product)));
      document.getElementById("storeProductsCount").textContent =
        `${products.length} product${products.length === 1 ? "" : "s"}`;
    } else {
      productsGrid.appendChild(element("p", "store-empty-products", "This seller has not uploaded any products yet."));
      document.getElementById("storeProductsCount").textContent = "0 products";
    }
    profile.hidden = false;
    storeMessage.hidden = true;
    showStoreTab("store", false);
    renderFollowState();
    document.getElementById("storeChatTitle").textContent = `Chat with ${name}`;
    const chatAvatar = document.getElementById("chatStoreAvatar");
    chatAvatar.textContent = name.trim().charAt(0).toUpperCase() || "S";
    if (logo) {
      const image = document.createElement("img");
      image.src = logo;
      image.alt = "";
      chatAvatar.replaceChildren(image);
    }
  }

  function updateCartCount() {
    const cart = readJson(CART_KEY, []);
    if (!Array.isArray(cart)) throw new Error("Saved cart data is invalid.");
    const count = cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(counter => {
      counter.textContent = String(count);
    });
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

    const menu = document.getElementById("sellerAccountMenu");
    const trigger = document.getElementById("sellerNavLink");
    const label = trigger.querySelector(".seller-menu-label");
    const dropdown = document.getElementById("sellerDropdown");
    let loggedInSeller = null;
    try {
      loggedInSeller = readJson("noireLoggedInSeller", null);
    } catch (error) {
      loggedInSeller = null;
    }
    function hasReturningSeller() {
      if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
      try {
        const accounts = readJson("noireSellerAccounts", []);
        return Array.isArray(accounts) && accounts.some(account => account && account.email);
      } catch (error) {
        return false;
      }
    }
    if (loggedInSeller && loggedInSeller.email) {
      label.textContent = loggedInSeller.storeName || "Seller Store";
      menu.classList.add("is-logged-in");
    } else if (hasReturningSeller()) {
      label.textContent = "Login";
    }
    const closeDropdown = () => {
      dropdown.hidden = true;
      menu.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    };
    trigger.addEventListener("click", () => {
      if (!loggedInSeller || !loggedInSeller.email) {
        window.location.href = hasReturningSeller() ? menu.dataset.loginUrl : menu.dataset.registerUrl;
        return;
      }
      const open = dropdown.hidden;
      dropdown.hidden = !open;
      menu.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", event => {
      if (!menu.contains(event.target)) closeDropdown();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeCategories();
        closeDropdown();
      }
    });
    document.getElementById("sellerLogoutButton").addEventListener("click", () => {
      localStorage.removeItem("noireLoggedInSeller");
      localStorage.setItem("noireSellerLoggedOut", "true");
      window.location.href = menu.dataset.homeUrl;
    });
  }

  followButton.addEventListener("click", () => {
    let previousAccounts = null;
    let previousFollowedStores = null;
    let accountsUpdated = false;
    try {
      followedStores = readJson(FOLLOW_KEY, []);
      if (!Array.isArray(followedStores)) throw new Error("Follow data is invalid.");
      followedStores = followedStores.map(email => String(email).toLowerCase());
      const index = followedStores.indexOf(sellerEmail);
      previousFollowedStores = localStorage.getItem(FOLLOW_KEY);
      const nextCount = Math.max(0, getFollowerCountNumber() + (index >= 0 ? -1 : 1));
      if (index >= 0) {
        followedStores.splice(index, 1);
      } else {
        followedStores.push(sellerEmail);
      }
      previousAccounts = saveLocalFollowerCount(nextCount);
      accountsUpdated = true;
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(followedStores));
      document.getElementById("storeNotice").textContent = index >= 0
        ? "You unfollowed this store. Its saved follower count was updated."
        : "You are now following this store. Its saved follower count was updated.";
      renderFollowerCount();
      renderFollowState();
    } catch (error) {
      try {
        if (accountsUpdated && previousAccounts !== null) {
          localStorage.setItem("noireSellerAccounts", previousAccounts);
          const accounts = JSON.parse(previousAccounts);
          seller = accounts.find(account =>
            account && String(account.email || "").trim().toLowerCase() === sellerEmail
          ) || seller;
        }
        if (previousFollowedStores === null) {
          localStorage.removeItem(FOLLOW_KEY);
        } else {
          localStorage.setItem(FOLLOW_KEY, previousFollowedStores);
        }
      } catch (rollbackError) {
        document.getElementById("storeNotice").textContent =
          "Unable to update the follower count and restore browser storage. Please reload this page.";
        return;
      }
      document.getElementById("storeNotice").textContent = "Unable to update your followed stores. Check browser storage and try again.";
    }
  });

  chatButton.addEventListener("click", () => {
    const customerEmail = String(customerChatId.id || "").replace(/^customer:/, "").toLowerCase();
    let sellerSessionEmail = "";
    try {
      const sellerSession = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
      sellerSessionEmail = String(sellerSession && sellerSession.email || "").trim().toLowerCase();
    } catch (error) {
      document.getElementById("storeNotice").textContent = "Unable to verify your seller account. Please reload and try again.";
      return;
    }
    if (sellerEmail && (customerEmail === sellerEmail || sellerSessionEmail === sellerEmail)) {
      document.getElementById("storeNotice").textContent = "You cannot chat with your own seller account.";
      return;
    }
    if (window.noireCustomerAuth &&
      !window.noireCustomerAuth.requireCustomer("chat")) return;
    try {
      renderChatMessages();
      updateChatNotification(true);
      chatDialog.showModal();
      chatInput.focus();
    } catch (error) {
      document.getElementById("storeNotice").textContent = "Unable to open chat. Please check browser storage and try again.";
    }
  });
  document.getElementById("closeChatButton").addEventListener("click", () => chatDialog.close());
  chatDialog.addEventListener("click", event => {
    if (event.target === chatDialog) chatDialog.close();
  });
  chatForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) {
      chatInput.focus();
      return;
    }
    try {
      const messages = readJson(chatKey, []);
      if (!Array.isArray(messages)) throw new Error("Saved chat messages are invalid.");
      messages.push({
        sender: "customer",
        customerId: customerChatId.id,
        customerName: customerChatId.name,
        text,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(chatKey, JSON.stringify(messages));
      chatInput.value = "";
      renderChatMessages();
      chatInput.focus();
    } catch (error) {
      document.getElementById("storeNotice").textContent = "Unable to send your message. Please check browser storage and try again.";
    }
  });
  window.addEventListener("storage", event => {
    if (event.key !== chatKey && event.key !== chatReadKey && event.key !== null) return;
    try {
      updateChatNotification(chatDialog.open);
      if (chatDialog.open && event.key !== chatReadKey) renderChatMessages();
    } catch (error) {
      document.getElementById("storeNotice").textContent = "Unable to refresh chat messages from browser storage.";
    }
  });

  function initialize() {
    wireNavigation();
    setupStoreTabs();
    try {
      updateCartCount();
    } catch (error) {
      document.getElementById("storeNotice").textContent = "Your cart count could not be loaded.";
    }
    if (!sellerEmail) {
      showError("This store link is missing a seller identifier. Return to the shop and open a product again.");
      return;
    }
    updateChatNotification();
    try {
      const accounts = readJson("noireSellerAccounts", []);
      if (!Array.isArray(accounts)) throw new Error("Seller account list is invalid.");
      seller = accounts.find(account =>
        account && String(account.email || "").trim().toLowerCase() === sellerEmail
      );
      if (!seller) {
        showError("This seller store could not be found. It may have been removed.");
        return;
      }
      const savedProducts = readJson("noireSellerProducts_" + sellerEmail, []);
      if (!Array.isArray(savedProducts)) throw new Error("Seller product list is invalid.");
      products = savedProducts.filter(product => product && product.id !== undefined && product.id !== null);
      followedStores = readJson(FOLLOW_KEY, []);
      if (!Array.isArray(followedStores)) throw new Error("Follow data is invalid.");
      followedStores = followedStores.map(email => String(email).toLowerCase());
      renderStore();
      if (new URLSearchParams(window.location.search).get("chat") === "1") {
        const resumed = window.noireCustomerAuth &&
          window.noireCustomerAuth.resumePendingAction("chat", () => chatButton.click());
        if (!resumed) chatButton.click();
      }
    } catch (error) {
      showError(error instanceof Error
        ? `Unable to load this store: ${error.message}`
        : "Unable to load this store. Please try again.");
    }
  }

  initialize();
})();
