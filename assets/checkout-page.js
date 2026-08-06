(function () {
  if (window.location.pathname !== "/checkout/") return;

  function arrangeCheckout() {
    const form = document.querySelector("[data-checkout-form]");
    const layout = document.querySelector(".checkout-layout");
    const productsCard = document.querySelector(".checkout-products");
    const totalCard = document.querySelector(".checkout-total-card");

    if (!form || !layout || !productsCard || !totalCard) return false;
    if (form.dataset.arranged === "true") return true;

    form.dataset.arranged = "true";
    form.classList.add("checkout-form--page");

    /*
     * site.js initially creates the checkout form inside totalCard.
     * Move it out before moving totalCard, otherwise appending the new
     * columns to the form would try to put an ancestor inside its child.
     */
    layout.appendChild(form);

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
    security.innerHTML = [
      "<strong>Безопасная оплата</strong>",
      "<span>Оплата проходит на защищённой странице ЮKassa. Данные банковской карты не передаются HELIONYX.</span>",
      '<a href="contacts/">Оплата, доставка и возврат</a>',
      '<a href="https://wa.me/79081445933?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%21%20%D0%9C%D0%BD%D0%B5%20%D0%BD%D1%83%D0%B6%D0%BD%D0%B0%20%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%20%D1%81%20%D0%BE%D1%84%D0%BE%D1%80%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%D0%BC%20%D0%B7%D0%B0%D0%BA%D0%B0%D0%B7%D0%B0%20HELIONYX." target="_blank" rel="noopener">Нужна помощь или СБП временно недоступна — написать в WhatsApp</a>',
    ].join("");
    paymentCard.appendChild(security);

    leftColumn.append(productsCard, detailsCard);
    rightColumn.append(totalCard, paymentCard);
    form.append(leftColumn, rightColumn);
    layout.replaceChildren(form);

    return true;
  }

  arrangeCheckout();
})();
