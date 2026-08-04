(function () {
  const isCheckoutPage = window.location.pathname === "/checkout/";

  function routeCheckoutLink(link) {
    if (!link || link.dataset.checkoutPageLink === "true") return;
    link.textContent = "Перейти к оплате";
    link.classList.remove("button--whatsapp");
    link.setAttribute("href", "/checkout/");
    link.removeAttribute("target");
    link.dataset.checkoutPageLink = "true";
  }

  function applyCheckoutRouting(root) {
    if (isCheckoutPage) return;
    const scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll?.(".cart-drawer [data-checkout-form]").forEach((form) => form.remove());
    scope.querySelectorAll?.('.cart-drawer a[href^="tel:"]').forEach((link) => link.remove());
    scope.querySelectorAll?.(".cart-drawer [data-checkout-whatsapp]").forEach(routeCheckoutLink);

    if (scope.matches?.(".cart-drawer [data-checkout-whatsapp]")) routeCheckoutLink(scope);
    if (scope.matches?.(".cart-drawer [data-checkout-form]")) scope.remove();
    if (scope.matches?.('.cart-drawer a[href^="tel:"]')) scope.remove();
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('[data-checkout-page-link="true"]');
    if (!link) return;
    event.preventDefault();
    if (link.classList.contains("is-disabled")) return;
    window.location.assign("/checkout/");
  }, true);

  function init() {
    applyCheckoutRouting(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) applyCheckoutRouting(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
