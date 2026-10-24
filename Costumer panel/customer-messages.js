(() => {
  const customerId = getCustomerId();
  const messageList = document.getElementById("customerMessagesList");
  const notice = document.getElementById("customerMessagesNotice");
  const accountBadge = document.getElementById("customerMessageCount");
  const sidebarBadge = document.getElementById("customerSidebarMessageCount");
  let previousUnread = 0;
  let hasRendered = false;

  function getCustomerId() {
    try {
      const account = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
      const profile = account && account.profile && typeof account.profile === "object"
        ? account.profile
        : {};
      const email = String(profile.email || "").trim().toLowerCase();
      return email ? `customer:${email}` : getGuestId();
    } catch (error) {
      return "guest:unavailable";
    }
  }

  function getGuestId() {
    try {
      let id = localStorage.getItem("noireCustomerChatId");
      if (!id) {
        id = typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("noireCustomerChatId", id);
      }
      return `guest:${id}`;
    } catch (error) {
      return "guest:unavailable";
    }
  }

  function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  }

  function updateBadge(count) {
    accountBadge.hidden = count === 0;
    accountBadge.textContent = count > 99 ? "99+" : String(count);
    accountBadge.setAttribute("aria-label", count ? `${count} unread seller replies` : "Messages");
    sidebarBadge.hidden = count === 0;
    sidebarBadge.textContent = count > 99 ? "99+" : String(count);
  }

  function getConversations() {
    const sellers = readJson("noireSellerAccounts", []);
    if (!Array.isArray(sellers)) throw new Error("Seller accounts are invalid.");
    return sellers.flatMap(seller => {
      const sellerEmail = String(seller && seller.email || "").trim().toLowerCase();
      if (!sellerEmail) return [];
      const messages = readJson(`noireStoreChat_${sellerEmail}`, []);
      const receipts = readJson(`noireCustomerChatRead_${sellerEmail}`, {});
      if (!Array.isArray(messages) || !receipts || typeof receipts !== "object" || Array.isArray(receipts)) {
        throw new Error("Saved chat notification data is invalid.");
      }
      const customerMessages = messages.filter(message =>
        message && message.customerId === customerId && typeof message.text === "string"
      );
      if (!customerMessages.length) return [];
      const readAt = Number(receipts[customerId]) || 0;
      const unread = customerMessages.filter(message => {
        if (message.sender !== "seller") return false;
        const timestamp = new Date(message.createdAt).getTime();
        return Number.isFinite(timestamp) && timestamp > readAt;
      }).length;
      return [{
        email: sellerEmail,
        name: String(seller.storeName || "Seller Store"),
        messages: customerMessages,
        unread
      }];
    }).sort((first, second) => {
      const firstDate = new Date(first.messages[first.messages.length - 1].createdAt).getTime() || 0;
      const secondDate = new Date(second.messages[second.messages.length - 1].createdAt).getTime() || 0;
      return secondDate - firstDate;
    });
  }

  function markRead(conversation) {
    const key = `noireCustomerChatRead_${conversation.email}`;
    const receipts = readJson(key, {});
    if (!receipts || typeof receipts !== "object" || Array.isArray(receipts)) {
      throw new Error("Saved chat read receipts are invalid.");
    }
    const latestReply = conversation.messages.reduce((latest, message) => {
      if (message.sender !== "seller") return latest;
      const timestamp = new Date(message.createdAt).getTime();
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0);
    if (latestReply > (Number(receipts[customerId]) || 0)) {
      receipts[customerId] = latestReply;
      localStorage.setItem(key, JSON.stringify(receipts));
    }
  }

  function render() {
    try {
      const conversations = getConversations();
      const unread = conversations.reduce((total, conversation) => total + conversation.unread, 0);
      updateBadge(unread);
      if (hasRendered && unread > previousUnread) {
        const toast = document.getElementById("toast");
        toast.textContent = "A seller sent you a new reply.";
        toast.classList.add("show");
        window.setTimeout(() => toast.classList.remove("show"), 3200);
      }
      previousUnread = unread;
      hasRendered = true;
      notice.textContent = conversations.length
        ? ""
        : "No messages yet. Contact a seller from their store page to start a conversation.";
      messageList.replaceChildren();
      conversations.forEach(conversation => {
        const card = document.createElement("article");
        card.className = "customer-message-card";
        const header = document.createElement("header");
        const title = document.createElement("h3");
        title.textContent = conversation.name;
        header.appendChild(title);
        if (conversation.unread) {
          const unreadLabel = document.createElement("span");
          unreadLabel.className = "customer-message-unread";
          unreadLabel.textContent = `${conversation.unread} new`;
          header.appendChild(unreadLabel);
        }
        card.appendChild(header);
        conversation.messages.forEach(message => {
          const item = document.createElement("div");
          item.className = `customer-message-entry${message.sender === "seller" ? " from-seller" : ""}`;
          const sender = document.createElement("b");
          sender.textContent = message.sender === "seller" ? conversation.name : "You";
          const text = document.createElement("p");
          text.textContent = message.text;
          item.append(sender, text);
          card.appendChild(item);
        });
        const link = document.createElement("a");
        link.className = "secondary-btn customer-message-open";
        link.href = `../Shoppage/store/store.html?seller=${encodeURIComponent(conversation.email)}&chat=1`;
        link.textContent = "Open chat";
        link.addEventListener("click", () => {
          try {
            markRead(conversation);
          } catch (error) {
            notice.textContent = "Unable to mark seller replies as read. Check browser storage and try again.";
          }
        });
        card.appendChild(link);
        messageList.appendChild(card);
      });
    } catch (error) {
      updateBadge(0);
      notice.textContent = "Unable to load seller messages. Check browser storage and reload this page.";
      messageList.replaceChildren();
    }
  }

  document.querySelectorAll('[data-page="messages"], [data-goto="messages"]').forEach(link => {
    link.addEventListener("click", () => {
      try {
        const conversations = getConversations();
        conversations.forEach(markRead);
      } catch (error) {
        notice.textContent = "Unable to mark seller replies as read. Check browser storage and try again.";
      }
      window.setTimeout(render, 0);
    });
  });

  window.addEventListener("storage", event => {
    if (!event.key || event.key.startsWith("noireStoreChat_") ||
      event.key.startsWith("noireCustomerChatRead_") || event.key === "noireSellerAccounts") {
      render();
    }
  });

  if (window.location.hash === "#messages") {
    try {
      getConversations().forEach(markRead);
    } catch (error) {
      notice.textContent = "Unable to mark seller replies as read. Check browser storage and try again.";
    }
  }
  render();
})();
