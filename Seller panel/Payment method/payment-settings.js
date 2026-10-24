const hamburger = document.getElementById("hamburger");
        const navLinks = document.getElementById("navLinks");
        const searchToggle = document.getElementById("searchToggle");
        const mobileSearchBox = document.getElementById("mobileSearchBox");

        hamburger.addEventListener("click", () => {
            const open = navLinks.classList.toggle("show");

            hamburger.setAttribute("aria-expanded", open);
            hamburger.innerHTML = open
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-bars"></i>';
        });

        searchToggle.addEventListener("click", () => {
            mobileSearchBox.classList.toggle("show-search");

            if (mobileSearchBox.classList.contains("show-search")) {
                mobileSearchBox.querySelector("input").focus();
            }
        });

        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("show");
                hamburger.setAttribute("aria-expanded", "false");
                hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
            });
        });

        document.querySelectorAll("#searchForm, #mobileSearchBox")
            .forEach(form => {
                form.addEventListener("submit", event => {
                    event.preventDefault();

                    const query = form.querySelector("input").value.trim();

                    if (query) {
                        const shopLink = document.querySelector('.nav-links a[href*="shop.html"]');
                        if (shopLink) {
                            const shopUrl = new URL(shopLink.href);
                            shopUrl.searchParams.set("search", query);
                            window.location.href = shopUrl.href;
                        }
                    }
                });
            });

            
