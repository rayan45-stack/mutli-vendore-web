(() => {
  "use strict";

  const sellerKey = "noireLoggedInSeller";
  let seller;

  try {
    seller = JSON.parse(localStorage.getItem(sellerKey) || "null");
  } catch (error) {
    seller = null;
  }

  if (!seller || !seller.email) {
    window.location.href = "../../Login page/login.html";
    return;
  }

  const storeName = seller.storeName || "Seller Store";
  const sellerName = document.getElementById("sellerStoreName");
  const avatar = document.getElementById("sellerAvatar");
  const date = document.getElementById("currentDate");
  const sellerLabel = document.querySelector("#sellerNavLink .seller-menu-label");
  const productList = document.getElementById("productDetailsList");
  const productCount = document.getElementById("productCount");
  const reviewsPagination = document.getElementById("reviewsPagination");
  const reviewsRange = document.getElementById("reviewsRange");
  const reviewsPageNumber = document.getElementById("reviewsPageNumber");
  const previousReviewsPage = document.getElementById("previousReviewsPage");
  const nextReviewsPage = document.getElementById("nextReviewsPage");
  const productsPerPage = 20;
  let currentPage = 1;

  if (sellerName) sellerName.textContent = storeName;
  if (avatar) avatar.textContent = storeName.trim().charAt(0).toUpperCase() || "S";
  if (sellerLabel) sellerLabel.textContent = storeName;
  if (date) {
    date.textContent = new Date().toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  const productsKey = "noireSellerProducts_" + seller.email.toLowerCase();
  let products = [];
  try {
    const savedProducts = JSON.parse(localStorage.getItem(productsKey) || "[]");
    if (Array.isArray(savedProducts)) products = savedProducts;
  } catch (error) {
    productList.textContent = "Unable to read your saved products. Please check your browser storage.";
    return;
  }

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const getReviews = (product) => Array.isArray(product.reviews)
    ? product.reviews.filter((review) =>
      review && Number.isInteger(Number(review.rating)) &&
      Number(review.rating) >= 1 && Number(review.rating) <= 5 &&
      typeof review.comment === "string"
    )
    : [];

  const renderProduct = (product) => {
    const card = makeElement("article", "product-review-card");
    if (product.image) {
      const image = makeElement("img", "product-review-image");
      image.src = product.image;
      image.alt = product.name || "Product image";
      image.loading = "lazy";
      card.appendChild(image);
    } else {
      const placeholder = makeElement("div", "product-review-placeholder");
      const icon = makeElement("i", "fa-regular fa-image");
      icon.setAttribute("aria-hidden", "true");
      placeholder.appendChild(icon);
      card.appendChild(placeholder);
    }

    const info = makeElement("div", "product-review-info");
    info.appendChild(makeElement("h3", "", product.name || "Untitled product"));
    info.appendChild(makeElement("p", "product-review-category",
      `${product.category || "Uncategorized"} · Rs. ${Number(product.price || 0).toLocaleString("en-PK")} · Stock: ${Number(product.stock) || 0}`));
    if (product.description) {
      info.appendChild(makeElement("p", "product-review-description", product.description));
    }

    const reviews = getReviews(product);
    const ratingSummary = makeElement("div", "product-rating-summary");
    if (reviews.length) {
      const average = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
      ratingSummary.append(
        makeElement("span", "product-rating-stars", `${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}`),
        makeElement("strong", "", average.toFixed(1)),
        makeElement("span", "", `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`)
      );
    } else {
      ratingSummary.appendChild(makeElement("span", "product-rating-empty", "No ratings yet"));
    }
    info.appendChild(ratingSummary);

    if (!reviews.length) {
      info.appendChild(makeElement("p", "no-product-reviews", "No customer reviews yet. Reviews submitted from the Shop page will appear here."));
    } else {
      const reviewList = makeElement("div", "customer-review-list");
      [...reviews].reverse().forEach((review) => {
        const reviewCard = makeElement("article", "customer-review");
        const heading = makeElement("div", "customer-review-heading");
        const reviewer = makeElement("strong", "", review.reviewer || "Customer");
        const reviewDate = review.createdAt ? new Date(review.createdAt) : null;
        const dateLabel = reviewDate && !Number.isNaN(reviewDate.getTime())
          ? reviewDate.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
          : "";
        heading.append(reviewer, makeElement("span", "customer-review-date", dateLabel));
        reviewCard.append(
          heading,
          makeElement("div", "review-stars", `${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}`),
          makeElement("p", "", review.comment)
        );
        reviewList.appendChild(reviewCard);
      });
      info.appendChild(reviewList);
    }

    card.appendChild(info);
    return card;
  };

  const render = () => {
    productList.replaceChildren();
    productCount.textContent = `${products.length} ${products.length === 1 ? "product" : "products"}`;
    const totalPages = Math.max(1, Math.ceil(products.length / productsPerPage));
    currentPage = Math.min(currentPage, totalPages);

    if (!products.length) {
      reviewsPagination.hidden = true;
      const empty = makeElement("div", "product-details-empty");
      const icon = makeElement("i", "fa-regular fa-folder-open");
      icon.setAttribute("aria-hidden", "true");
      empty.append(icon, makeElement("p", "", "You have not uploaded any products yet."));
      const addLink = makeElement("a", "", "Add your first product");
      addLink.href = "../seller-dashboard.html#add-product";
      empty.appendChild(addLink);
      productList.appendChild(empty);
      return;
    }

    const startIndex = (currentPage - 1) * productsPerPage;
    const visibleProducts = products.slice(startIndex, startIndex + productsPerPage);
    visibleProducts.forEach((product) => productList.appendChild(renderProduct(product)));

    reviewsPagination.hidden = totalPages <= 1;
    reviewsRange.textContent = `Showing ${startIndex + 1}-${startIndex + visibleProducts.length} of ${products.length} products`;
    reviewsPageNumber.textContent = `Page ${currentPage} of ${totalPages}`;
    previousReviewsPage.disabled = currentPage === 1;
    nextReviewsPage.disabled = currentPage === totalPages;
  };

  previousReviewsPage.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      render();
    }
  });
  nextReviewsPage.addEventListener("click", () => {
    if (currentPage < Math.ceil(products.length / productsPerPage)) {
      currentPage++;
      render();
    }
  });

  render();

  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      const opened = navLinks.classList.toggle("show");
      hamburger.setAttribute("aria-expanded", String(opened));
      hamburger.innerHTML = opened
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });
  }

  const categoriesToggle = document.getElementById("categoriesToggle");
  const categoriesDropdown = document.querySelector(".nav-dropdown");
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

  const searchToggle = document.getElementById("searchToggle");
  const mobileSearch = document.getElementById("mobileSearchBox");
  if (searchToggle && mobileSearch) {
    searchToggle.addEventListener("click", () => {
      mobileSearch.classList.toggle("show-search");
      if (mobileSearch.classList.contains("show-search")) mobileSearch.querySelector("input")?.focus();
    });
  }

  document.querySelectorAll("#searchForm, #mobileSearchBox").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = form.querySelector("input")?.value.trim();
      if (query) window.location.href = `../../Shoppage/shop.html?search=${encodeURIComponent(query)}`;
    });
  });

  const menu = document.getElementById("sellerAccountMenu");
  const trigger = document.getElementById("sellerNavLink");
  const dropdown = document.getElementById("sellerDropdown");
  const logout = document.getElementById("sellerLogoutButton");
  if (menu && trigger && dropdown) {
    menu.classList.add("is-logged-in");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const opened = dropdown.hidden;
      dropdown.hidden = !opened;
      menu.classList.toggle("open", opened);
      trigger.setAttribute("aria-expanded", String(opened));
    });
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target)) {
        dropdown.hidden = true;
        menu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }
  if (logout) {
    logout.addEventListener("click", () => {
      localStorage.removeItem(sellerKey);
      window.location.href = "../../Homepage/index.html";
    });
  }
})();
