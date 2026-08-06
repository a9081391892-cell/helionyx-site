(function () {
  const isCheckoutPage = window.location.pathname === "/checkout/";

  function routeCheckoutLink(link) {
    if (!link) return;
    link.textContent = "Перейти к оформлению";
    link.classList.remove("button--whatsapp");
    link.setAttribute("href", "/checkout/");
    link.removeAttribute("target");
    link.dataset.checkoutPageLink = "true";
  }

  function normalizeCartCopy() {
    document.querySelectorAll(".cart-drawer .cart-note").forEach((note) => {
      note.textContent =
        "На следующем шаге выберите город и способ доставки СДЭК. Итоговая сумма появится до оплаты.";
    });
  }

  function normalizeHomepageOrderSteps() {
    const path = window.location.pathname;
    if (path !== "/" && path !== "/index.html") return;

    const items = document.querySelectorAll(".order-steps ol > li");
    const steps = [
      {
        title: "Выберите аккумулятор",
        text: "Найдите модель через поиск или каталог и добавьте товар в корзину.",
      },
      {
        title: "Выберите доставку СДЭК",
        text: "Укажите город и выберите пункт выдачи или доставку курьером.",
      },
      {
        title: "Оплатите через СБП",
        text: "После расчёта доставки оплатите на защищённой странице ЮKassa. Чек придёт на email.",
      },
    ];

    items.forEach((item, index) => {
      const step = steps[index];
      if (!step) return;
      const title = item.querySelector("strong");
      const text = item.querySelector("p");
      if (title) title.textContent = step.title;
      if (text) text.textContent = step.text;
    });
  }

  function normalizeContactsCopy() {
    if (window.location.pathname !== "/contacts/") return;

    const heroText = document.querySelector(".page-hero p");
    if (heroText) {
      heroText.textContent =
        "Поможем проверить совместимость. Заказ оформляется в корзине: доставка СДЭК и оплата через СБП.";
    }

    document.querySelectorAll(".info-panel > div").forEach((panel) => {
      const heading = panel.querySelector("h2")?.textContent.trim();
      const text = panel.querySelector("p");
      if (!text) return;

      if (heading === "Оформление и оплата") {
        text.textContent =
          "Добавьте товар в корзину, перейдите к оформлению, укажите получателя, город и способ доставки СДЭК. После расчёта итоговой суммы оплатите через СБП на защищённой странице ЮKassa. Фискальный чек придёт на указанный email. Если СБП временно недоступна или нужна проверка совместимости, напишите нам в WhatsApp.";
      }

      if (heading === "Доставка СДЭК") {
        text.textContent =
          "Можно выбрать пункт выдачи СДЭК или доставку курьером. Стоимость и ориентировочный срок рассчитываются до оплаты. Литий-ионные аккумуляторы отправляем только наземным транспортом.";
      }
    });
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

    normalizeCartCopy();
  }

  function normalizePageCopy() {
    normalizeHomepageOrderSteps();
    normalizeContactsCopy();
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

  function init() {
    normalizePageCopy();
    normalizeCheckoutDrawer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
