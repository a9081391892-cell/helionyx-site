(function () {
  if (window.location.pathname !== "/checkout/") return;

  function arrangeCheckout() {
    const form = document.querySelector("[data-checkout-form]");
    const detailsHost = document.querySelector("[data-checkout-details-host]");
    const sidebar = document.querySelector("[data-checkout-sidebar]");
    if (!form || !detailsHost || !sidebar || form.dataset.arranged === "true") return false;

    form.dataset.arranged = "true";
    form.classList.add("checkout-form--page");

    const detailsCard = document.createElement("section");
    detailsCard.className = "checkout-card checkout-details";
    detailsCard.innerHTML = '<div><span class="eyebrow">Получатель и доставка</span><h2>Данные заказа</h2></div>';

    const paymentCard = document.createElement("section");
    paymentCard.className = "checkout-card checkout-payment-card";
    paymentCard.innerHTML = '<div><span class="eyebrow">Оплата</span><h2>Итог заказа</h2></div>';

    const summary = form.querySelector("[data-order-summary]");
    const consent = form.querySelector('.checkout-checkbox input[name="consent"]')?.closest(".checkout-checkbox");
    const analytics = form.querySelector('.checkout-checkbox input[name="analyticsConsent"]')?.closest(".checkout-checkbox");
    const submit = form.querySelector("[data-checkout-submit]");
    const status = form.querySelector("[data-checkout-status]");

    Array.from(form.children).forEach((node) => {
      if ([summary, consent, analytics, submit, status].includes(node)) return;
      detailsCard.appendChild(node);
    });

    if (summary) paymentCard.appendChild(summary);
    if (consent) paymentCard.appendChild(consent);
    if (analytics) paymentCard.appendChild(analytics);
    if (submit) paymentCard.appendChild(submit);
    if (status) paymentCard.appendChild(status);

    const security = document.createElement("div");
    security.className = "checkout-security";
    security.innerHTML = '<strong>Безопасная оплата</strong><span>Оплата проходит на защищённой странице ЮKassa. Данные банковской карты не передаются HELIONYX.</span><a href="contacts/">Оплата, доставка и возврат</a>';
    paymentCard.appendChild(security);

    detailsHost.appendChild(detailsCard);
    sidebar.appendChild(paymentCard);
    form.append(detailsCard, paymentCard);
    return true;
  }

  if (arrangeCheckout()) return;
  const observer = new MutationObserver(() => {
    if (arrangeCheckout()) observer.disconnect();
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();
