(() => {
  const profileLink = document.querySelector('.nav-icons a[aria-label="Profile"]');
  if (!profileLink) return;

  const accountUrl = new URL(profileLink.getAttribute("href"), window.location.href);
  accountUrl.search = "";
  accountUrl.hash = "";
  const registerUrl = new URL("../Costumer register/customer-register.html", accountUrl);
  const notificationsUrl = new URL(accountUrl.href);
  notificationsUrl.hash = "messages";
  const navIcons = profileLink.closest(".nav-icons");
  if (!navIcons) return;

  let isCustomerLoggedIn = false;
  try {
    const session = JSON.parse(localStorage.getItem("noireLoggedInCustomer") || "null");
    const account = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
    const sessionEmail = String(session?.email || "").trim().toLowerCase();
    const accountEmail = String(account?.profile?.email || "").trim().toLowerCase();
    isCustomerLoggedIn = Boolean(sessionEmail && sessionEmail === accountEmail);
  } catch (error) {
    console.error("Unable to read customer navigation state.", error);
  }

  let plusLink = navIcons.querySelector('[data-noire-account-icon="register"]');
  if (!plusLink) {
    plusLink = document.createElement("a");
    plusLink.dataset.noireAccountIcon = "register";
    plusLink.setAttribute("aria-label", "Register or log in as a customer");
    plusLink.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
    plusLink.href = registerUrl.href;
    profileLink.insertAdjacentElement("beforebegin", plusLink);
  }
  const setVisible = (element, visible) => {
    element.hidden = !visible;
    element.style.display = visible ? "" : "none";
  };
  setVisible(plusLink, !isCustomerLoggedIn);
  setVisible(profileLink, isCustomerLoggedIn);

  const wishlistLink = navIcons.querySelector('a[aria-label="Wishlist"]');
  if (wishlistLink) setVisible(wishlistLink, isCustomerLoggedIn);

  let notificationLink = navIcons.querySelector(
    '.customer-message-link, a[aria-label="Notifications"], [data-noire-account-icon="notifications"]'
  );
  if (!notificationLink) {
    notificationLink = document.createElement("a");
    notificationLink.dataset.noireAccountIcon = "notifications";
    notificationLink.innerHTML = '<i class="fa-regular fa-bell" aria-hidden="true"></i>';
    profileLink.insertAdjacentElement("afterend", notificationLink);
  }
  notificationLink.href = notificationsUrl.href;
  notificationLink.setAttribute("aria-label", "Notifications");
  setVisible(notificationLink, isCustomerLoggedIn);
})();
