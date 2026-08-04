(function () {
  "use strict";

  function removeBrokenConsentUi() {
    document.querySelectorAll("[data-cookie-consent]").forEach(function (node) {
      node.remove();
    });
    document.documentElement.style.pointerEvents = "";
    document.body.style.pointerEvents = "";
  }

  function ensurePersonalConsent() {
    document.querySelectorAll("[data-checkout-form]").forEach(function (form) {
      var personal = form.querySelector('input[name="consent"]');
      if (personal) {
        personal.setAttribute("data-personal-consent", "");
        personal.required = true;
      }
      form.querySelectorAll("[data-cookie-order-consent]").forEach(function (node) {
        var label = node.closest(".checkout-checkbox");
        if (label) label.remove();
        else node.remove();
      });
    });
  }

  function init() {
    removeBrokenConsentUi();
    ensurePersonalConsent();

    var observer = new MutationObserver(function () {
      removeBrokenConsentUi();
      ensurePersonalConsent();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
