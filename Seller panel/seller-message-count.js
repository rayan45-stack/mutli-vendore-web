(() => {
  const badges = [...document.querySelectorAll(".message-count")];
  const orderBadges = [...document.querySelectorAll('.side-link[href$="Orders/orders.html"]')]
    .map(link => {
      let badge = link.querySelector(".order-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "order-count";
        badge.hidden = true;
        link.appendChild(badge);
      }
      return badge;
    });

  function updateUnreadCount() {
    if (!badges.length) return;
    let totalUnread = 0;
    try {
      const seller = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
      if (!seller || !seller.email) {
        badges.forEach(badge => {
          badge.hidden = true;
          badge.textContent = "";
        });
        return;
      }

      const email = String(seller.email).trim().toLowerCase();
      const messages = JSON.parse(localStorage.getItem(`noireStoreChat_${email}`) || "[]");
      const receipts = JSON.parse(localStorage.getItem(`noireStoreChatRead_${email}`) || "{}");
      if (!Array.isArray(messages)) throw new Error("Saved chat history is invalid.");
      if (!receipts || typeof receipts !== "object" || Array.isArray(receipts)) {
        throw new Error("Saved chat read receipts are invalid.");
      }

      const unreadByCustomer = new Map();
      messages.forEach(message => {
        if (!message || message.sender !== "customer" || typeof message.text !== "string") return;
        const timestamp = new Date(message.createdAt).getTime();
        if (!Number.isFinite(timestamp)) return;
        const customerId = String(message.customerId || "legacy-customer");
        if (timestamp > (Number(receipts[customerId]) || 0)) {
          unreadByCustomer.set(customerId, (unreadByCustomer.get(customerId) || 0) + 1);
        }
      });
      totalUnread = [...unreadByCustomer.values()].reduce((sum, count) => sum + count, 0);
    } catch (error) {
      console.error("Unable to update seller message count.", error);
    }

    badges.forEach(badge => {
      badge.hidden = totalUnread === 0;
      badge.textContent = totalUnread > 99 ? "99+" : String(totalUnread);
      badge.setAttribute("aria-label", `${totalUnread} unread customer messages`);
    });
  }

  function updateNewOrderCount() {
    if (!orderBadges.length) return;
    try {
      const seller = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
      if (!seller || !seller.email) {
        orderBadges.forEach(badge => {
          badge.hidden = true;
          badge.textContent = "";
        });
        return;
      }

      const sellerEmail = String(seller.email).trim().toLowerCase();
      const orders = JSON.parse(localStorage.getItem("noireCustomerOrders") || "[]");
      if (!Array.isArray(orders)) throw new Error("Saved order data is invalid.");

      const orderItemKeys = orders.flatMap((order, orderIndex) =>
        (Array.isArray(order?.items) ? order.items : [])
          .flatMap((item, itemIndex) =>
            item && String(item.sellerEmail || "").trim().toLowerCase() === sellerEmail
              ? [`${order.id || order.createdAt || order.date || orderIndex}:${itemIndex}`]
              : []
          )
      );
      const seenKey = `noireSellerOrdersSeen_${encodeURIComponent(sellerEmail)}`;
      const seenItems = JSON.parse(localStorage.getItem(seenKey) || "[]");
      if (!Array.isArray(seenItems)) throw new Error("Saved seller order read state is invalid.");
      const seen = new Set(seenItems);

      if (decodeURIComponent(window.location.pathname).toLowerCase().includes("/seller panel/orders/orders.html")) {
        orderItemKeys.forEach(key => seen.add(key));
        localStorage.setItem(seenKey, JSON.stringify([...seen]));
      }

      const unseenCount = orderItemKeys.filter(key => !seen.has(key)).length;
      orderBadges.forEach(badge => {
        badge.hidden = unseenCount === 0;
        badge.textContent = unseenCount > 99 ? "99+" : String(unseenCount);
        badge.setAttribute("aria-label", `${unseenCount} new order items`);
      });
    } catch (error) {
      orderBadges.forEach(badge => {
        badge.hidden = true;
        badge.textContent = "";
      });
      console.error("Unable to update seller order count.", error);
    }
  }

  updateUnreadCount();
  updateNewOrderCount();
  window.addEventListener("storage", event => {
    if (!event.key || event.key.startsWith("noireStoreChat_")) updateUnreadCount();
    if (!event.key || event.key === "noireCustomerOrders" || event.key.startsWith("noireSellerOrdersSeen_")) {
      updateNewOrderCount();
    }
  });
  window.addEventListener("noireSellerMessagesUpdated", updateUnreadCount);
})();
