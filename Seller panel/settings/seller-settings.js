(() => {
  "use strict";

  const sellerKey = "noireLoggedInSeller";
  let seller = null;

  try {
    seller = JSON.parse(localStorage.getItem(sellerKey) || "null");
  } catch (error) {
    seller = null;
  }

  if (!seller || !seller.email) {
    window.location.href = "../../Login page/login.html";
    return;
  }

  const defaultSettings = {
    storeCategory: "Fashion",
    storeCity: "Karachi",
    storeAddress: "Karachi, Pakistan",
    storeDescription: "",
    processingTime: "2 business days",
    returnPolicy: "7 days return",
    notifications: {
      orders: true,
      approvals: true,
      stock: true,
      messages: true
    },
    showContact: true,
    shopActive: true
  };
  const storeSettings = { ...defaultSettings, ...(seller.settings || {}) };
  storeSettings.notifications = {
    ...defaultSettings.notifications,
    ...(storeSettings.notifications || {})
  };

  const storeName = seller.storeName || "Seller Store";
  const fullName = seller.fullName || storeName;
  const storeNameElement = document.getElementById("sellerStoreName");
  const avatar = document.getElementById("sellerAvatar");
  const welcomeName = document.getElementById("welcomeStoreName");
  const dateElement = document.getElementById("currentDate");

  if (storeNameElement) storeNameElement.textContent = storeName;
  if (avatar) avatar.textContent = (storeName.trim().charAt(0) || "S").toUpperCase();
  if (welcomeName) welcomeName.textContent = fullName;
  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString("en-PK", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  const navLabel = document.querySelector("#sellerNavLink .seller-menu-label");
  if (navLabel) navLabel.textContent = storeName;

  const settingsForm = document.getElementById("sellerSettingsForm");
  const settingsMessage = document.getElementById("settingsMessage");
  const fullNameInput = document.getElementById("settingsFullName");
  const storeNameInput = document.getElementById("settingsStoreName");
  const phoneInput = document.getElementById("settingsPhone");
  const settingsEmailInput = document.getElementById("settingsEmail");
  const descriptionInput = document.getElementById("settingsDescription");
  const descriptionCount = document.getElementById("descriptionCount");
  const addressInput = document.getElementById("settingsAddress");
  const cityInput = document.getElementById("settingsCity");
  const mapFrame = document.getElementById("storeMap");
  const mapAddress = document.getElementById("mapAddress");
  const mapCity = document.getElementById("mapCity");
  const logoPreview = document.getElementById("logoPreview");
  const shopStatusText = document.getElementById("shopStatusText");
  let logoData = seller.storeLogo || "";

  const updateMap = () => {
    const query = [addressInput.value.trim(), cityInput.value, "Pakistan"].filter(Boolean).join(", ");
    if (mapFrame) {
      mapFrame.src = "https://maps.google.com/maps?q=" + encodeURIComponent(query) + "&output=embed";
    }
    if (mapAddress) mapAddress.textContent = addressInput.value.trim() || "Store address not set";
    if (mapCity) mapCity.textContent = cityInput.value || "City not set";
  };

  const fillSettingsForm = () => {
    if (!settingsForm) return;
    fullNameInput.value = seller.fullName || "";
    storeNameInput.value = seller.storeName || "Seller Store";
    phoneInput.value = seller.phone || "";
    settingsEmailInput.value = seller.email || "";
    settingsForm.elements.storeCategory.value = storeSettings.storeCategory;
    settingsForm.elements.storeCity.value = storeSettings.storeCity;
    settingsForm.elements.storeAddress.value = storeSettings.storeAddress;
    settingsForm.elements.storeDescription.value = storeSettings.storeDescription;
    settingsForm.elements.processingTime.value = storeSettings.processingTime;
    settingsForm.elements.returnPolicy.value = storeSettings.returnPolicy;
    settingsForm.elements.notifyOrders.checked = storeSettings.notifications.orders;
    settingsForm.elements.notifyApprovals.checked = storeSettings.notifications.approvals;
    settingsForm.elements.notifyStock.checked = storeSettings.notifications.stock;
    settingsForm.elements.notifyMessages.checked = storeSettings.notifications.messages;
    settingsForm.elements.showContact.checked = storeSettings.showContact;
    settingsForm.elements.shopActive.checked = storeSettings.shopActive;
    if (shopStatusText) {
      shopStatusText.textContent = storeSettings.shopActive
        ? "Your shop is currently active."
        : "Your shop is currently inactive.";
    }
    if (logoPreview && logoData) {
      logoPreview.style.backgroundImage = `url("${logoData}")`;
      logoPreview.classList.add("has-logo");
    }
    updateMap();
    if (descriptionCount) {
      descriptionCount.textContent = `${settingsForm.elements.storeDescription.value.length}/500`;
    }
  };

  const persistSeller = (updatedSeller) => {
    const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
    if (!Array.isArray(accounts)) throw new Error("Seller accounts data is invalid.");
    const accountIndex = accounts.findIndex((account) =>
      account && account.email && account.email.toLowerCase() === seller.email.toLowerCase()
    );
    if (accountIndex === -1) throw new Error("Seller account was not found.");
    const emailInUse = accounts.some((account, index) =>
      index !== accountIndex &&
      account && account.email &&
      account.email.toLowerCase() === updatedSeller.email.toLowerCase()
    );
    if (emailInUse) throw new Error("This email address is already registered.");

    accounts[accountIndex] = updatedSeller;
    localStorage.setItem("noireSellerAccounts", JSON.stringify(accounts));
    localStorage.setItem(sellerKey, JSON.stringify(updatedSeller));
    seller = updatedSeller;
  };

  fillSettingsForm();
  if (settingsForm) {
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const updatedSettings = {
        storeCategory: settingsForm.elements.storeCategory.value,
        storeCity: settingsForm.elements.storeCity.value,
        storeAddress: settingsForm.elements.storeAddress.value.trim(),
        storeDescription: settingsForm.elements.storeDescription.value.trim(),
        processingTime: settingsForm.elements.processingTime.value,
        returnPolicy: settingsForm.elements.returnPolicy.value,
        notifications: {
          orders: settingsForm.elements.notifyOrders.checked,
          approvals: settingsForm.elements.notifyApprovals.checked,
          stock: settingsForm.elements.notifyStock.checked,
          messages: settingsForm.elements.notifyMessages.checked
        },
        showContact: settingsForm.elements.showContact.checked,
        shopActive: settingsForm.elements.shopActive.checked
      };

      const updatedSeller = {
        ...seller,
        fullName: fullNameInput.value.trim(),
        storeName: storeNameInput.value.trim(),
        email: settingsEmailInput.value.trim().toLowerCase(),
        phone: phoneInput.value.trim(),
        storeLogo: logoData,
        settings: updatedSettings
      };

      try {
        persistSeller(updatedSeller);
        storeSettings.storeCategory = updatedSettings.storeCategory;
        storeSettings.storeCity = updatedSettings.storeCity;
        storeSettings.storeAddress = updatedSettings.storeAddress;
        storeSettings.storeDescription = updatedSettings.storeDescription;
        storeSettings.processingTime = updatedSettings.processingTime;
        storeSettings.returnPolicy = updatedSettings.returnPolicy;
        storeSettings.notifications = updatedSettings.notifications;
        storeSettings.showContact = updatedSettings.showContact;
        storeSettings.shopActive = updatedSettings.shopActive;

        if (storeNameElement) storeNameElement.textContent = updatedSeller.storeName;
        if (avatar) avatar.textContent = updatedSeller.storeName.trim().charAt(0).toUpperCase() || "S";
        if (welcomeName) welcomeName.textContent = updatedSeller.fullName;
        if (navLabel) navLabel.textContent = updatedSeller.storeName;
        updateMap();
        if (settingsMessage) {
          settingsMessage.textContent = "Settings saved successfully.";
          settingsMessage.style.color = "#426c4d";
        }
        if (String(localStorage.getItem("noireSellerSetupInProgress") || "").toLowerCase() ===
          updatedSeller.email.toLowerCase()) {
          localStorage.removeItem("noireSellerSetupInProgress");
          window.location.href = "../Payment method/payment-settings.html";
        }
      } catch (error) {
        if (settingsMessage) {
          settingsMessage.textContent = error.message === "This email address is already registered."
            ? error.message
            : "Unable to save your settings. Please try again.";
          settingsMessage.style.color = "#b54736";
        }
      }
    });
  }

  if (descriptionInput && descriptionCount) {
    descriptionInput.addEventListener("input", () => {
      descriptionCount.textContent = `${descriptionInput.value.length}/500`;
    });
  }
  settingsForm.elements.shopActive.addEventListener("change", () => {
    if (shopStatusText) {
      shopStatusText.textContent = settingsForm.elements.shopActive.checked
        ? "Your shop is currently active."
        : "Your shop is currently inactive.";
    }
  });
  if (addressInput) addressInput.addEventListener("change", updateMap);
  if (cityInput) cityInput.addEventListener("change", updateMap);

  const logoInput = document.getElementById("settingsLogo");
  if (logoInput) {
    logoInput.addEventListener("change", () => {
      const file = logoInput.files && logoInput.files[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        if (settingsMessage) {
          settingsMessage.textContent = "Choose a PNG, JPG, or WEBP image.";
          settingsMessage.style.color = "#b54736";
        }
        logoInput.value = "";
        return;
      }
      if (file.size > 1024 * 1024) {
        if (settingsMessage) {
          settingsMessage.textContent = "Choose an image smaller than 1 MB.";
          settingsMessage.style.color = "#b54736";
        }
        logoInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result !== "string") {
          if (settingsMessage) {
            settingsMessage.textContent = "Unable to load this logo image.";
            settingsMessage.style.color = "#b54736";
          }
          return;
        }
        logoData = reader.result;
        logoPreview.style.backgroundImage = `url("${logoData}")`;
        logoPreview.classList.add("has-logo");
      });
      reader.addEventListener("error", () => {
        if (settingsMessage) {
          settingsMessage.textContent = "Unable to load this logo image.";
          settingsMessage.style.color = "#b54736";
        }
      });
      reader.readAsDataURL(file);
    });
  }

  const resetSettingsButton = document.getElementById("resetSettingsButton");
  if (resetSettingsButton) {
    resetSettingsButton.addEventListener("click", () => {
      if (!window.confirm("Reset store preferences and notification settings to their defaults?")) return;
      const updatedSeller = { ...seller, settings: { ...defaultSettings, notifications: { ...defaultSettings.notifications } }, storeLogo: "" };
      try {
        persistSeller(updatedSeller);
        Object.assign(storeSettings, defaultSettings);
        storeSettings.notifications = { ...defaultSettings.notifications };
        logoData = "";
        logoInput.value = "";
        logoPreview.style.backgroundImage = "";
        logoPreview.classList.remove("has-logo");
        fillSettingsForm();
        if (settingsMessage) {
          settingsMessage.textContent = "Settings have been reset.";
          settingsMessage.style.color = "#426c4d";
        }
      } catch (error) {
        if (settingsMessage) {
          settingsMessage.textContent = "Unable to reset settings. Please try again.";
          settingsMessage.style.color = "#b54736";
        }
      }
    });
  }

  const passwordDialog = document.getElementById("passwordDialog");
  const passwordForm = document.getElementById("passwordForm");
  const passwordMessage = document.getElementById("passwordMessage");
  const changePasswordButton = document.getElementById("changePasswordButton");
  const cancelPasswordButton = document.getElementById("cancelPasswordButton");
  if (changePasswordButton && passwordDialog) {
    changePasswordButton.addEventListener("click", () => {
      passwordMessage.textContent = "";
      passwordForm.reset();
      passwordDialog.showModal();
    });
  }
  if (cancelPasswordButton && passwordDialog) {
    cancelPasswordButton.addEventListener("click", () => passwordDialog.close());
  }
  if (passwordForm && passwordDialog) {
    passwordForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      if (currentPassword !== seller.password) {
        passwordMessage.textContent = "Current password is incorrect.";
        passwordMessage.style.color = "#b54736";
        return;
      }
      if (newPassword !== confirmPassword) {
        passwordMessage.textContent = "New passwords do not match.";
        passwordMessage.style.color = "#b54736";
        return;
      }
      try {
        persistSeller({ ...seller, password: newPassword });
        passwordDialog.close();
        if (settingsMessage) {
          settingsMessage.textContent = "Password updated successfully.";
          settingsMessage.style.color = "#426c4d";
        }
      } catch (error) {
        passwordMessage.textContent = "Unable to update the password. Please try again.";
        passwordMessage.style.color = "#b54736";
      }
    });
  }

  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("navLinks");
  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      const open = nav.classList.toggle("show");
      hamburger.setAttribute("aria-expanded", String(open));
      hamburger.innerHTML = open
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });
  }

  const searchToggle = document.getElementById("searchToggle");
  const mobileSearch = document.getElementById("mobileSearchBox");
  if (searchToggle && mobileSearch) {
    searchToggle.addEventListener("click", () => {
      mobileSearch.classList.toggle("show-search");
      if (mobileSearch.classList.contains("show-search")) {
        const input = mobileSearch.querySelector("input");
        if (input) input.focus();
      }
    });
  }

  document.querySelectorAll("#searchForm, #mobileSearchBox").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const input = form.querySelector("input");
      const query = input ? input.value.trim() : "";
      if (query) {
        window.location.href = "../../Shoppage/shop.html?search=" + encodeURIComponent(query);
      }
    });
  });

  const categoriesToggle = document.getElementById("categoriesToggle");
  const categoriesDropdown = document.querySelector(".nav-dropdown");
  if (categoriesToggle && categoriesDropdown) {
    categoriesToggle.addEventListener("click", () => {
      const open = categoriesDropdown.classList.toggle("open");
      categoriesToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", event => {
      if (!categoriesDropdown.contains(event.target)) {
        categoriesDropdown.classList.remove("open");
        categoriesToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const menu = document.getElementById("sellerAccountMenu");
  const trigger = document.getElementById("sellerNavLink");
  const dropdown = document.getElementById("sellerDropdown");
  const logoutButton = document.getElementById("sellerLogoutButton");
  const settingsLogoutButton = document.getElementById("settingsLogoutButton");

  if (menu && trigger && dropdown) {
    menu.classList.add("is-logged-in");
    const closeMenu = () => {
      dropdown.hidden = true;
      menu.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", event => {
      event.stopPropagation();
      const open = dropdown.hidden;
      dropdown.hidden = !open;
      menu.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", event => {
      if (!menu.contains(event.target)) closeMenu();
    });

    const dashboardLink = menu.querySelector('[data-seller-destination="dashboard"]');
    const settingsLink = menu.querySelector('[data-seller-destination="settings"]');
    if (dashboardLink) dashboardLink.href = menu.dataset.dashboardUrl || "../seller-dashboard.html";
    if (settingsLink) settingsLink.href = menu.dataset.settingsUrl || "seller-settings.html";
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(sellerKey);
      localStorage.setItem("noireSellerLoggedOut", "true");
      window.location.href = "../../Homepage/index.html";
    });
  }
  if (settingsLogoutButton && logoutButton) {
    settingsLogoutButton.addEventListener("click", () => logoutButton.click());
  }

  document.querySelectorAll(".side-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".side-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
    });
  });
})();