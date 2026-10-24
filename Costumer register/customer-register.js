(() => {
  const form = document.getElementById("customerRegistrationForm");
  if (!form) return;

  const terms = form.querySelector('input[name="terms"]');
  const termsKey = "noireCustomerTermsAccepted";
  if (terms) terms.checked = localStorage.getItem(termsKey) === "true";

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const customer = {
      fullName: String(data.get("fullName") || "").trim(),
      email: String(data.get("email") || "").trim().toLowerCase(),
      phone: String(data.get("phone") || "").trim(),
      password: String(data.get("password") || ""),
      createdAt: new Date().toISOString()
    };

    if (!customer.fullName || !customer.email || !customer.phone || customer.password.length < 8) {
      alert("Please complete all required details. Password must be at least 8 characters.");
      return;
    }
    if (!terms || !terms.checked) {
      alert("Please accept the Terms & Conditions to continue.");
      return;
    }

    try {
      const accounts = JSON.parse(localStorage.getItem("noireCustomerAccounts") || "[]");
      if (!Array.isArray(accounts)) throw new Error("Saved customer accounts are invalid.");
      if (accounts.some(account =>
        account && String(account.email || "").trim().toLowerCase() === customer.email
      )) {
        alert("An account with this email already exists. Please log in instead.");
        return;
      }

      accounts.push(customer);
      const keys = [
        "noireCustomerAccounts",
        "noireCustomerAccount_v1",
        termsKey,
        "noireCustomerOnboardingEmail",
        "noireLoginAccountType"
      ];
      const previous = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
      try {
        localStorage.setItem("noireCustomerAccounts", JSON.stringify(accounts));
        localStorage.setItem("noireCustomerAccount_v1", JSON.stringify({
          profile: {
            name: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            dob: "",
            gender: "Prefer not to say"
          },
          addresses: []
        }));
        localStorage.setItem(termsKey, "true");
        localStorage.setItem("noireCustomerOnboardingEmail", customer.email);
        localStorage.setItem("noireLoginAccountType", "customer");
        sessionStorage.setItem(
          "noireCustomerPostLoginReturn",
          "../Costumer panel/customer-account.html#addresses"
        );
        sessionStorage.removeItem("noireCustomerPendingAction");
      } catch (error) {
        keys.forEach(key => {
          if (previous[key] === null) localStorage.removeItem(key);
          else localStorage.setItem(key, previous[key]);
        });
        throw error;
      }
      window.location.href = "../Login page/login.html?role=customer";
    } catch (error) {
      alert(error instanceof Error
        ? `Unable to create your account: ${error.message}`
        : "Unable to create your account. Please check browser storage and try again.");
    }
  });

  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      const open = navLinks.classList.toggle("show");
      hamburger.setAttribute("aria-expanded", String(open));
    });
  }

  const searchToggle = document.getElementById("searchToggle");
  const mobileSearch = document.getElementById("mobileSearchBox");
  if (searchToggle && mobileSearch) {
    searchToggle.addEventListener("click", () => {
      const open = mobileSearch.classList.toggle("show-search");
      searchToggle.setAttribute("aria-expanded", String(open));
      if (open) mobileSearch.querySelector("input")?.focus();
    });
  }

  document.querySelectorAll("#searchForm, #mobileSearchBox").forEach(searchForm => {
    searchForm.addEventListener("submit", event => {
      event.preventDefault();
      const searchValue = searchForm.querySelector("input")?.value.trim();
      if (searchValue) {
        window.location.href = `../Shoppage/shop.html?search=${encodeURIComponent(searchValue)}`;
      }
    });
  });

  const sellerMenu = document.getElementById("sellerAccountMenu");
  const sellerTrigger = document.getElementById("sellerNavLink");
  const sellerLabel = sellerTrigger?.querySelector(".seller-menu-label");
  const sellerDropdown = document.getElementById("sellerDropdown");
  const sellerLogout = document.getElementById("sellerLogoutButton");
  let loggedSeller = null;
  let returningSeller = false;
  try {
    loggedSeller = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
    const sellers = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
    returningSeller = Array.isArray(sellers) && sellers.some(seller => seller && seller.email);
  } catch (error) {
    console.error("Unable to read seller navigation data.", error);
  }
  if (sellerMenu && sellerTrigger && sellerDropdown) {
    if (loggedSeller?.email) {
      if (sellerLabel) sellerLabel.textContent = loggedSeller.storeName || "Seller Store";
      sellerMenu.classList.add("is-logged-in");
    } else if (returningSeller && sellerLabel) {
      sellerLabel.textContent = "Login";
    }
    sellerTrigger.addEventListener("click", () => {
      if (!loggedSeller?.email) {
        window.location.href = returningSeller
          ? "../Login page/login.html?role=seller"
          : sellerMenu.dataset.registerUrl;
        return;
      }
      const open = sellerDropdown.hidden;
      sellerDropdown.hidden = !open;
      sellerMenu.classList.toggle("open", open);
      sellerTrigger.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", event => {
      if (!sellerMenu.contains(event.target)) {
        sellerDropdown.hidden = true;
        sellerMenu.classList.remove("open");
        sellerTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }
  if (sellerLogout) {
    sellerLogout.addEventListener("click", () => {
      localStorage.removeItem("noireLoggedInSeller");
      localStorage.setItem("noireSellerLoggedOut", "true");
      window.location.href = "../Homepage/index.html";
    });
  }

  const categoryToggle = document.getElementById("categoriesToggle");
  const categoryMenu = categoryToggle?.closest(".nav-dropdown");
  if (categoryToggle && categoryMenu) {
    categoryToggle.addEventListener("click", () => {
      const open = categoryMenu.classList.toggle("open");
      categoryToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", event => {
      if (!categoryMenu.contains(event.target)) {
        categoryMenu.classList.remove("open");
        categoryToggle.setAttribute("aria-expanded", "false");
      }
    });
  }
})();
