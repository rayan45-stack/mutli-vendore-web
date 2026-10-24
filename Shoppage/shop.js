(() => {
  const CART_KEY = "noireCustomerCart";
  const grid = document.getElementById("shopGrid");
  const search = document.getElementById("productSearch");
  const filter = document.getElementById("categoryFilter");
  const title = document.getElementById("shopTitle");
  const notice = document.getElementById("shopNote");
  const params = new URLSearchParams(window.location.search);
  const categoryLabels = {
    electronics: "Electronics",
    fashion: "Fashion",
    home: "Home & Living",
    beauty: "Beauty & Personal Care",
    sports: "Sports & Outdoors",
    books: "Books & Toys"
  };

  if (!grid || !search || !filter || !title) {
    console.error("Shop page is missing required page elements.");
    return;
  }

  const requestedCategory = params.get("category") || "all";
  if ([...filter.options].some(option => option.value === requestedCategory)) {
    filter.value = requestedCategory;
  }
  search.value = params.get("search") || "";

  function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  }

  function normalizeCategory(value) {
    const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalized.startsWith("home")) return "home";
    if (normalized.startsWith("beauty")) return "beauty";
    if (normalized.startsWith("sports")) return "sports";
    if (normalized.startsWith("books")) return "books";
    if (normalized.startsWith("electronic")) return "electronics";
    if (normalized.startsWith("fashion")) return "fashion";
    return normalized;
  }

  function getCustomerEmail() {
    try {
      const session = readJson("noireLoggedInSeller", null);
      if (session && session.email) return String(session.email).trim().toLowerCase();
      const account = readJson("noireCustomerAccount_v1", null);
      return String(account?.profile?.email || "").trim().toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function isOwnProduct(sellerEmail) {
    const ownerEmail = String(sellerEmail || "").trim().toLowerCase();
    return Boolean(ownerEmail && ownerEmail === getCustomerEmail());
  }

  function getSellerProducts() {
    const accounts = readJson("noireSellerAccounts", []);
    if (!Array.isArray(accounts)) throw new Error("Seller account data is invalid.");

    const products = [];
    accounts.forEach(account => {
      const sellerEmail = String(account && account.email || "").trim().toLowerCase();
      if (!sellerEmail) return;
      const savedProducts = readJson(`noireSellerProducts_${sellerEmail}`, []);
      if (!Array.isArray(savedProducts)) {
        throw new Error(`Product data for ${account.storeName || sellerEmail} is invalid.`);
      }
      savedProducts.forEach(product => {
        if (!product || product.id === undefined || product.id === null) return;
        products.push({
          ...product,
          sellerEmail,
          sellerName: String(account.storeName || account.name || "NOIRÉ seller"),
          categoryKey: normalizeCategory(product.category),
          description: String(product.description || "").trim()
        });
      });
    });
    return products;
  }

  function getReviews(product) {
    return Array.isArray(product.reviews)
      ? product.reviews.filter(review =>
        review && Number.isInteger(Number(review.rating)) &&
        Number(review.rating) >= 1 && Number(review.rating) <= 5
      )
      : [];
  }

  function getDetailsUrl(product) {
    const url = new URL("product/product.html", window.location.href);
    url.searchParams.set("seller", product.sellerEmail);
    url.searchParams.set("id", String(product.id));
    return url.href;
  }

  function makeReviewForm(product) {
    const details = document.createElement("details");
    details.className = "shop-review-details";
    const summary = document.createElement("summary");
    const ownProduct = isOwnProduct(product.sellerEmail);
    summary.textContent = ownProduct ? "You cannot review your own product" : "Write a review";
    details.appendChild(summary);

    if (ownProduct) return details;

    const form = document.createElement("form");
    form.className = "shop-review-form";
    form.dataset.sellerEmail = product.sellerEmail;
    form.dataset.productId = String(product.id);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Your name";
    const nameInput = document.createElement("input");
    nameInput.name = "reviewer";
    nameInput.type = "text";
    nameInput.maxLength = 80;
    nameInput.required = true;
    nameInput.autocomplete = "name";
    nameInput.placeholder = "Name";
    nameLabel.appendChild(nameInput);

    const ratingLabel = document.createElement("label");
    ratingLabel.textContent = "Rating";
    const ratingSelect = document.createElement("select");
    ratingSelect.name = "rating";
    ratingSelect.required = true;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a rating";
    ratingSelect.appendChild(placeholder);
    for (let value = 5; value >= 1; value -= 1) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = `${value} ${value === 1 ? "star" : "stars"}`;
      ratingSelect.appendChild(option);
    }
    ratingLabel.appendChild(ratingSelect);

    const commentLabel = document.createElement("label");
    commentLabel.textContent = "Your feedback";
    const commentInput = document.createElement("textarea");
    commentInput.name = "comment";
    commentInput.maxLength = 1000;
    commentInput.rows = 3;
    commentInput.required = true;
    commentInput.placeholder = "Share your experience with this product";
    commentLabel.appendChild(commentInput);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit review";
    const message = document.createElement("p");
    message.className = "shop-review-message";
    message.setAttribute("role", "status");
    form.append(nameLabel, ratingLabel, commentLabel, submit, message);
    details.appendChild(form);
    return details;
  }

  function makeProductCard(product) {
    const card = document.createElement("article");
    card.className = "shop-card";
    const detailsUrl = getDetailsUrl(product);
    card.addEventListener("click", event => {
      if (event.target.closest("a, button, details, form, input, select, textarea")) return;
      window.location.href = detailsUrl;
    });

    const imageArea = document.createElement("div");
    imageArea.className = "shop-image";
    if (product.image) {
      const imageLink = document.createElement("a");
      imageLink.href = detailsUrl;
      imageLink.setAttribute("aria-label", `View ${product.name || "product"} details`);
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name || "Product image";
      image.loading = "lazy";
      image.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:8px";
      imageLink.appendChild(image);
      imageArea.appendChild(imageLink);
    } else {
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-box";
      icon.setAttribute("aria-hidden", "true");
      imageArea.appendChild(icon);
      imageArea.tabIndex = 0;
      imageArea.setAttribute("role", "link");
      imageArea.setAttribute("aria-label", `View ${product.name || "product"} details`);
      imageArea.addEventListener("click", () => {
        window.location.href = detailsUrl;
      });
      imageArea.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.location.href = detailsUrl;
        }
      });
    }

    const nameHeading = document.createElement("h3");
    const nameLink = document.createElement("a");
    nameLink.href = detailsUrl;
    nameLink.textContent = product.name || "Untitled product";
    nameHeading.appendChild(nameLink);

    const description = document.createElement("p");
    description.textContent = product.description || "Listed by a NOIRÉ seller";
    const price = document.createElement("p");
    price.className = "shop-price";
    price.textContent = `Rs. ${Number(product.price || 0).toLocaleString("en-PK")}`;

    const reviews = getReviews(product);
    const rating = document.createElement("p");
    rating.className = "shop-rating";
    if (reviews.length) {
      const average = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
      const rounded = Math.round(average);
      rating.textContent = `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)} ${average.toFixed(1)} · ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`;
    } else {
      rating.textContent = "No reviews yet";
    }

    const viewDetails = document.createElement("a");
    viewDetails.className = "shop-view-details";
    viewDetails.href = detailsUrl;
    viewDetails.textContent = "View product details";

    card.append(imageArea, nameHeading, description, price, rating, viewDetails, makeReviewForm(product));
    return card;
  }

  function render() {
    let products;
    try {
      products = getSellerProducts();
    } catch (error) {
      console.error("Unable to load Shop products.", error);
      notice.textContent = "Unable to load seller products. Please check saved browser data and reload.";
      grid.replaceChildren();
      return;
    }

    const query = search.value.trim().toLowerCase();
    const category = filter.value;
    const visibleProducts = products.filter(product => {
      const categoryName = categoryLabels[product.categoryKey] || product.categoryKey;
      const searchableText = `${product.name || ""} ${product.description} ${product.category || ""} ${categoryName} ${product.sellerName}`.toLowerCase();
      return (category === "all" || product.categoryKey === category) && searchableText.includes(query);
    });

    title.textContent = category === "all"
      ? "Shop All Products"
      : categoryLabels[category] || "Shop Products";
    grid.replaceChildren();
    notice.textContent = products.length
      ? "Explore products uploaded by NOIRÉ sellers."
      : "No products have been uploaded yet. Seller products will appear here when they are added.";

    if (!visibleProducts.length) {
      const empty = document.createElement("p");
      empty.className = "shop-note";
      empty.textContent = products.length
        ? "No matching products found. Try another search or category."
        : "No products available yet.";
      grid.appendChild(empty);
      return;
    }

    visibleProducts.forEach(product => grid.appendChild(makeProductCard(product)));
  }

  function updateCartCount() {
    const cart = readJson(CART_KEY, []);
    if (!Array.isArray(cart)) throw new Error("Saved cart data is invalid.");
    const count = cart.reduce((total, item) => total + (Number(item && item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(counter => {
      counter.textContent = String(count);
    });
  }

  function getReviewingEmail() {
    try {
      const seller = readJson("noireLoggedInSeller", null);
      if (seller && seller.email) return String(seller.email).trim().toLowerCase();
      const account = readJson("noireCustomerAccount_v1", null);
      return String(account?.profile?.email || "").trim().toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function handleReviewSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches(".shop-review-form")) return;
    event.preventDefault();

    const message = form.querySelector(".shop-review-message");
    const reviewer = form.elements.reviewer.value.trim();
    const rating = Number(form.elements.rating.value);
    const comment = form.elements.comment.value.trim();
    const sellerEmail = form.dataset.sellerEmail;
    const productId = form.dataset.productId;
    if (isOwnProduct(sellerEmail)) {
      message.textContent = "You cannot review products from your own seller account.";
      message.classList.add("error");
      return;
    }
    if (!reviewer || !comment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      message.textContent = "Enter your name, choose a rating, and write your feedback.";
      message.classList.add("error");
      return;
    }

    try {
      const key = `noireSellerProducts_${sellerEmail}`;
      const savedProducts = readJson(key, []);
      if (!Array.isArray(savedProducts)) throw new Error("Saved product list is invalid.");
      const product = savedProducts.find(item => item && String(item.id) === productId);
      if (!product) throw new Error("This product is no longer available.");
      const reviews = Array.isArray(product.reviews) ? product.reviews : [];
      reviews.push({
        reviewer,
        reviewerEmail: getReviewingEmail(),
        rating,
        comment,
        createdAt: new Date().toISOString()
      });
      product.reviews = reviews;
      localStorage.setItem(key, JSON.stringify(savedProducts));
      form.reset();
      render();
      const updatedForm = [...grid.querySelectorAll(".shop-review-form")].find(candidate =>
        candidate.dataset.sellerEmail === sellerEmail && candidate.dataset.productId === productId
      );
      if (updatedForm) {
        updatedForm.closest("details").open = true;
        const updatedMessage = updatedForm.querySelector(".shop-review-message");
        updatedMessage.textContent = "Thank you! Your review has been submitted.";
        updatedMessage.classList.remove("error");
      }
    } catch (error) {
      message.textContent = error instanceof Error && error.message === "This product is no longer available."
        ? error.message
        : "Unable to save your review in this browser. Please try again.";
      message.classList.add("error");
    }
  }

  function setupNavigation() {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");
    if (hamburger && navLinks) {
      hamburger.addEventListener("click", () => {
        const open = navLinks.classList.toggle("show");
        hamburger.setAttribute("aria-expanded", String(open));
      });
      navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("show");
          hamburger.setAttribute("aria-expanded", "false");
        });
      });
    }

    const categoriesToggle = document.getElementById("categoriesToggle");
    const categoriesDropdown = categoriesToggle?.closest(".nav-dropdown");
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

    const searchToggle = document.getElementById("searchToggle");
    const mobileSearchBox = document.getElementById("mobileSearchBox");
    if (searchToggle && mobileSearchBox) {
      searchToggle.addEventListener("click", () => {
        const open = mobileSearchBox.classList.toggle("show-search");
        searchToggle.setAttribute("aria-expanded", String(open));
        if (open) mobileSearchBox.querySelector("input")?.focus();
      });
    }

    document.querySelectorAll("#searchForm, #mobileSearchBox").forEach(form => {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const input = form.querySelector("input");
        search.value = input ? input.value.trim() : "";
        render();
      });
    });

    const sellerAccountMenu = document.getElementById("sellerAccountMenu");
    const sellerNavLink = document.getElementById("sellerNavLink");
    const sellerDropdown = document.getElementById("sellerDropdown");
    const sellerLogoutButton = document.getElementById("sellerLogoutButton");
    const sellerLabel = sellerNavLink?.querySelector(".seller-menu-label");
    let loggedInSeller = null;
    try {
      loggedInSeller = readJson("noireLoggedInSeller", null);
    } catch (error) {
      console.error("Unable to read seller session.", error);
    }

    if (sellerAccountMenu && sellerNavLink && sellerDropdown) {
      if (loggedInSeller?.email && sellerLabel) {
        sellerLabel.textContent = loggedInSeller.storeName || "Seller Store";
        sellerAccountMenu.classList.add("is-logged-in");
      }
      sellerNavLink.addEventListener("click", () => {
        if (!loggedInSeller?.email) {
          window.location.href = sellerAccountMenu.dataset.registerUrl;
          return;
        }
        const open = sellerDropdown.hidden;
        sellerDropdown.hidden = !open;
        sellerAccountMenu.classList.toggle("open", open);
        sellerNavLink.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", event => {
        if (!sellerAccountMenu.contains(event.target)) {
          sellerDropdown.hidden = true;
          sellerAccountMenu.classList.remove("open");
          sellerNavLink.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (sellerLogoutButton) {
      sellerLogoutButton.addEventListener("click", () => {
        localStorage.removeItem("noireLoggedInSeller");
        localStorage.setItem("noireSellerLoggedOut", "true");
        window.location.href = "../Homepage/index.html";
      });
    }
  }

  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  grid.addEventListener("submit", handleReviewSubmit);
  window.addEventListener("storage", event => {
    if (!event.key || event.key === "noireSellerAccounts" ||
      event.key === CART_KEY || event.key.startsWith("noireSellerProducts_")) {
      render();
      try {
        updateCartCount();
      } catch (error) {
        notice.textContent = "Unable to update the cart count. Please check browser storage.";
      }
    }
  });

  setupNavigation();
  render();
  try {
    updateCartCount();
  } catch (error) {
    console.error("Unable to update the Shop cart count.", error);
    notice.textContent = "Unable to read your cart. Please check browser storage.";
  }
})();
