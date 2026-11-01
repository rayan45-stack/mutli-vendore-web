(() => {
  const currentPath = decodeURIComponent(window.location.pathname).toLowerCase();
  if (currentPath.includes("/seller panel/") || document.getElementById("page-overview")) {
    document.body.classList.add("panel-no-button-transition");
  }

  const hoverPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const desktopHover = () => hoverPointer.matches && window.matchMedia("(min-width: 961px)").matches;
  const categoryMenus = document.querySelectorAll(".nav-dropdown");
  const sellerMenus = document.querySelectorAll(".seller-account");
  const hoverCloseTimers = new WeakMap();
  const categoryIcons = {
    electronics: "fa-solid fa-laptop",
    fashion: "fa-solid fa-shirt",
    home: "fa-solid fa-house",
    beauty: "fa-solid fa-spa",
    sports: "fa-solid fa-futbol",
    books: "fa-solid fa-book-open"
  };

  document.querySelectorAll(".categories-menu a").forEach(link => {
    if (link.querySelector(".category-menu-icon")) return;
    const category = new URL(link.href, window.location.href).searchParams.get("category");
    const iconClass = categoryIcons[category];
    if (!iconClass) return;

    const icon = document.createElement("i");
    icon.className = `${iconClass} category-menu-icon`;
    icon.setAttribute("aria-hidden", "true");
    link.prepend(icon);
  });

  function cancelHoverClose(menu) {
    window.clearTimeout(hoverCloseTimers.get(menu));
    hoverCloseTimers.delete(menu);
  }

  function scheduleHoverClose(menu, close) {
    cancelHoverClose(menu);
    hoverCloseTimers.set(menu, window.setTimeout(close, 250));
  }

  function setCategoryMenu(menu, open) {
    menu.classList.toggle("hover-open", open);
    menu.classList.toggle("open", open);
    menu.querySelector(".categories-toggle")?.setAttribute("aria-expanded", String(open));
  }

  function setSellerMenu(menu, open) {
    const dropdown = menu.querySelector(".seller-dropdown");
    const trigger = menu.querySelector(".seller-menu-trigger");
    if (!dropdown || !trigger) return;

    menu.classList.toggle("hover-open", open);
    menu.classList.toggle("open", open);
    dropdown.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  }

  categoryMenus.forEach(menu => {
    menu.addEventListener("pointerenter", event => {
      if (desktopHover() && event.pointerType !== "touch") {
        cancelHoverClose(menu);
        setCategoryMenu(menu, true);
      }
    });
    menu.addEventListener("pointerleave", event => {
      if (desktopHover() && event.pointerType !== "touch") {
        scheduleHoverClose(menu, () => setCategoryMenu(menu, false));
      }
    });
    menu.addEventListener("focusin", event => {
      if (event.target.matches(":focus-visible")) setCategoryMenu(menu, true);
    });
    menu.addEventListener("focusout", event => {
      if (!menu.contains(event.relatedTarget) && !menu.matches(":hover")) setCategoryMenu(menu, false);
    });
  });

  sellerMenus.forEach(menu => {
    menu.addEventListener("pointerenter", event => {
      if (desktopHover() && event.pointerType !== "touch") {
        cancelHoverClose(menu);
      }
      if (desktopHover() && event.pointerType !== "touch" && menu.classList.contains("is-logged-in")) {
        setSellerMenu(menu, true);
      }
    });
    menu.addEventListener("pointerleave", event => {
      if (desktopHover() && event.pointerType !== "touch") {
        scheduleHoverClose(menu, () => setSellerMenu(menu, false));
      }
    });
    menu.addEventListener("focusin", event => {
      if (event.target.matches(":focus-visible") && menu.classList.contains("is-logged-in")) {
        setSellerMenu(menu, true);
      }
    });
    menu.addEventListener("focusout", event => {
      if (!menu.contains(event.relatedTarget) && !menu.matches(":hover")) setSellerMenu(menu, false);
    });
  });

  document.addEventListener("click", event => {
    if (!desktopHover() || event.detail === 0) return;
    const categoryToggle = event.target.closest(".categories-toggle");
    if (categoryToggle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const sellerTrigger = event.target.closest(".seller-menu-trigger");
    const sellerMenu = sellerTrigger?.closest(".seller-account");
    if (sellerMenu?.classList.contains("is-logged-in")) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    categoryMenus.forEach(menu => setCategoryMenu(menu, false));
    sellerMenus.forEach(menu => setSellerMenu(menu, false));
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.body.classList.add("motion-ready");

  const pageContent = document.querySelector("main, .main-content, .content");
  if (pageContent) pageContent.classList.add("motion-enter");

  const revealSelector = [
    ".category-card",
    ".shop-card",
    ".product-card",
    ".store-product-card",
    ".checkout-card",
    ".summary-card",
    ".order-card",
    ".cart-item",
    ".quick-actions > button",
    ".settings-card",
    ".address-item",
    ".stat-card"
  ].join(",");
  if (!("IntersectionObserver" in window)) return;
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

  function observeRevealItems(root) {
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root instanceof Element && root.matches(revealSelector) && !root.classList.contains("motion-reveal")) {
      root.classList.add("motion-reveal");
      revealObserver.observe(root);
    }
    root.querySelectorAll(revealSelector).forEach(element => {
      if (element.classList.contains("motion-reveal")) return;
      element.classList.add("motion-reveal");
      revealObserver.observe(element);
    });
  }

  observeRevealItems(document);
  const contentObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(observeRevealItems));
  });
  contentObserver.observe(document.body, { childList: true, subtree: true });
})();
