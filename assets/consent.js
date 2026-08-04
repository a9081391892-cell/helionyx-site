(function () {
  "use strict";

  var COOKIE_KEY = "helionyx-cookie-consent";
  var COOKIE_VERSION = "2026-08-04";

  function getCookieChoice() {
    try {
      var saved = JSON.parse(localStorage.getItem(COOKIE_KEY) || "null");
      return saved && saved.version === COOKIE_VERSION ? saved.choice : "";
    } catch (error) {
      return "";
    }
  }

  function saveCookieChoice(choice) {
    try {
      localStorage.setItem(
        COOKIE_KEY,
        JSON.stringify({ choice: choice, version: COOKIE_VERSION, savedAt: new Date().toISOString() })
      );
    } catch (error) {}
    window.dispatchEvent(new CustomEvent("helionyx:cookie-consent", { detail: { choice: choice } }));
    syncCookieCheckboxes();
  }

  function privacyHref() {
    return "/privacy/";
  }

  function addStyles() {
    if (document.querySelector("style[data-consent-styles]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-consent-styles", "");
    style.textContent = [
      ".cookie-consent{position:fixed!important;left:20px;right:20px;bottom:20px;z-index:2147483647!important;max-width:920px;margin:auto;background:#fff;border:1px solid rgba(13,95,255,.18);border-radius:18px;box-shadow:0 18px 60px rgba(15,23,42,.2);padding:18px;pointer-events:auto!important;isolation:isolate;transform:translateZ(0)}",
      ".cookie-consent,.cookie-consent *{pointer-events:auto!important}",
      ".cookie-consent__inner{display:flex;align-items:center;gap:18px;justify-content:space-between}",
      ".cookie-consent__copy{font-size:14px;line-height:1.5;color:#334155}",
      ".cookie-consent__copy strong{display:block;margin-bottom:4px;color:#0f172a;font-size:16px}",
      ".cookie-consent__copy a{color:#0d5fff;text-decoration:underline;cursor:pointer!important}",
      ".cookie-consent__actions{display:flex;gap:10px;flex:0 0 auto;position:relative;z-index:2}",
      ".cookie-consent__button{position:relative;z-index:3;border:1px solid #0d5fff;border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer!important;background:#fff;color:#0d5fff;touch-action:manipulation;user-select:none}",
      ".cookie-consent__button--accept{background:#0d5fff;color:#fff}",
      ".checkout-cookie-note{margin-top:10px}",
      ".consent-error{margin:8px 0 0;color:#b42318;font-size:13px;line-height:1.4}",
      "@media(max-width:700px){.cookie-consent{left:10px;right:10px;bottom:10px;padding:15px}.cookie-consent__inner{align-items:stretch;flex-direction:column}.cookie-consent__actions{width:100%}.cookie-consent__button{flex:1;padding:11px 8px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function closeCookieBanner() {
    var banner = document.querySelector("[data-cookie-consent]");
    if (banner) banner.remove();
  }

  function chooseCookies(choice, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
    saveCookieChoice(choice);
    closeCookieBanner();
  }

  function showCookieBanner() {
    if (getCookieChoice() || document.querySelector("[data-cookie-consent]")) return;

    var banner = document.createElement("section");
    banner.className = "cookie-consent";
    banner.setAttribute("data-cookie-consent", "");
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Согласие на использование файлов cookie");
    banner.innerHTML =
      '<div class="cookie-consent__inner">' +
        '<div class="cookie-consent__copy"><strong>Файлы cookie</strong>Сайт использует необходимые файлы cookie и локальное хранилище для работы корзины. Аналитические cookie применяются только после согласия. Подробнее — в <a href="' + privacyHref() + '">политике конфиденциальности</a>.</div>' +
        '<div class="cookie-consent__actions">' +
          '<button class="cookie-consent__button" type="button" data-cookie-reject>Только необходимые</button>' +
          '<button class="cookie-consent__button cookie-consent__button--accept" type="button" data-cookie-accept>Согласен</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);

    var accept = banner.querySelector("[data-cookie-accept]");
    var reject = banner.querySelector("[data-cookie-reject]");
    if (accept) accept.addEventListener("click", function (event) { chooseCookies("accepted", event); }, true);
    if (reject) reject.addEventListener("click", function (event) { chooseCookies("necessary", event); }, true);
  }

  function syncCookieCheckboxes() {
    var accepted = getCookieChoice() === "accepted";
    document.querySelectorAll("[data-cookie-order-consent]").forEach(function (input) {
      input.checked = accepted;
    });
  }

  function ensureOrderConsents() {
    document.querySelectorAll("[data-checkout-form]").forEach(function (form) {
      var personal = form.querySelector('input[name="consent"]');
      if (personal) {
        personal.setAttribute("data-personal-consent", "");
        personal.required = true;
      }

      if (!form.querySelector("[data-cookie-order-consent]")) {
        var personalLabel = personal && personal.closest(".checkout-checkbox");
        if (personalLabel) {
          personalLabel.insertAdjacentHTML(
            "afterend",
            '<label class="checkout-checkbox checkout-cookie-note"><input type="checkbox" data-cookie-order-consent><span>Согласен на использование аналитических файлов cookie. Согласие добровольное и не влияет на возможность оформить заказ. <a href="' + privacyHref() + '" target="_blank" rel="noopener">Подробнее</a>.</span></label>'
          );
        }
      }
      syncCookieCheckboxes();
    });
  }

  function showPersonalConsentError(form) {
    var existing = form.querySelector("[data-personal-consent-error]");
    if (!existing) {
      existing = document.createElement("p");
      existing.className = "consent-error";
      existing.setAttribute("data-personal-consent-error", "");
      existing.textContent = "Для оформления заказа подтвердите согласие на обработку персональных данных.";
      var personal = form.querySelector("[data-personal-consent]");
      if (personal && personal.closest(".checkout-checkbox")) {
        personal.closest(".checkout-checkbox").insertAdjacentElement("afterend", existing);
      }
    }
    var field = form.querySelector("[data-personal-consent]");
    if (field) field.focus();
  }

  document.addEventListener("click", function (event) {
    var whatsapp = event.target.closest && event.target.closest("[data-checkout-whatsapp]");
    if (whatsapp && !whatsapp.classList.contains("is-disabled")) {
      var form = document.querySelector("[data-checkout-form]");
      var personal = form && form.querySelector("[data-personal-consent]");
      if (personal && !personal.checked) {
        event.preventDefault();
        showPersonalConsentError(form);
      }
    }
  }, true);

  document.addEventListener("change", function (event) {
    var cookieCheckbox = event.target.closest && event.target.closest("[data-cookie-order-consent]");
    if (cookieCheckbox) {
      saveCookieChoice(cookieCheckbox.checked ? "accepted" : "necessary");
      closeCookieBanner();
    }
    var personal = event.target.closest && event.target.closest("[data-personal-consent]");
    if (personal && personal.checked) {
      var form = personal.closest("[data-checkout-form]");
      var error = form && form.querySelector("[data-personal-consent-error]");
      if (error) error.remove();
    }
  });

  function init() {
    addStyles();
    ensureOrderConsents();
    showCookieBanner();

    var observer = new MutationObserver(function () {
      ensureOrderConsents();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
