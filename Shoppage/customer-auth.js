(() => {
  const scriptUrl = document.currentScript && document.currentScript.src;
  const registerUrl = scriptUrl
    ? new URL("../Costumer register/customer-register.html", scriptUrl)
    : null;

  function getCustomerSession() {
    try {
      const session = JSON.parse(localStorage.getItem("noireLoggedInCustomer") || "null");
      if (!session || !session.email) return null;
      const account = JSON.parse(localStorage.getItem("noireCustomerAccount_v1") || "null");
      const accountEmail = String(account?.profile?.email || "").trim().toLowerCase();
      return accountEmail === String(session.email).trim().toLowerCase() ? session : null;
    } catch (error) {
      return null;
    }
  }

  function requireCustomer(action) {
    if (getCustomerSession()) return true;
    if (!registerUrl) {
      console.error("Customer registration page URL is unavailable.");
      return false;
    }
    const currentUrl = new URL(window.location.href);
    try {
      sessionStorage.setItem("noireCustomerPendingAction", JSON.stringify({
        action,
        returnTo: currentUrl.href
      }));
    } catch (error) {
      console.error("Unable to save the pending customer action.", error);
    }
    const destination = new URL(registerUrl.href);
    destination.searchParams.set("return", currentUrl.href);
    if (action) destination.searchParams.set("action", action);
    window.location.href = destination.href;
    return false;
  }

  function resumePendingAction(action, callback) {
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem("noireCustomerPendingAction") || "null");
    } catch (error) {
      console.error("Unable to read the pending customer action.", error);
      return false;
    }
    if (!pending || pending.action !== action || !pending.returnTo) return false;
    const expected = new URL(pending.returnTo);
    const current = new URL(window.location.href);
    if (expected.pathname !== current.pathname || expected.search !== current.search) return false;
    sessionStorage.removeItem("noireCustomerPendingAction");
    if (getCustomerSession() && typeof callback === "function") callback();
    return true;
  }

  window.noireCustomerAuth = { getCustomerSession, requireCustomer, resumePendingAction };
})();