/* ===== CATEGORIES DROPDOWN ===== */

        const categoriesToggle = document.getElementById("categoriesToggle");
        const categoriesDropdown = document.querySelector(".nav-dropdown");

        if (categoriesToggle && categoriesDropdown) {
            categoriesToggle.addEventListener("click", () => {
                const isOpen = categoriesDropdown.classList.toggle("open");

                categoriesToggle.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );
        });

            document.addEventListener("click", (event) => {
                if (!categoriesDropdown.contains(event.target)) {
                    categoriesDropdown.classList.remove("open");
                    categoriesToggle.setAttribute("aria-expanded", "false");
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    categoriesDropdown.classList.remove("open");
                    categoriesToggle.setAttribute("aria-expanded", "false");
                    categoriesToggle.focus();
                }
            });
        }

  // =========================================
  // 13. PAYMENT METHOD FIELDS
  // =========================================

  const paymentFieldsByMethod = {
    bank: document.getElementById("bankFields"),
    jazzcash: document.getElementById("jazzcashFields"),
    easypaisa: document.getElementById("easypaisaFields")
  };

  const paymentMethodRadios = document.querySelectorAll('input[name="payoutMethod"]');

  const LOGGED_IN_SELLER_KEY = "noireLoggedInSeller";
  const SELLERS_KEY = "noireSellerAccounts";

  function getLoggedSeller() {
    try {
      const seller = JSON.parse(localStorage.getItem(LOGGED_IN_SELLER_KEY));
      return seller && seller.email ? seller : null;
    } catch (error) {
      return null;
    }
  }

  function updateSellerNavState() {
    const seller = getLoggedSeller();
    const sellerNavLink = document.getElementById("sellerNavLink");
    const sellerNavLabel = sellerNavLink && sellerNavLink.querySelector(".seller-menu-label");
    const sellerStoreName = document.getElementById("sellerStoreName");
    const sellerAvatar = document.getElementById("sellerAvatar");
    const storeName = seller && seller.storeName ? seller.storeName : "Seller Store";

    if (sellerStoreName) {
      sellerStoreName.textContent = storeName;
    }

    if (sellerAvatar) {
      sellerAvatar.textContent = storeName.trim().charAt(0).toUpperCase() || "S";
    }

    if (sellerNavLabel) {
      sellerNavLabel.textContent = seller ? storeName : "Become a seller";
    }
  }

  function saveSellerProfile(updatedSeller) {
    const sellers = JSON.parse(localStorage.getItem(SELLERS_KEY) || "[]");
    const index = sellers.findIndex((seller) => seller.email.toLowerCase() === updatedSeller.email.toLowerCase());

    if (index >= 0) {
      sellers[index] = updatedSeller;
    } else {
      sellers.push(updatedSeller);
    }

    localStorage.setItem(SELLERS_KEY, JSON.stringify(sellers));
    localStorage.setItem(LOGGED_IN_SELLER_KEY, JSON.stringify(updatedSeller));
  }

  const loggedSeller = getLoggedSeller();
  if (!loggedSeller) {
    window.location.href = "../../Login page/login.html";
  }

  updateSellerNavState();

  function applySavedPaymentDetails() {
    const seller = getLoggedSeller();
    if (!seller || !seller.paymentDetails) return;

    const paymentDetails = seller.paymentDetails;
    const method = paymentDetails.method || "bank";
    const selectedRadio = document.querySelector(`input[name="payoutMethod"][value="${method}"]`);

    if (selectedRadio) {
      selectedRadio.checked = true;
      togglePaymentFields(method);
    }

    if (paymentDetails.holderName) {
      const holderNameInput = document.getElementById("holderName");
      if (holderNameInput) holderNameInput.value = paymentDetails.holderName;
    }

    if (method === "bank") {
      if (paymentDetails.bankName) {
        const bankNameInput = document.getElementById("bankName");
        if (bankNameInput) bankNameInput.value = paymentDetails.bankName;
      }
      if (paymentDetails.accountNumber) {
        const accountNumberInput = document.getElementById("accountNumber");
        if (accountNumberInput) accountNumberInput.value = paymentDetails.accountNumber;
      }
    }

    if (method === "jazzcash") {
      if (paymentDetails.jazzcashNumber) {
        const jazzcashNumberInput = document.getElementById("jazzcashNumber");
        if (jazzcashNumberInput) jazzcashNumberInput.value = paymentDetails.jazzcashNumber;
      }
      if (paymentDetails.jazzcashCnic) {
        const jazzcashCnicInput = document.getElementById("jazzcashCnic");
        if (jazzcashCnicInput) jazzcashCnicInput.value = paymentDetails.jazzcashCnic;
      }
      if (paymentDetails.jazzcashTitle) {
        const jazzcashTitleInput = document.getElementById("jazzcashTitle");
        if (jazzcashTitleInput) jazzcashTitleInput.value = paymentDetails.jazzcashTitle;
      }
    }

    if (method === "easypaisa") {
      if (paymentDetails.easypaisaNumber) {
        const easypaisaNumberInput = document.getElementById("easypaisaNumber");
        if (easypaisaNumberInput) easypaisaNumberInput.value = paymentDetails.easypaisaNumber;
      }
      if (paymentDetails.easypaisaCnic) {
        const easypaisaCnicInput = document.getElementById("easypaisaCnic");
        if (easypaisaCnicInput) easypaisaCnicInput.value = paymentDetails.easypaisaCnic;
      }
      if (paymentDetails.easypaisaTitle) {
        const easypaisaTitleInput = document.getElementById("easypaisaTitle");
        if (easypaisaTitleInput) easypaisaTitleInput.value = paymentDetails.easypaisaTitle;
      }
    }

    if (paymentDetails.additionalInfo) {
      const additionalInfoInput = document.getElementById("additionalInfo");
      if (additionalInfoInput) additionalInfoInput.value = paymentDetails.additionalInfo;
    }
  }

  function togglePaymentFields(selectedMethod) {
    Object.entries(paymentFieldsByMethod).forEach(([method, container]) => {
      const isActive = method === selectedMethod;
      if (!container) return;

      container.hidden = !isActive;

      container.querySelectorAll("input, select").forEach((field) => {
        field.disabled = !isActive;
        field.required = isActive;
      });
    });

    document.querySelectorAll(".payout-option").forEach((card) => {
      const radio = card.querySelector('input[name="payoutMethod"]');
      const active = radio && radio.checked;
      card.classList.toggle("selected", !!active);
    });
  }

  const selectedPayout = document.querySelector('input[name="payoutMethod"]:checked');
  if (selectedPayout) {
    togglePaymentFields(selectedPayout.value);
  }

  paymentMethodRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      togglePaymentFields(radio.value);
    });
  });

  const paymentForm = document.getElementById("paymentForm");

  if (paymentForm) {
    paymentForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const seller = getLoggedSeller();
      if (!seller) {
        window.location.href = "../../Login page/login.html";
        return;
      }

      const selectedMethod = document.querySelector('input[name="payoutMethod"]:checked')?.value || "bank";
      const paymentDetails = {
        method: selectedMethod,
        holderName: document.getElementById("holderName")?.value.trim() || "",
        bankName: document.getElementById("bankName")?.value.trim() || "",
        accountNumber: document.getElementById("accountNumber")?.value.trim() || "",
        jazzcashNumber: document.getElementById("jazzcashNumber")?.value.trim() || "",
        jazzcashCnic: document.getElementById("jazzcashCnic")?.value.trim() || "",
        jazzcashTitle: document.getElementById("jazzcashTitle")?.value.trim() || "",
        easypaisaNumber: document.getElementById("easypaisaNumber")?.value.trim() || "",
        easypaisaCnic: document.getElementById("easypaisaCnic")?.value.trim() || "",
        easypaisaTitle: document.getElementById("easypaisaTitle")?.value.trim() || "",
        additionalInfo: document.getElementById("additionalInfo")?.value.trim() || ""
      };

      const updatedSeller = { ...seller, paymentDetails };
      saveSellerProfile(updatedSeller);

      const formMessage = document.getElementById("formMessage");
      if (formMessage) {
        formMessage.textContent = "Payment details saved successfully.";
        formMessage.className = "form-message success";
      }

      window.location.href = "../seller-dashboard.html";
    });
  }

  applySavedPaymentDetails();

  // =========================================
  // 14. SIDEBAR ACTIVE LINKS
  // =========================================

  const sideLinks = document.querySelectorAll(".side-link");

  sideLinks.forEach((link) => {
    link.addEventListener("click", () => {
      sideLinks.forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");
    });
  });

  (() => {
    const menu = document.getElementById("sellerAccountMenu");
    const trigger = document.getElementById("sellerNavLink");
    const label = trigger && trigger.querySelector(".seller-menu-label");
    const dropdown = document.getElementById("sellerDropdown");
    const logout = document.getElementById("sellerLogoutButton");
    if (!menu || !trigger || !label || !dropdown || !logout) return;

    const seller = () => {
      try {
        const value = JSON.parse(localStorage.getItem("noireLoggedInSeller"));
        return value && value.email ? value : null;
      } catch (error) { return null; }
    };
    const returning = () => {
      if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
      try {
        const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
        return Array.isArray(accounts) && accounts.some((account) => account && account.email);
      } catch (error) { return false; }
    };
    const close = () => {
      dropdown.hidden = true;
      menu.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    };
    const sync = () => {
      const currentSeller = seller();
      const loggedIn = Boolean(currentSeller);
      const returningSeller = !loggedIn && returning();
      const text = loggedIn ? (currentSeller.storeName || "Seller Store") : returningSeller ? "Login" : "Become a seller";
      label.textContent = text;
      trigger.setAttribute("aria-label", loggedIn ? `${text} account menu` : text);
      menu.classList.toggle("is-logged-in", loggedIn);
      menu.classList.toggle("is-returning-seller", returningSeller);
      menu.querySelector('[data-seller-destination="dashboard"]').href = menu.dataset.dashboardUrl;
      menu.querySelector('[data-seller-destination="settings"]').href = menu.dataset.settingsUrl;
      if (!loggedIn) close();
    };
    trigger.addEventListener("click", () => {
      if (!seller()) {
        window.location.href = returning() ? menu.dataset.loginUrl : menu.dataset.registerUrl;
        return;
      }
      const open = dropdown.hidden;
      dropdown.hidden = !open;
      menu.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    });
    logout.addEventListener("click", () => {
      localStorage.removeItem("noireLoggedInSeller");
      localStorage.setItem("noireSellerLoggedOut", "true");
      window.location.href = menu.dataset.homeUrl;
    });
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dropdown.hidden) {
        close();
        trigger.focus();
      }
    });
    window.addEventListener("storage", (event) => {
      if (event.key === "noireLoggedInSeller" || event.key === null) sync();
    });
    sync();
  })();