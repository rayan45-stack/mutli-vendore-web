(() => {
  const CART_KEY = "noireCustomerCart";
  const WISHLIST_KEY = "noireCustomerWishlist";
  const params = new URLSearchParams(window.location.search);
  const sellerEmail = (params.get("seller") || "").toLowerCase();
  const productId = params.get("id");
  const message = document.getElementById("productMessage");
  const productView = document.getElementById("productView");
  const reviewsSection = document.getElementById("reviewsSection");
  const actionMessage = document.getElementById("actionMessage");
  let product = null;
  let sellerName = "NOIRÉ seller";
  let sellerSettings = {};
  let productImages = [];
  let selectedImageIndex = 0;
  let selectedProductOptions = {};
  let isInWishlist = false;

  function readProduct() {
    try {
      const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
      const seller = Array.isArray(accounts) ? accounts.find(account =>
        account && String(account.email || "").toLowerCase() === sellerEmail
      ) : null;
      if (seller) {
        sellerName = seller.storeName || seller.name || sellerName;
        sellerSettings = seller.settings && typeof seller.settings === "object" ? seller.settings : {};
      }
      if (!sellerEmail || productId === null) return null;
      const savedProducts = JSON.parse(localStorage.getItem("noireSellerProducts_" + sellerEmail) || "[]");
      if (!Array.isArray(savedProducts)) return null;
      return savedProducts.find(item => item && String(item.id) === productId) || null;
    } catch (error) {
      return null;
    }
  }

  function money(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-PK");
  }

  function isOwnSellerProduct() {
    const session = getActiveSellerAccount();
    if (session && session.email &&
      String(session.email).trim().toLowerCase() === sellerEmail) return true;
    try {
      const customerAccount = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
      return Boolean(customerAccount?.profile?.email &&
        String(customerAccount.profile.email).trim().toLowerCase() === sellerEmail);
    } catch (error) {
      return false;
    }
  }

  function getActiveSellerAccount() {
    try {
      const session = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
      if (!session || !session.email) return null;
      const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
      if (!Array.isArray(accounts)) return session;
      return accounts.find(account =>
        account && String(account.email || "").trim().toLowerCase() ===
        String(session.email).trim().toLowerCase()
      ) || session;
    } catch (error) {
      return null;
    }
  }

  function hasSavedSellerShippingAddress() {
    try {
      const saved = JSON.parse(localStorage.getItem("noireCustomerShippingAddress") || "null");
      if (saved && saved.name && saved.phone && saved.address) return true;
      const addresses = JSON.parse(localStorage.getItem("noireCustomerSavedAddresses") || "[]");
      if (!Array.isArray(addresses)) return false;
      const primary = addresses.find(address =>
        address && (address.recipient || address.name) && address.phone && address.address
      );
      if (!primary) return false;
      localStorage.setItem("noireCustomerShippingAddress", JSON.stringify({
        name: primary.recipient || primary.name,
        phone: primary.phone,
        city: primary.city || "",
        address: primary.address
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function startSellerAddressStep(destination) {
    const seller = getActiveSellerAccount();
    if (!seller || hasSavedSellerShippingAddress()) return false;
    try {
      localStorage.setItem("noireSellerShoppingContinuation", JSON.stringify({
        destination,
        sellerEmail: String(seller.email).trim().toLowerCase(),
        createdAt: new Date().toISOString()
      }));
      window.location.href = "../Costumer panel/customer-account.html#profile";
      return true;
    } catch (error) {
      actionMessage.textContent = "Your item was saved, but the address setup could not be opened. Continue to your account to add a delivery address.";
      return true;
    }
  }

  function getReviews() {
    return Array.isArray(product.reviews) ? product.reviews.filter(review =>
      review && Number.isInteger(Number(review.rating)) &&
      Number(review.rating) >= 1 && Number(review.rating) <= 5
    ) : [];
  }

  function getSellerProducts() {
    const saved = JSON.parse(localStorage.getItem("noireSellerProducts_" + sellerEmail) || "[]");
    if (!Array.isArray(saved)) throw new Error("Seller product list is invalid.");
    return saved;
  }

  function getSellerDeliveryRate() {
    const orders = JSON.parse(localStorage.getItem("noireCustomerOrders") || "[]");
    if (!Array.isArray(orders)) throw new Error("Saved order history is invalid.");
    const deliveries = orders.flatMap(order => {
      if (!order || !Array.isArray(order.items)) return [];
      return order.items.flatMap(item => {
        if (!item || String(item.sellerEmail || "").trim().toLowerCase() !== sellerEmail) return [];
        const status = String(item.status || order.status || "").toLowerCase();
        const deliveredAt = item.deliveredAt || order.deliveredAt;
        const dueAt = item.expectedDeliveryAt || item.deliveryDueAt ||
          order.expectedDeliveryAt || order.deliveryDueAt;
        if (!deliveredAt || !dueAt || !/delivered|complete/.test(status)) return [];
        const actual = new Date(deliveredAt);
        const expected = new Date(dueAt);
        if (Number.isNaN(actual.getTime()) || Number.isNaN(expected.getTime())) return [];
        return [actual.getTime() <= expected.getTime()];
      });
    });
    return deliveries.length
      ? `${Math.round(deliveries.filter(Boolean).length / deliveries.length * 100)}%`
      : "No data";
  }

  function getSellerChatStats() {
    const messages = JSON.parse(localStorage.getItem(`noireStoreChat_${sellerEmail}`) || "[]");
    if (!Array.isArray(messages)) throw new Error("Saved seller chat history is invalid.");
    const ordered = messages
      .filter(message => message && ["customer", "seller"].includes(message.sender))
      .map(message => ({ ...message, timestamp: new Date(message.createdAt).getTime() }))
      .filter(message => Number.isFinite(message.timestamp))
      .sort((first, second) => first.timestamp - second.timestamp);
    const unanswered = [];
    ordered.forEach(message => {
      if (message.sender === "customer") unanswered.push(message.timestamp);
      else if (unanswered.length) unanswered.shift();
    });
    const customerCount = ordered.filter(message => message.sender === "customer").length;
    return {
      responseRate: customerCount
        ? `${Math.round((customerCount - unanswered.length) / customerCount * 100)}%`
        : "No data"
    };
  }

  function renderSoldBy() {
    const storeUrl = `../store/store.html?seller=${encodeURIComponent(sellerEmail)}`;
    document.getElementById("soldByStoreName").textContent = sellerName;
    document.getElementById("soldByStoreName").href = storeUrl;
    document.getElementById("soldByStoreLink").href = storeUrl;
    document.getElementById("soldByChatLink").href = `${storeUrl}&chat=1`;

    try {
      const sellerProducts = getSellerProducts();
      const reviews = sellerProducts.flatMap(item =>
        Array.isArray(item.reviews)
          ? item.reviews.filter(review =>
            review && Number.isInteger(Number(review.rating)) &&
            Number(review.rating) >= 1 && Number(review.rating) <= 5
          )
          : []
      );
      document.getElementById("soldByRating").textContent = reviews.length
        ? `${Math.round(reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length / 5 * 100)}%`
        : "No data";
    } catch (error) {
      document.getElementById("soldByRating").textContent = "Unavailable";
    }

    try {
      document.getElementById("soldByOnTime").textContent = getSellerDeliveryRate();
    } catch (error) {
      document.getElementById("soldByOnTime").textContent = "Unavailable";
    }

    try {
      const chatStats = getSellerChatStats();
      document.getElementById("soldByChatRate").textContent = chatStats.responseRate;
    } catch (error) {
      document.getElementById("soldByChatRate").textContent = "Unavailable";
    }
  }

  function showReviews() {
    const reviews = getReviews();
    const average = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
      : 0;
    const ratingLink = document.getElementById("productRating");
    ratingLink.replaceChildren();
    const stars = document.createElement("span");
    stars.className = "rating-stars";
    stars.textContent = reviews.length
      ? `${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}`
      : "☆☆☆☆☆";
    const summary = document.createElement("span");
    summary.textContent = reviews.length
      ? `${average.toFixed(1)} · ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`
      : "Write the first review";
    ratingLink.append(stars, summary);
    document.getElementById("reviewSummary").textContent = reviews.length
      ? `${average.toFixed(1)} out of 5 · ${reviews.length} ${reviews.length === 1 ? "customer review" : "customer reviews"}`
      : "Be the first to share your experience with this product.";

    const list = document.getElementById("reviewList");
    list.replaceChildren();
    if (!reviews.length) {
      const empty = document.createElement("p");
      empty.className = "empty-reviews";
      empty.textContent = "No reviews have been added for this product yet.";
      list.appendChild(empty);
      return;
    }
    reviews.slice().reverse().forEach(review => {
      const card = document.createElement("article");
      card.className = "review-card";
      const title = document.createElement("h3");
      title.textContent = review.reviewer || "Customer";
      const stars = document.createElement("p");
      stars.className = "review-stars";
      stars.textContent = `${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}`;
      const comment = document.createElement("p");
      comment.textContent = review.comment || review.body || "";
      const date = document.createElement("small");
      if (review.createdAt) {
        const parsedDate = new Date(review.createdAt);
        if (!Number.isNaN(parsedDate.getTime())) {
          date.textContent = parsedDate.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
        }
      }
      card.append(title, stars, comment, date);
      list.appendChild(card);
    });
  }

  function renderProduct() {
    if (!product) {
      message.hidden = false;
      message.textContent = "This product could not be found. It may have been removed by the seller.";
      return;
    }

    message.hidden = true;
    productView.hidden = false;
    reviewsSection.hidden = false;
    document.title = `${product.name || "Product"} | NOIRÉ`;
    document.getElementById("breadcrumbProduct").textContent = product.name || "Product";
    document.getElementById("breadcrumbCategory").textContent = product.category || "Products";
    document.getElementById("productName").textContent = product.name || "Untitled product";
    document.getElementById("productCategory").textContent = product.category || "Uncategorized";
    document.getElementById("productPrice").textContent = money(product.price);
    const storeLink = document.getElementById("productSeller");
    storeLink.textContent = sellerName;
    storeLink.href = `../store/store.html?seller=${encodeURIComponent(sellerEmail)}`;
    storeLink.setAttribute("aria-label", `Visit ${sellerName} store`);
    document.getElementById("productDescription").textContent = product.description || "No description provided.";
    const writeReview = document.querySelector(".write-review");
    if (writeReview) {
      writeReview.hidden = isOwnSellerProduct();
      let ownReviewNotice = document.getElementById("ownReviewNotice");
      if (isOwnSellerProduct() && !ownReviewNotice) {
        ownReviewNotice = document.createElement("p");
        ownReviewNotice.id = "ownReviewNotice";
        ownReviewNotice.className = "empty-reviews";
        ownReviewNotice.textContent = "You cannot review products from your own seller account.";
        writeReview.insertAdjacentElement("afterend", ownReviewNotice);
      } else if (!isOwnSellerProduct() && ownReviewNotice) {
        ownReviewNotice.remove();
      }
    }
    refreshWishlistState();

    const originalPrice = Number(product.originalPrice || product.compareAtPrice);
    const currentPrice = Number(product.price);
    const originalPriceElement = document.getElementById("originalProductPrice");
    const discountBadge = document.getElementById("discountBadge");
    if (Number.isFinite(originalPrice) && originalPrice > currentPrice && currentPrice > 0) {
      originalPriceElement.textContent = money(originalPrice);
      originalPriceElement.hidden = false;
      discountBadge.textContent = `${Math.round((1 - currentPrice / originalPrice) * 100)}% off`;
      discountBadge.hidden = false;
    } else {
      originalPriceElement.hidden = true;
      discountBadge.hidden = true;
    }

    const soldCount = Number(product.soldCount);
    const soldCountElement = document.getElementById("soldCount");
    soldCountElement.hidden = !Number.isFinite(soldCount) || soldCount < 1;
    soldCountElement.textContent = soldCountElement.hidden ? "" : `Sold ${soldCount.toLocaleString("en-PK")}+`;
    const returnPolicy = String(sellerSettings.returnPolicy || "").trim();
    const processingTime = String(sellerSettings.processingTime || "").trim();
    document.getElementById("sellerReturnPolicy").textContent = returnPolicy || "No return policy provided by seller";
    document.getElementById("sellerProcessingTime").textContent = processingTime || "Confirmed by seller";
    renderSoldBy();
    document.getElementById("benefitReturnPolicy").textContent = returnPolicy || "See seller return policy";
    renderProductOptions();

    const stock = Math.max(0, Number(product.stock) || 0);
    const stockElement = document.getElementById("productStock");
    stockElement.textContent = stock ? `${stock} available` : "Out of stock";
    stockElement.classList.toggle("out-of-stock", stock === 0);
    const quantity = document.getElementById("productQuantity");
    quantity.max = String(Math.max(1, stock));
    quantity.disabled = stock === 0;
    document.getElementById("decreaseQuantity").disabled = stock === 0;
    document.getElementById("increaseQuantity").disabled = stock === 0;
    document.getElementById("addToCart").disabled = stock === 0;
    document.getElementById("buyNow").disabled = stock === 0;
    if (isOwnSellerProduct()) {
      document.getElementById("addToCart").disabled = true;
      document.getElementById("buyNow").disabled = true;
      actionMessage.textContent = "You cannot shop products from your own seller account.";
    }

    const images = Array.isArray(product.images) ? product.images : [];
    productImages = [product.image, ...images]
      .map(image => typeof image === "string" ? image : image && (image.src || image.url || image.image))
      .filter((image, index, collection) => Boolean(image) && collection.indexOf(image) === index);
    selectedImageIndex = 0;
    renderProductGallery();
    updateDeliveryLocation();
    showReviews();
  }

  function refreshWishlistState() {
    const button = document.getElementById("wishlistButton");
    if (!product || !sellerEmail) {
      button.disabled = true;
      return;
    }
    try {
      const wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      if (!Array.isArray(wishlist)) throw new Error("Saved wishlist is invalid.");
      isInWishlist = wishlist.some(item =>
        item && String(item.sellerEmail || "").toLowerCase() === sellerEmail &&
        String(item.productId) === String(product.id)
      );
      button.setAttribute("aria-pressed", String(isInWishlist));
      button.setAttribute("aria-label", isInWishlist ? "Remove from wishlist" : "Add to wishlist");
      button.title = isInWishlist ? "Remove from wishlist" : "Add to wishlist";
      const icon = button.querySelector("i");
      icon.classList.toggle("fa-solid", isInWishlist);
      icon.classList.toggle("fa-regular", !isInWishlist);
      button.classList.toggle("is-saved", isInWishlist);
      button.disabled = false;
    } catch (error) {
      button.disabled = true;
      document.getElementById("productSocialMessage").textContent =
        "Unable to read your wishlist in this browser.";
    }
  }

  function toggleWishlist() {
    if (window.noireCustomerAuth &&
      !window.noireCustomerAuth.requireCustomer("wishlist")) return;
    const socialMessage = document.getElementById("productSocialMessage");
    socialMessage.textContent = "";
    try {
      const wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      if (!Array.isArray(wishlist)) throw new Error("Saved wishlist is invalid.");
      const existingIndex = wishlist.findIndex(item =>
        item && String(item.sellerEmail || "").toLowerCase() === sellerEmail &&
        String(item.productId) === String(product.id)
      );
      if (existingIndex >= 0) {
        wishlist.splice(existingIndex, 1);
        socialMessage.textContent = "Removed from your wishlist.";
      } else {
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        if (!Array.isArray(cart)) throw new Error("Saved cart is invalid.");
        const alreadyInCart = cart.some(item =>
          item &&
          String(item.sellerEmail || "").trim().toLowerCase() === sellerEmail &&
          String(item.productId) === String(product.id)
        );
        if (alreadyInCart) {
          socialMessage.textContent = "This product is already in your cart.";
          return;
        }
        wishlist.push({
          sellerEmail,
          productId: product.id,
          name: product.name || "Untitled product",
          price: Number(product.price) || 0,
          image: product.image || "",
          savedAt: new Date().toISOString()
        });
        socialMessage.textContent = "Added to your wishlist.";
      }
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
      refreshWishlistState();
    } catch (error) {
      socialMessage.textContent = "Unable to update your wishlist. Please check browser storage and try again.";
    }
  }

  async function shareProduct() {
    const socialMessage = document.getElementById("productSocialMessage");
    const shareData = {
      title: product.name || "NOIRÉ product",
      text: product.description || product.name || "View this product on NOIRÉ",
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        socialMessage.textContent = "Product shared.";
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        socialMessage.textContent = "Product link copied.";
        return;
      }
      const linkInput = document.createElement("textarea");
      linkInput.value = shareData.url;
      linkInput.setAttribute("readonly", "");
      linkInput.style.position = "fixed";
      linkInput.style.opacity = "0";
      document.body.appendChild(linkInput);
      linkInput.select();
      const copied = document.execCommand("copy");
      linkInput.remove();
      socialMessage.textContent = copied
        ? "Product link copied."
        : "Your browser could not copy the link. Copy it from the address bar.";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      socialMessage.textContent = "Unable to share this product. Copy its link from the address bar.";
    }
  }

  function renderProductOptions() {
    const picker = document.getElementById("productOptionPickers");
    const hasOptionGroups = Array.isArray(product.optionGroups);
    const groups = hasOptionGroups
      ? product.optionGroups
      : product.options && product.options.length
        ? [{ name: product.optionName || "Option", values: product.options }]
        : [];
    const availableGroups = groups.map(group => ({
      name: String(group.name || "Option").trim(),
      values: Array.isArray(group.values)
        ? [...new Set(group.values.map(value => String(value || "").trim()).filter(Boolean))]
        : []
    })).filter(group => group.values.length);

    picker.replaceChildren();
    picker.hidden = availableGroups.length === 0;
    if (!availableGroups.length) {
      selectedProductOptions = {};
      return;
    }

    const nextSelections = {};
    availableGroups.forEach(group => {
      const isLegacySingleOption = !hasOptionGroups && availableGroups.length === 1;
      const previousValue = selectedProductOptions[group.name];
      nextSelections[group.name] = group.values.includes(previousValue)
        ? previousValue
        : isLegacySingleOption && !/\bsize\b/i.test(group.name)
          ? group.values[0]
          : "";

      const fieldset = document.createElement("fieldset");
      fieldset.className = "product-option-picker";
      fieldset.dataset.optionName = group.name;
      const legend = document.createElement("legend");
      legend.textContent = group.name;
      const valuesContainer = document.createElement("div");
      valuesContainer.className = "product-option-values";
      group.values.forEach(value => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "product-option";
        button.textContent = value;
        const selected = value === nextSelections[group.name];
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("selected", selected);
        button.addEventListener("click", () => {
          selectedProductOptions[group.name] = value;
          actionMessage.textContent = "";
          renderProductOptions();
        });
        valuesContainer.appendChild(button);
      });
      fieldset.append(legend, valuesContainer);
      picker.appendChild(fieldset);
    });
    selectedProductOptions = nextSelections;
  }

  function validateProductOption() {
    const missingGroup = [...document.querySelectorAll("#productOptionPickers .product-option-picker")]
      .find(fieldset => !selectedProductOptions[fieldset.dataset.optionName]);
    if (missingGroup) {
      const optionName = missingGroup.dataset.optionName;
      const selectionName = /\bsize\b/i.test(optionName)
        ? "a size"
        : /\bcolor\b/i.test(optionName)
          ? "a color"
          : `an option for ${optionName}`;
      actionMessage.textContent = `Please select ${selectionName} before continuing.`;
      return false;
    }
    return true;
  }

  function getSelectedOptionData() {
    const optionValues = Object.fromEntries(
      Object.entries(selectedProductOptions).filter(([, value]) => value)
    );
    if (!Array.isArray(product.optionGroups) && Object.keys(optionValues).length === 1) {
      return { optionValue: Object.values(optionValues)[0], optionValues: {} };
    }
    const optionValue = Object.keys(optionValues)
      .map(name => `${name}: ${optionValues[name]}`)
      .join(", ");
    return { optionValue, optionValues };
  }

  function renderProductGallery() {
    const stage = document.getElementById("productImageStage");
    const thumbnails = document.getElementById("productThumbnails");
    stage.replaceChildren();
    thumbnails.replaceChildren();
    if (!productImages.length) {
      const placeholder = document.createElement("i");
      placeholder.className = "fa-regular fa-image";
      placeholder.setAttribute("aria-hidden", "true");
      stage.appendChild(placeholder);
    } else {
      const image = document.createElement("img");
      image.src = productImages[selectedImageIndex];
      image.alt = `${product.name || "Product"} image ${selectedImageIndex + 1}`;
      stage.appendChild(image);
      if (productImages.length > 1) {
        productImages.forEach((source, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "product-thumbnail";
          button.classList.toggle("active", index === selectedImageIndex);
          button.setAttribute("aria-label", `Show product image ${index + 1}`);
          button.setAttribute("aria-pressed", String(index === selectedImageIndex));
          const thumbnail = document.createElement("img");
          thumbnail.src = source;
          thumbnail.alt = "";
          button.appendChild(thumbnail);
          button.addEventListener("click", () => {
            selectedImageIndex = index;
            renderProductGallery();
          });
          thumbnails.appendChild(button);
        });
      }
    }
    const hasMultipleImages = productImages.length > 1;
    document.getElementById("previousImage").hidden = !hasMultipleImages;
    document.getElementById("nextImage").hidden = !hasMultipleImages;
    thumbnails.hidden = !hasMultipleImages;
  }

  function updateDeliveryLocation() {
    const locationText = document.getElementById("deliveryLocationText");
    try {
      const location = localStorage.getItem("noireDeliveryLocation");
      locationText.textContent = location ? location : "Choose your delivery area";
    } catch (error) {
      locationText.textContent = "Choose your delivery area";
    }
  }

  function selectedQuantity() {
    const stock = Math.max(0, Number(product.stock) || 0);
    const input = document.getElementById("productQuantity");
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 1 || value > stock) {
      input.value = String(Math.min(Math.max(1, Number.isInteger(value) ? value : 1), stock || 1));
      actionMessage.textContent = stock ? `Choose a quantity from 1 to ${stock}.` : "This product is out of stock.";
      return null;
    }
    return value;
  }

  function addToCart(quantity) {
    if (isOwnSellerProduct()) {
      actionMessage.textContent = "You cannot add your own seller account's products to the cart.";
      return false;
    }
    let cart;
    let wishlist;
    try {
      cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(cart)) throw new Error("Cart data is invalid.");
      wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      if (!Array.isArray(wishlist)) throw new Error("Wishlist data is invalid.");
    } catch (error) {
      actionMessage.textContent = "Unable to read your cart or wishlist. Please reload the page and try again.";
      return false;
    }
    const matchingProductItems = cart.filter(item =>
      item &&
      String(item.sellerEmail || "").trim().toLowerCase() === sellerEmail &&
      String(item.productId) === String(product.id) &&
      String(item.optionValue || "") === getSelectedOptionData().optionValue
    );
    if (matchingProductItems.length) {
      const nextWishlist = wishlist.filter(item =>
        !item ||
        String(item.sellerEmail || "").trim().toLowerCase() !== sellerEmail ||
        String(item.productId) !== String(product.id)
      );
      if (nextWishlist.length !== wishlist.length) {
        try {
          localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextWishlist));
          refreshWishlistState();
        } catch (error) {
          actionMessage.textContent = "This product is already in your cart, but it could not be removed from your wishlist.";
          return false;
        }
      }
      actionMessage.textContent = "This product is already in your cart.";
      return false;
    }
    cart.push({ sellerEmail, productId: product.id, ...getSelectedOptionData(), quantity });
    const nextWishlist = wishlist.filter(item =>
      !item ||
      String(item.sellerEmail || "").trim().toLowerCase() !== sellerEmail ||
      String(item.productId) !== String(product.id)
    );
    const previousCart = localStorage.getItem(CART_KEY);
    const previousWishlist = localStorage.getItem(WISHLIST_KEY);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextWishlist));
      updateCartCount();
      refreshWishlistState();
      return true;
    } catch (error) {
      try {
        if (previousCart === null) localStorage.removeItem(CART_KEY);
        else localStorage.setItem(CART_KEY, previousCart);
        if (previousWishlist === null) localStorage.removeItem(WISHLIST_KEY);
        else localStorage.setItem(WISHLIST_KEY, previousWishlist);
      } catch (rollbackError) {
        actionMessage.textContent = "Unable to save your cart and restore its previous state. Please reload the page.";
        return false;
      }
      actionMessage.textContent = "Unable to save your cart. Please check available browser storage.";
      return false;
    }
  }

  function updateCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      const count = Array.isArray(cart)
        ? cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
        : 0;
      document.querySelectorAll(".cart-count").forEach(counter => {
        counter.textContent = String(count);
      });
    } catch (error) {
      document.querySelectorAll(".cart-count").forEach(counter => {
        counter.textContent = "0";
      });
    }
  }

  document.getElementById("decreaseQuantity").addEventListener("click", () => {
    const input = document.getElementById("productQuantity");
    input.value = String(Math.max(1, (Number(input.value) || 1) - 1));
  });
  document.getElementById("increaseQuantity").addEventListener("click", () => {
    const input = document.getElementById("productQuantity");
    input.value = String(Math.min(Number(input.max), (Number(input.value) || 1) + 1));
  });
  document.getElementById("previousImage").addEventListener("click", () => {
    selectedImageIndex = (selectedImageIndex - 1 + productImages.length) % productImages.length;
    renderProductGallery();
  });
  document.getElementById("nextImage").addEventListener("click", () => {
    selectedImageIndex = (selectedImageIndex + 1) % productImages.length;
    renderProductGallery();
  });
  document.getElementById("productRating").addEventListener("click", () => {
    reviewsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("wishlistButton").addEventListener("click", toggleWishlist);
  document.getElementById("shareButton").addEventListener("click", shareProduct);
  document.getElementById("addToCart").addEventListener("click", () => {
    if (window.noireCustomerAuth &&
      !window.noireCustomerAuth.requireCustomer("add-to-cart")) return;
    actionMessage.textContent = "";
    const quantity = selectedQuantity();
    if (quantity !== null && addToCart(quantity)) {
      actionMessage.textContent = "Added to your cart.";
      startSellerAddressStep("cart");
    }
  });
  document.getElementById("buyNow").addEventListener("click", () => {
    if (window.noireCustomerAuth &&
      !window.noireCustomerAuth.requireCustomer("buy-now")) return;
    actionMessage.textContent = "";
    if (isOwnSellerProduct()) {
      actionMessage.textContent = "You cannot buy products from your own seller account.";
      return;
    }
    if (!validateProductOption()) return;
    const quantity = selectedQuantity();
    if (quantity === null) return;
    try {
      localStorage.setItem("noireCheckoutDraft", JSON.stringify({
        source: "buy-now",
        createdAt: new Date().toISOString(),
        items: [{
          sellerEmail,
          productId: product.id,
          ...getSelectedOptionData(),
          quantity
        }]
      }));
      if (startSellerAddressStep("checkout")) return;
      window.location.href = "../checkout/checkout.html";
    } catch (error) {
      actionMessage.textContent = "Unable to start checkout. Please check available browser storage.";
    }
  });

  const deliveryLocationDialog = document.getElementById("deliveryLocationDialog");
  const deliveryLocationForm = document.getElementById("deliveryLocationForm");
  document.getElementById("changeDeliveryLocation").addEventListener("click", () => {
    const currentLocation = document.getElementById("deliveryLocationText").textContent;
    const input = document.getElementById("deliveryCityInput");
    input.value = currentLocation === "Choose your delivery area" ? "" : currentLocation;
    document.getElementById("locationFormMessage").textContent = "";
    deliveryLocationDialog.showModal();
    input.focus();
  });
  document.getElementById("closeLocationDialog").addEventListener("click", () => {
    deliveryLocationDialog.close();
  });
  deliveryLocationForm.addEventListener("submit", event => {
    event.preventDefault();
    const location = deliveryLocationForm.elements.location.value.trim();
    const locationMessage = document.getElementById("locationFormMessage");
    if (!location) {
      locationMessage.textContent = "Enter a city or area to continue.";
      locationMessage.classList.add("error");
      return;
    }
    try {
      localStorage.setItem("noireDeliveryLocation", location);
      updateDeliveryLocation();
      deliveryLocationDialog.close();
    } catch (error) {
      locationMessage.textContent = "Unable to save your delivery area in this browser. Please try again.";
      locationMessage.classList.add("error");
    }
  });
  deliveryLocationDialog.addEventListener("click", event => {
    if (event.target === deliveryLocationDialog) deliveryLocationDialog.close();
  });

  document.getElementById("reviewForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const reviewMessage = document.getElementById("reviewMessage");
    if (isOwnSellerProduct()) {
      reviewMessage.textContent = "You cannot review products from your own seller account.";
      reviewMessage.classList.add("error");
      return;
    }
    const reviewer = form.elements.reviewer.value.trim();
    const rating = Number(form.elements.rating.value);
    const comment = form.elements.comment.value.trim();
    if (!reviewer || !comment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      reviewMessage.textContent = "Enter your name, choose a rating, and write a review.";
      reviewMessage.classList.add("error");
      return;
    }
    try {
      const key = "noireSellerProducts_" + sellerEmail;
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(saved)) throw new Error("Saved products are invalid.");
      const savedProduct = saved.find(item => item && String(item.id) === String(product.id));
      if (!savedProduct) throw new Error("This product is no longer available.");
      const reviews = Array.isArray(savedProduct.reviews) ? savedProduct.reviews : [];
      const activeSeller = getActiveSellerAccount();
      let reviewerEmail = String(activeSeller?.email || "").trim().toLowerCase();
      try {
        const customerAccount = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
        if (!reviewerEmail && customerAccount && customerAccount.profile) {
          reviewerEmail = String(customerAccount.profile.email || "").trim().toLowerCase();
        }
      } catch (error) {
        throw new Error("Customer account data is invalid.");
      }
      reviews.push({ reviewer, reviewerEmail, rating, comment, createdAt: new Date().toISOString() });
      savedProduct.reviews = reviews;
      localStorage.setItem(key, JSON.stringify(saved));
      product = savedProduct;
      form.reset();
      reviewMessage.textContent = "Thanks! Your review has been saved.";
      reviewMessage.classList.remove("error");
      showReviews();
    } catch (error) {
      reviewMessage.textContent = error instanceof Error && error.message === "This product is no longer available."
        ? error.message
        : "Unable to save your review in this browser. Please try again.";
      reviewMessage.classList.add("error");
    }
  });

  document.getElementById("hamburger").addEventListener("click", event => {
    const button = event.currentTarget;
    const navLinks = document.getElementById("navLinks");
    const open = navLinks.classList.toggle("show");
    button.setAttribute("aria-expanded", String(open));
    button.innerHTML = open
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });
  const navLinks = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("show");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  const categoriesToggle = document.getElementById("categoriesToggle");
  const categoriesDropdown = categoriesToggle.closest(".nav-dropdown");
  const closeCategories = () => {
    categoriesDropdown.classList.remove("open");
    categoriesToggle.setAttribute("aria-expanded", "false");
  };
  categoriesToggle.addEventListener("click", () => {
    const open = categoriesDropdown.classList.toggle("open");
    categoriesToggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", event => {
    if (!categoriesDropdown.contains(event.target)) closeCategories();
  });

  document.getElementById("searchToggle").addEventListener("click", event => {
    const button = event.currentTarget;
    const box = document.getElementById("mobileSearchBox");
    const open = box.classList.toggle("show-search");
    button.setAttribute("aria-expanded", String(open));
    if (open) box.querySelector("input").focus();
  });
  document.querySelectorAll("#searchForm, #mobileSearchBox").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const query = form.querySelector("input").value.trim();
      if (query) window.location.href = `../shop.html?search=${encodeURIComponent(query)}`;
    });
  });

  const sellerAccountMenu = document.getElementById("sellerAccountMenu");
  const sellerNavLink = document.getElementById("sellerNavLink");
  const sellerNavLabel = sellerNavLink.querySelector(".seller-menu-label");
  const sellerDropdown = document.getElementById("sellerDropdown");
  const sellerLogoutButton = document.getElementById("sellerLogoutButton");
  let loggedInSeller = null;
  try {
    const savedSeller = JSON.parse(localStorage.getItem("noireLoggedInSeller") || "null");
    if (savedSeller && savedSeller.email) loggedInSeller = savedSeller;
  } catch (error) {
    loggedInSeller = null;
  }
  function hasReturningSeller() {
    if (localStorage.getItem("noireSellerLoggedOut") === "true") return true;
    try {
      const accounts = JSON.parse(localStorage.getItem("noireSellerAccounts") || "[]");
      return Array.isArray(accounts) && accounts.some(account => account && account.email);
    } catch (error) {
      return false;
    }
  }
  if (loggedInSeller) {
    sellerNavLabel.textContent = loggedInSeller.storeName || "Seller Store";
    sellerAccountMenu.classList.add("is-logged-in");
  } else if (hasReturningSeller()) {
    sellerNavLabel.textContent = "Login";
  }
  const closeSellerDropdown = () => {
    sellerDropdown.hidden = true;
    sellerAccountMenu.classList.remove("open");
    sellerNavLink.setAttribute("aria-expanded", "false");
  };
  sellerNavLink.addEventListener("click", () => {
    if (!loggedInSeller) {
      window.location.href = hasReturningSeller()
        ? sellerAccountMenu.dataset.loginUrl
        : sellerAccountMenu.dataset.registerUrl;
      return;
    }
    const open = sellerDropdown.hidden;
    sellerDropdown.hidden = !open;
    sellerAccountMenu.classList.toggle("open", open);
    sellerNavLink.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", event => {
    if (!sellerAccountMenu.contains(event.target)) closeSellerDropdown();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeCategories();
    if (!sellerDropdown.hidden) {
      closeSellerDropdown();
      sellerNavLink.focus();
    }
  });
  sellerLogoutButton.addEventListener("click", () => {
    localStorage.removeItem("noireLoggedInSeller");
    localStorage.setItem("noireSellerLoggedOut", "true");
    window.location.href = sellerAccountMenu.dataset.homeUrl;
  });

  product = readProduct();
  renderProduct();
  updateCartCount();
  if (window.noireCustomerAuth) {
    window.noireCustomerAuth.resumePendingAction("add-to-cart", () =>
      document.getElementById("addToCart").click()
    );
    window.noireCustomerAuth.resumePendingAction("buy-now", () =>
      document.getElementById("buyNow").click()
    );
    window.noireCustomerAuth.resumePendingAction("wishlist", () =>
      document.getElementById("wishlistButton").click()
    );
  }
})();
