(function () {
  const isCheckoutPage = window.location.pathname === "/checkout/";

  function routeCheckoutLink(link) {
    if (!link) return;
    link.textContent = "Перейти к оплате";
    link.classList.remove("button--whatsapp");
    link.setAttribute("href", "/checkout/");
    link.removeAttribute("target");
    link.dataset.checkoutPageLink = "true";
  }

  function normalizeCheckoutDrawer() {
    if (isCheckoutPage) return;

    document
      .querySelectorAll(".cart-drawer [data-checkout-form]")
      .forEach((form) => form.remove());

    document
      .querySelectorAll('.cart-drawer a[href^="tel:"]')
      .forEach((link) => link.remove());

    document
      .querySelectorAll(".cart-drawer [data-checkout-whatsapp]")
      .forEach(routeCheckoutLink);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (isCheckoutPage) return;

      const checkoutLink = event.target.closest(
        ".cart-drawer [data-checkout-whatsapp]"
      );

      if (checkoutLink) {
        event.preventDefault();
        if (checkoutLink.classList.contains("is-disabled")) return;
        window.location.assign("/checkout/");
        return;
      }

      if (
        event.target.closest(
          "[data-open-cart], [data-product], [data-qty], [data-remove]"
        )
      ) {
        window.setTimeout(normalizeCheckoutDrawer, 0);
      }
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeCheckoutDrawer, {
      once: true,
    });
  } else {
    normalizeCheckoutDrawer();
  }
})();
