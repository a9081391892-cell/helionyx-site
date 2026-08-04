(function () {
  if (window.location.pathname !== "/checkout/") return;

  function arrangeCheckout() {
    const form = document.querySelector("[data-checkout-form]");
    const layout = document.querySelector(".checkout-layout");
    const productsCard = document.querySelector(".checkout-products");
    const totalCard = document.querySelector(".checkout-total-card");
    if (!form || !layout || !productsCard || !totalCard || form.dataset.arranged === "true") return false;

    form.dataset.arranged = "true";
    form.classList.add("checkout-form--page");

    const leftColumn = document.createElement("div");
    leftColumn.className = "checkout-main";
    const rightColumn = document.createElement("aside");
    rightColumn.className = "checkout-sidebar";

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

    leftColumn.append(productsCard, detailsCard);
    rightColumn.append(totalCard, paymentCard);
    form.append(leftColumn, rightColumn);
    layout.replaceChildren(form);
    return true;
  }

  if (arrangeCheckout()) return;
  const observer = new MutationObserver(() => {
    if (arrangeCheckout()) observer.disconnect();
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();
