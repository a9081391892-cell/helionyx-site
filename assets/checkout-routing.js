(function () {
  const isCheckoutPage = window.location.pathname === "/checkout/";

  function applyCheckoutRouting() {
    if (isCheckoutPage) return;
    document.querySelectorAll(".cart-drawer [data-checkout-form]").forEach((form) => form.remove());
    document.querySelectorAll("[data-checkout-whatsapp]").forEach((link) => {
      link.textContent = "Оформить заказ";
      link.setAttribute("href", "/checkout/");
      link.removeAttribute("target");
      link.dataset.checkoutPageLink = "true";
    });
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('[data-checkout-page-link="true"]');
    if (!link) return;
    event.preventDefault();
    if (link.classList.contains("is-disabled")) return;
    window.location.assign("/checkout/");
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyCheckoutRouting);
  else applyCheckoutRouting();

  const observer = new MutationObserver(applyCheckoutRouting);
  observer.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:["href", "class"]});
})();
