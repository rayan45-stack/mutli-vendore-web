(() => {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const hamburger = $("#hamburger");
  const navLinks = $("#navLinks");
  const searchToggle = $("#searchToggle");
  const mobileSearchBox = $("#mobileSearchBox");
  const categoriesToggle = $("#categoriesToggle");
  const categoriesDropdown = $(".nav-dropdown");
  const sellerAccountMenu = $("#sellerAccountMenu");
  const sellerMenuButton = $("#sellerNavLink");
  const sellerDropdown = $("#sellerDropdown");
  let seller;

  try {
    seller = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
  } catch (error) {
    seller = null;
  }

  if (!seller || !seller.email) {
    window.location.href = "../../Login page/login.html";
    return;
  }

  const storeName = seller.storeName || "Seller Store";
  const sellerStoreName = $("#sellerStoreName");
  const sellerAvatar = $("#sellerAvatar");
  const sellerNavLabel = sellerMenuButton && $(".seller-menu-label", sellerMenuButton);
  if (sellerStoreName) sellerStoreName.textContent = storeName;
  if (sellerAvatar) sellerAvatar.textContent = storeName.trim().charAt(0).toUpperCase() || "S";
  if (sellerNavLabel) sellerNavLabel.textContent = storeName;
  if (sellerAccountMenu) sellerAccountMenu.classList.add("is-logged-in");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      const opened = navLinks.classList.toggle("show");
      hamburger.setAttribute("aria-expanded", String(opened));
      hamburger.innerHTML = opened ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
  }
  if (searchToggle && mobileSearchBox) {
    searchToggle.addEventListener("click", () => {
      mobileSearchBox.classList.toggle("show-search");
      if (mobileSearchBox.classList.contains("show-search")) $("input", mobileSearchBox)?.focus();
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
  if (sellerMenuButton && sellerDropdown) {
    sellerMenuButton.addEventListener("click", () => {
      const opened = sellerDropdown.hidden;
      sellerDropdown.hidden = !opened;
      sellerMenuButton.setAttribute("aria-expanded", String(opened));
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#sellerAccountMenu")) {
        sellerDropdown.hidden = true;
        sellerMenuButton.setAttribute("aria-expanded", "false");
      }
    });
  }
  document.querySelectorAll("#searchForm, #mobileSearchBox").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = $("input", form)?.value.trim();
      if (query) window.location.href = `../../Shoppage/shop.html?search=${encodeURIComponent(query)}`;
    });
  });
  const date = $("#currentDate");
  if (date) date.textContent = new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  const ordersTableBody = $("#sellerOrdersBody");
  const ordersCount = $("#ordersCount");
  const ordersMessage = $("#ordersMessage");
  const ordersPagination = $("#ordersPagination");
  const ordersRange = $("#ordersRange");
  const ordersPageNumber = $("#ordersPageNumber");
  const previousOrdersPage = $("#previousOrdersPage");
  const nextOrdersPage = $("#nextOrdersPage");
  const ordersPerPage = 20;
  const requestAutoDecisionMs = 24 * 60 * 60 * 1000;
  let requestDecisionTimer = null;
  let currentPage = 1;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const readOrders = () => {
    const orders = JSON.parse(localStorage.getItem("noireCustomerOrders") || "[]");
    if (!Array.isArray(orders)) throw new Error("Saved order data is invalid.");
    return orders;
  };
  const itemStatus = (item, order) => {
    const status = String(item.fulfillmentStatus || item.status || order.status || "Processing");
    return status === "Demo order" || status === "Order placed" ? "Processing" : status;
  };
  const getReturnWindowDays = item => {
    const sellerAccounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
    if (!Array.isArray(sellerAccounts)) throw new Error("Seller account data is invalid.");
    const sellerRecord = sellerAccounts.find(account =>
      normalizeEmail(account?.email) === normalizeEmail(item.sellerEmail)
    );
    const policy = String(item.returnPolicyAtPurchase ?? sellerRecord?.settings?.returnPolicy ?? "No returns");
    const match = policy.match(/^(\d+)\s+days?\s+return$/i);
    return match ? Number(match[1]) : 0;
  };
  const processAutomaticRequests = orders => {
    let changed = false;
    const now = Date.now();
    orders.forEach(order => (Array.isArray(order.items) ? order.items : []).forEach(item => {
      ["cancelRequest", "returnRequest"].forEach(key => {
        const request = item[key];
        if (!request || request.status !== "Pending") return;
        const requestedAt = Date.parse(request.requestedAt || "");
        if (!Number.isFinite(requestedAt) || now - requestedAt < requestAutoDecisionMs) return;
        let approved;
        if (request.type === "cancel") {
          approved = !["Cancelled", "Shipped", "Delivered"].includes(itemStatus(item, order));
        } else if (request.type === "return") {
          const deliveredAt = Date.parse(item.deliveredAt || order.deliveredAt || "");
          const days = getReturnWindowDays(item);
          approved = itemStatus(item, order) === "Delivered" && days > 0 &&
            Number.isFinite(deliveredAt) && now <= deliveredAt + days * 86400000;
        } else {
          return;
        }
        request.status = approved ? "Approved" : "Rejected";
        request.sellerNote = approved
          ? "Automatically approved after 24 hours without seller response."
          : "Automatically rejected after 24 hours because the request is no longer eligible.";
        request.reviewedAt = new Date(now).toISOString();
        if (approved && request.type === "cancel") item.fulfillmentStatus = "Cancelled";
        changed = true;
      });
    }));
    return changed;
  };
  const scheduleAutomaticRequestDecision = orders => {
    if (requestDecisionTimer !== null) clearTimeout(requestDecisionTimer);
    const dueTimes = orders.flatMap(order => (Array.isArray(order.items) ? order.items : []).flatMap(item =>
      [item.cancelRequest, item.returnRequest]
        .filter(request => request && request.status === "Pending")
        .map(request => Date.parse(request.requestedAt || "") + requestAutoDecisionMs)
        .filter(Number.isFinite)
    ));
    if (!dueTimes.length) return;
    const delay = Math.max(0, Math.min(...dueTimes) - Date.now());
    requestDecisionTimer = setTimeout(renderOrders, Math.min(delay, 2147483647));
  };
  const formatDate = value => {
    const dateValue = value ? new Date(value) : null;
    return dateValue && !Number.isNaN(dateValue.getTime())
      ? dateValue.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
      : "—";
  };
  const itemRows = () => readOrders().flatMap(order =>
    (Array.isArray(order.items) ? order.items : []).flatMap((item, itemIndex) =>
      normalizeEmail(item.sellerEmail) === normalizeEmail(seller.email)
        ? [{ order, item, itemIndex }]
        : []
    )
  );
  const requestControls = (order, item, itemIndex) => {
    const request = [item.cancelRequest, item.returnRequest].find(entry => entry && entry.status === "Pending")
      || item.returnRequest
      || item.cancelRequest;
    if (request) {
      const requestLabel = request.type === "return" ? "Return" : "Cancellation";
      const reason = request.reason ? `<small>Reason: ${escapeHtml(request.reason)}</small>` : "";
      const note = request.sellerNote ? `<small>Seller note: ${escapeHtml(request.sellerNote)}</small>` : "";
      const actions = request.status === "Pending"
        ? `<div class="order-actions"><button type="button" data-order-action="approve" data-request-type="${escapeHtml(request.type)}" data-order="${escapeHtml(order.id)}" data-item-index="${itemIndex}">Approve</button><button type="button" data-order-action="reject" data-request-type="${escapeHtml(request.type)}" data-order="${escapeHtml(order.id)}" data-item-index="${itemIndex}">Reject</button></div>`
        : "";
      return `<strong>${requestLabel} request: ${escapeHtml(request.status || "Pending")}</strong>${reason}${note}${actions}`;
    }
    if (itemStatus(item, order) === "Cancelled") return "Cancelled";
    return "No request";
  };
  const renderOrders = () => {
    if (!ordersTableBody || !ordersCount) return;
    try {
      const orders = readOrders();
      if (processAutomaticRequests(orders)) localStorage.setItem("noireCustomerOrders", JSON.stringify(orders));
      scheduleAutomaticRequestDecision(orders);
      const rows = itemRows();
      const totalPages = Math.max(1, Math.ceil(rows.length / ordersPerPage));
      currentPage = Math.min(currentPage, totalPages);
      const startIndex = (currentPage - 1) * ordersPerPage;
      const pageRows = rows.slice(startIndex, startIndex + ordersPerPage);
      ordersTableBody.innerHTML = pageRows.map(({ order, item, itemIndex }) => {
        const status = itemStatus(item, order);
        const badge = status.toLowerCase().replace(/[^a-z]+/g, "-");
        const statusControl = status === "Cancelled"
          ? `<span class="badge ${badge}">${escapeHtml(status)}</span>`
          : `<span class="badge ${badge}">${escapeHtml(status)}</span><select aria-label="Update ${escapeHtml(item.productName || "product")} status" data-order-status data-order="${escapeHtml(order.id)}" data-item-index="${itemIndex}"><option value="" selected disabled>Update status</option><option>Processing</option><option>Shipped</option><option>Delivered</option></select>`;
        return `<tr><td>#${escapeHtml(order.id)}</td><td>${escapeHtml(item.productName || "Product")}<small class="order-subtext">Qty: ${Number(item.quantity) || 1}</small></td><td>${escapeHtml(order.customer?.name || order.shippingAddress?.name || "Customer")}</td><td>${statusControl}</td><td>${formatDate(order.createdAt || order.date)}</td><td class="request-cell">${requestControls(order, item, itemIndex)}</td></tr>`;
      }).join("");
      ordersCount.textContent = `${rows.length} ${rows.length === 1 ? "order item" : "order items"}`;
      if (ordersMessage) ordersMessage.textContent = rows.length ? "" : "No orders for this store have been saved in this browser yet.";
      if (ordersPagination && ordersRange && ordersPageNumber && previousOrdersPage && nextOrdersPage) {
        ordersPagination.hidden = totalPages <= 1;
        const endIndex = Math.min(startIndex + pageRows.length, rows.length);
        ordersRange.textContent = rows.length ? `Showing ${startIndex + 1}-${endIndex} of ${rows.length} order items` : "No orders to display";
        ordersPageNumber.textContent = `Page ${currentPage} of ${totalPages}`;
        previousOrdersPage.disabled = currentPage === 1;
        nextOrdersPage.disabled = currentPage === totalPages;
      }
    } catch (error) {
      if (ordersMessage) ordersMessage.textContent = error instanceof Error ? error.message : "Unable to load saved orders.";
      ordersCount.textContent = "Orders unavailable";
      console.error("Unable to render seller orders:", error);
    }
  };
  if (previousOrdersPage) previousOrdersPage.addEventListener("click", () => {
    if (currentPage > 1) currentPage--;
    renderOrders();
  });
  if (nextOrdersPage) nextOrdersPage.addEventListener("click", () => {
    currentPage++;
    renderOrders();
  });
  const updateOrderItem = (orderId, itemIndex, updater) => {
    const orders = readOrders();
    const order = orders.find(entry => entry && String(entry.id) === String(orderId));
    const item = order && Array.isArray(order.items) ? order.items[Number(itemIndex)] : null;
    if (!item) throw new Error("This order item could not be found.");
    updater(item, order);
    localStorage.setItem("noireCustomerOrders", JSON.stringify(orders));
  };
  ordersTableBody?.addEventListener("change", event => {
    const control = event.target.closest("[data-order-status]");
    if (!control) return;
    try {
      updateOrderItem(control.dataset.order, control.dataset.itemIndex, item => {
        const previousStatus = itemStatus(item, {});
        item.fulfillmentStatus = control.value;
        item.updatedAt = new Date().toISOString();
        if (control.value === "Delivered" && previousStatus !== "Delivered") item.deliveredAt = item.updatedAt;
        if (control.value !== "Delivered") delete item.deliveredAt;
      });
      renderOrders();
    } catch (error) {
      if (ordersMessage) ordersMessage.textContent = error instanceof Error ? error.message : "Unable to update order status.";
    }
  });
  ordersTableBody?.addEventListener("click", event => {
    const button = event.target.closest("[data-order-action]");
    if (!button) return;
    try {
      const action = button.dataset.orderAction;
      const type = button.dataset.requestType;
      const sellerNote = action === "reject" ? "Request declined by seller." : "";
      updateOrderItem(button.dataset.order, button.dataset.itemIndex, item => {
        const key = type === "return" ? "returnRequest" : "cancelRequest";
        const request = item[key];
        if (!request || request.status !== "Pending") throw new Error("This request is no longer pending.");
        request.status = action === "approve" ? "Approved" : "Rejected";
        request.sellerNote = sellerNote;
        request.reviewedAt = new Date().toISOString();
        if (action === "approve" && type === "cancel") item.fulfillmentStatus = "Cancelled";
      });
      renderOrders();
    } catch (error) {
      if (ordersMessage) ordersMessage.textContent = error instanceof Error ? error.message : "Unable to update this request.";
    }
  });
  window.addEventListener("storage", event => {
    if (!event.key || event.key === "noireCustomerOrders") renderOrders();
  });
  renderOrders();

  const logout = $("#sellerLogoutButton");
  if (logout) logout.addEventListener("click", () => {
    localStorage.removeItem("noireLoggedInSeller");
    window.location.href = "../../Login page/login.html";
  });
})();
