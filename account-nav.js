(() => {
  const profileLink = document.querySelector('.nav-icons a[aria-label="Profile"]');
  if (!profileLink) return;

  const accountUrl = new URL(profileLink.getAttribute("href"), window.location.href);
  accountUrl.search = "";
  accountUrl.hash = "";
  const registerUrl = new URL("../Costumer register/customer-register.html", accountUrl);
  const loginUrl = new URL("../Login page/login.html?role=customer", accountUrl);
  const homeUrl = new URL("../Homepage/index.html", accountUrl);
  const notificationsUrl = new URL(accountUrl.href);
  notificationsUrl.hash = "messages";
  const messagesPageUrl = new URL(accountUrl.href);
  messagesPageUrl.hash = "messages";
  const navIcons = profileLink.closest(".nav-icons");
  if (!navIcons) return;

  let isCustomerLoggedIn = false;
  let hasSavedCustomerAccount = false;
  try {
    const session = JSON.parse(localStorage.getItem("noireLoggedInCustomer") || "null");
    const account = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
    const sessionEmail = String(session?.email || "").trim().toLowerCase();
    const accountEmail = String(account?.profile?.email || "").trim().toLowerCase();
    isCustomerLoggedIn = Boolean(sessionEmail && sessionEmail === accountEmail);

    const savedCustomers = JSON.parse(localStorage.getItem("noireCustomerAccounts") || "[]");
    const savedEmail = String(
      localStorage.getItem("noireCustomerLastEmail") || accountEmail
    ).trim().toLowerCase();
    hasSavedCustomerAccount = Boolean(
      (savedEmail && Array.isArray(savedCustomers) && savedCustomers.some(customer =>
        customer && String(customer.email || "").trim().toLowerCase() === savedEmail
      )) ||
      (accountEmail && Array.isArray(savedCustomers) && savedCustomers.some(customer =>
        customer && String(customer.email || "").trim().toLowerCase() === accountEmail
      ))
    );
  } catch (error) {
    console.error("Unable to read customer navigation state.", error);
  }

  let plusLink = navIcons.querySelector('[data-noire-account-icon="register"]');
  if (!plusLink) {
    plusLink = document.createElement("a");
    plusLink.dataset.noireAccountIcon = "register";
    plusLink.setAttribute("aria-label", "Register or log in as a customer");
    plusLink.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
    profileLink.insertAdjacentElement("beforebegin", plusLink);
  }
  plusLink.href = hasSavedCustomerAccount ? loginUrl.href : registerUrl.href;

  const profileMenu = document.createElement("div");
  profileMenu.className = "customer-account-menu";
  const profileTrigger = document.createElement("button");
  profileTrigger.type = "button";
  profileTrigger.className = "customer-profile-trigger";
  profileTrigger.setAttribute("aria-label", "Customer account menu");
  profileTrigger.setAttribute("aria-haspopup", "true");
  profileTrigger.setAttribute("aria-expanded", "false");
  profileTrigger.setAttribute("aria-controls", "customerProfileDropdown");
  profileTrigger.innerHTML = profileLink.innerHTML;

  const dropdown = document.createElement("div");
  dropdown.className = "customer-profile-dropdown";
  dropdown.id = "customerProfileDropdown";
  dropdown.setAttribute("aria-label", "Customer account");
  dropdown.hidden = true;
  const menuItems = [
    ["profile", "Manage My Account", "fa-regular fa-user"],
    ["orders", "My Orders", "fa-solid fa-box"],
    ["reviews", "My Reviews", "fa-regular fa-star"],
    ["stores", "My Followed Stores", "fa-solid fa-store"],
    ["returns", "My Returns & Cancellations", "fa-solid fa-arrow-rotate-left"]
  ];
  menuItems.forEach(([page, label, icon]) => {
    const link = document.createElement("a");
    link.href = `${accountUrl.href}#${page}`;
    link.dataset.customerDestination = page;
    link.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
    dropdown.append(link);
  });
  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "customer-profile-logout";
  logoutButton.innerHTML = '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Logout</span>';
  dropdown.append(logoutButton);
  profileMenu.append(profileTrigger, dropdown);
  profileLink.replaceWith(profileMenu);

  const setVisible = (element, visible) => {
    element.hidden = !visible;
    element.style.display = visible ? "" : "none";
  };
  setVisible(plusLink, !isCustomerLoggedIn);
  setVisible(profileMenu, isCustomerLoggedIn);

  const closeMenu = () => {
    profileMenu.classList.remove("open", "hover-open");
    dropdown.hidden = true;
    profileTrigger.setAttribute("aria-expanded", "false");
  };
  const openMenu = () => {
    profileMenu.classList.add("open", "hover-open");
    dropdown.hidden = false;
    profileTrigger.setAttribute("aria-expanded", "true");
  };
  const hoverPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const desktopHover = () => hoverPointer.matches && window.matchMedia("(min-width: 961px)").matches;
  let closeTimer;
  const cancelClose = () => window.clearTimeout(closeTimer);
  profileMenu.addEventListener("pointerenter", event => {
    if (!desktopHover() || event.pointerType === "touch") return;
    cancelClose();
    openMenu();
  });
  profileMenu.addEventListener("pointerleave", event => {
    if (!desktopHover() || event.pointerType === "touch") return;
    cancelClose();
    closeTimer = window.setTimeout(closeMenu, 250);
  });
  profileMenu.addEventListener("focusin", event => {
    if (event.target.matches(":focus-visible")) openMenu();
  });
  profileMenu.addEventListener("focusout", event => {
    if (profileMenu.contains(event.relatedTarget) || profileMenu.matches(":hover")) return;
    cancelClose();
    closeTimer = window.setTimeout(closeMenu, 250);
  });
  profileTrigger.addEventListener("click", event => {
    if (desktopHover() && event.detail > 0) return;
    if (dropdown.hidden) openMenu();
    else closeMenu();
  });
  document.addEventListener("click", event => {
    if (!profileMenu.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !dropdown.hidden) {
      closeMenu();
      profileTrigger.focus();
    }
  });
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("noireLoggedInCustomer");
    localStorage.removeItem("noireLoginAccountType");
    window.location.href = homeUrl.href;
  });

  const wishlistLink = navIcons.querySelector('a[aria-label="Wishlist"]');
  if (wishlistLink) setVisible(wishlistLink, isCustomerLoggedIn);

  let notificationLink = navIcons.querySelector(
    '.customer-message-link, a[aria-label="Notifications"], [data-noire-account-icon="notifications"]'
  );
  if (!notificationLink) {
    notificationLink = document.createElement("a");
    notificationLink.dataset.noireAccountIcon = "notifications";
    notificationLink.innerHTML = '<i class="fa-regular fa-bell" aria-hidden="true"></i>';
    profileMenu.insertAdjacentElement("afterend", notificationLink);
  }
  notificationLink.href = notificationsUrl.href;
  notificationLink.setAttribute("aria-label", "Notifications");
  setVisible(notificationLink, isCustomerLoggedIn);
  if (wishlistLink) {
    navIcons.insertBefore(notificationLink, wishlistLink);
  } else {
    profileMenu.insertAdjacentElement("afterend", notificationLink);
  }

  const notificationBadge = notificationLink.querySelector(
    ".customer-message-count, .customer-nav-message-count"
  ) || document.createElement("span");
  notificationBadge.classList.add("customer-nav-message-count");
  notificationBadge.id ||= "customerMessageCount";
  notificationBadge.hidden = true;
  if (!notificationBadge.isConnected) notificationLink.append(notificationBadge);
  if (!notificationLink.querySelector(".customer-message-count")) {
    notificationLink.classList.add("customer-message-link");
  }

  function getCustomerId() {
    try {
      const account = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
      const email = String(account?.profile?.email || "").trim().toLowerCase();
      if (email) return `customer:${email}`;
      let guestId = localStorage.getItem("noireCustomerChatId");
      if (!guestId) {
        guestId = typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("noireCustomerChatId", guestId);
      }
      return `guest:${guestId}`;
    } catch (error) {
      console.error("Unable to read customer message identity.", error);
      return "";
    }
  }

  function updateCustomerUnreadCount() {
    if (!isCustomerLoggedIn) {
      notificationBadge.hidden = true;
      notificationBadge.textContent = "";
      return;
    }
    try {
      const customerId = getCustomerId();
      const sellers = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
      if (!customerId || !Array.isArray(sellers)) {
        throw new Error("Saved customer message data is invalid.");
      }
      const unreadCount = sellers.reduce((total, seller) => {
        const sellerEmail = String(seller?.email || "").trim().toLowerCase();
        if (!sellerEmail) return total;

        const messages = JSON.parse(localStorage.getItem(`noireStoreChat_${sellerEmail}`) || "[]");
        const receipts = JSON.parse(localStorage.getItem(`noireCustomerChatRead_${sellerEmail}`) || "{}");
        if (!Array.isArray(messages) || !receipts || typeof receipts !== "object" || Array.isArray(receipts)) {
          throw new Error("Saved customer message notifications are invalid.");
        }
        const readAt = Number(receipts[customerId]) || 0;
        return total + messages.filter(message => {
          if (!message || message.sender !== "seller" || message.customerId !== customerId) return false;
          const timestamp = new Date(message.createdAt).getTime();
          return Number.isFinite(timestamp) && timestamp > readAt;
        }).length;
      }, 0);

      notificationBadge.hidden = unreadCount === 0;
      notificationBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      notificationBadge.setAttribute(
        "aria-label",
        unreadCount ? `${unreadCount} unread seller replies` : "No unread seller replies"
      );
    } catch (error) {
      notificationBadge.hidden = true;
      notificationBadge.textContent = "";
      console.error("Unable to update customer message count.", error);
    }
  }

  updateCustomerUnreadCount();
  window.addEventListener("storage", event => {
    if (!event.key || event.key.startsWith("noireStoreChat_") ||
      event.key.startsWith("noireCustomerChatRead_") ||
      event.key === "noireSellerAccounts" ||
      event.key === "noireCustomerAccount_v1") {
      updateCustomerUnreadCount();
    }
  });
  window.addEventListener("noireCustomerMessagesUpdated", updateCustomerUnreadCount);
  if (window.location.href === messagesPageUrl.href) updateCustomerUnreadCount();
})();
