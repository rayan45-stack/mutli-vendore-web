document.addEventListener("DOMContentLoaded", () => {
  const seller = (() => {
    try {
      return JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
    } catch (error) {
      return null;
    }
  })();
  if (!seller || !seller.email) return;

  const sellerEmail = String(seller.email).trim().toLowerCase();
  const chatKey = `noireStoreChat_${sellerEmail}`;
  const readKey = `noireStoreChatRead_${sellerEmail}`;
  const conversations = document.getElementById("sellerConversations");
  const messagesElement = document.getElementById("sellerConversationMessages");
  const title = document.getElementById("sellerConversationTitle");
  const notice = document.getElementById("sellerInboxNotice");
  const replyForm = document.getElementById("sellerReplyForm");
  const replyInput = document.getElementById("sellerReplyInput");
  const replyButton = document.getElementById("sellerReplyButton");
  const unreadCount = document.getElementById("sellerMessageCount");
  let selectedCustomerId = "";

  function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  }

  function getThreads() {
    const messages = readJson(chatKey, []);
    if (!Array.isArray(messages)) throw new Error("Saved chat history is invalid.");
    const readReceipts = readJson(readKey, {});
    if (!readReceipts || typeof readReceipts !== "object" || Array.isArray(readReceipts)) {
      throw new Error("Saved chat read receipts are invalid.");
    }

    const threads = new Map();
    messages.forEach(message => {
      if (!message || !["customer", "seller"].includes(message.sender) || typeof message.text !== "string") return;
      const customerId = String(message.customerId || "legacy-customer");
      if (!threads.has(customerId)) {
        threads.set(customerId, {
          customerId,
          customerName: String(message.customerName || "Customer").trim() || "Customer",
          messages: [],
          latestTimestamp: 0,
          unreadCount: 0
        });
      }
      const thread = threads.get(customerId);
      const timestamp = new Date(message.createdAt).getTime();
      thread.messages.push(message);
      if (Number.isFinite(timestamp)) {
        thread.latestTimestamp = Math.max(thread.latestTimestamp, timestamp);
        if (message.sender === "customer" && timestamp > (Number(readReceipts[customerId]) || 0)) {
          thread.unreadCount += 1;
        }
      }
      if (message.sender === "customer" && message.customerName) {
        thread.customerName = String(message.customerName).trim() || thread.customerName;
      }
    });
    return [...threads.values()].sort((first, second) => second.latestTimestamp - first.latestTimestamp);
  }

  function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" });
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function markRead(thread) {
    const receipts = readJson(readKey, {});
    receipts[thread.customerId] = Date.now();
    localStorage.setItem(readKey, JSON.stringify(receipts));
    thread.unreadCount = 0;
  }

  function renderMessages(thread) {
    title.textContent = thread.customerName;
    messagesElement.replaceChildren();
    thread.messages.forEach(message => {
      const bubble = makeElement(
        "article",
        `seller-chat-message${message.sender === "seller" ? " from-seller" : " from-customer"}`
      );
      bubble.append(
        makeElement("span", "seller-chat-sender", message.sender === "seller" ? "You" : thread.customerName),
        makeElement("p", "seller-chat-text", message.text),
        makeElement("time", "seller-chat-time", formatTime(message.createdAt))
      );
      messagesElement.appendChild(bubble);
    });
    messagesElement.scrollTop = messagesElement.scrollHeight;
    replyInput.disabled = false;
    replyButton.disabled = false;
  }

  function render() {
    notice.textContent = "";
    try {
      const threads = getThreads();
      conversations.replaceChildren();
      const totalUnread = threads.reduce((total, thread) => total + thread.unreadCount, 0);
      unreadCount.hidden = totalUnread === 0;
      unreadCount.textContent = totalUnread > 99 ? "99+" : String(totalUnread);

      if (!threads.length) {
        conversations.appendChild(makeElement(
          "p",
          "inbox-empty",
          "No customer messages yet. Messages sent to your store will appear here."
        ));
        selectedCustomerId = "";
        title.textContent = "Select a conversation";
        messagesElement.replaceChildren();
        replyInput.disabled = true;
        replyButton.disabled = true;
        return;
      }

      threads.forEach(thread => {
        const latestMessage = thread.messages[thread.messages.length - 1];
        const button = makeElement("button", "inbox-conversation");
        button.type = "button";
        button.classList.toggle("active", thread.customerId === selectedCustomerId);
        button.setAttribute("aria-pressed", String(thread.customerId === selectedCustomerId));
        const header = makeElement("span", "inbox-conversation-header");
        header.append(
          makeElement("strong", "", thread.customerName),
          makeElement("time", "", formatTime(latestMessage.createdAt))
        );
        button.append(
          header,
          makeElement("span", "inbox-conversation-preview", latestMessage.text),
          makeElement("span", "inbox-unread", thread.unreadCount ? `${thread.unreadCount} new` : "")
        );
        button.addEventListener("click", () => {
          try {
            selectedCustomerId = thread.customerId;
            markRead(thread);
            notice.textContent = "";
            render();
          } catch (error) {
            notice.textContent = "Unable to mark this conversation as read. Check available browser storage and try again.";
          }
        });
        conversations.appendChild(button);
      });

      const selectedThread = threads.find(thread => thread.customerId === selectedCustomerId);
      if (selectedThread) {
        renderMessages(selectedThread);
      } else {
        title.textContent = "Select a conversation";
        messagesElement.replaceChildren(makeElement("p", "inbox-empty", "Choose a customer to read and reply to their messages."));
        replyInput.disabled = true;
        replyButton.disabled = true;
      }
    } catch (error) {
      notice.textContent = "Unable to load customer messages. Check this browser's saved chat data and try again.";
      conversations.replaceChildren();
      messagesElement.replaceChildren();
      replyInput.disabled = true;
      replyButton.disabled = true;
    }
  }

  replyForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = replyInput.value.trim();
    if (!text || !selectedCustomerId) return;
    try {
      const messages = readJson(chatKey, []);
      if (!Array.isArray(messages)) throw new Error("Saved chat history is invalid.");
      const customerMessage = messages.find(message =>
        message && String(message.customerId || "legacy-customer") === selectedCustomerId &&
        message.sender === "customer"
      );
      messages.push({
        sender: "seller",
        customerId: selectedCustomerId,
        customerName: customerMessage && customerMessage.customerName
          ? customerMessage.customerName
          : "Customer",
        text,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(chatKey, JSON.stringify(messages));
      replyInput.value = "";
      notice.textContent = "";
      render();
      replyInput.focus();
    } catch (error) {
      notice.textContent = "Unable to send your reply. Check available browser storage and try again.";
    }
  });

  window.addEventListener("storage", event => {
    if (event.key !== chatKey && event.key !== readKey && event.key !== null) return;
    if (event.key === chatKey && selectedCustomerId) {
      try {
        const thread = getThreads().find(item => item.customerId === selectedCustomerId);
        if (thread) markRead(thread);
      } catch (error) {
        notice.textContent = "Unable to refresh saved messages from this browser.";
      }
    }
    render();
  });
  render();
});
