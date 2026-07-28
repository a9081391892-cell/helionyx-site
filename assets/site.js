(function () {
  const PRODUCTS = window.HELIONYX_PRODUCTS || [];
  const bySlug = Object.fromEntries(PRODUCTS.map((product) => [product.slug, product]));
  const storageKey = "helionyx-cart";

  const readCart = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  };

  let cart = readCart();

  const formatPrice = (value) =>
    new Intl.NumberFormat("ru-RU").format(value) + " ₽";

  const assetPrefix = () => {
    const path = window.location.pathname;
    if (path.includes("/products/")) return "../../";
    if (path.includes("/catalog/") || path.includes("/contacts/") || path.includes("/privacy/")) return "../";
    return "";
  };

  function saveCart() {
    localStorage.setItem(storageKey, JSON.stringify(cart));
    renderCart();
  }

  const getCartItems = () =>
    Object.entries(cart)
      .filter(([slug, quantity]) => bySlug[slug] && quantity > 0)
      .map(([slug, quantity]) => ({ ...bySlug[slug], quantity }));

  function syncDeliveryFields(select) {
    const method = select || document.querySelector("[data-delivery-method]");
    if (!method) return;
    const pvzBlock = document.querySelector("[data-delivery-pvz]");
    const courierBlock = document.querySelector("[data-delivery-courier]");
    const pvzInput = pvzBlock?.querySelector("input");
    const courierInput = courierBlock?.querySelector("input");
    const isCourier = method.value === "cdek-courier";

    if (pvzBlock) pvzBlock.hidden = isCourier;
    if (courierBlock) courierBlock.hidden = !isCourier;
    if (pvzInput) pvzInput.required = !isCourier;
    if (courierInput) courierInput.required = isCourier;
  }

  function ensureCheckoutForm() {
    const totalBlock = document.querySelector("[data-cart-total]")?.closest(".cart-total");
    if (!totalBlock || document.querySelector("[data-checkout-form]")) return;

    totalBlock.insertAdjacentHTML(
      "afterend",
      [
        '<form class="checkout-form" data-checkout-form>',
        "<h3>Оформление и оплата</h3>",
        '<p class="checkout-form__lead">Заполните данные покупателя. Защищённая оплата картой или через СБП станет доступна после активации магазина в ЮKassa.</p>',
        '<label class="checkout-field"><span>ФИО *</span><input name="customerName" type="text" autocomplete="name" minlength="5" maxlength="120" placeholder="Иванов Иван Иванович" required></label>',
        '<div class="checkout-form__grid">',
        '<label class="checkout-field"><span>Телефон *</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" placeholder="+7 900 000-00-00" required></label>',
        '<label class="checkout-field"><span>Email для чека *</span><input name="email" type="email" autocomplete="email" maxlength="120" placeholder="mail@example.ru" required></label>',
        "</div>",
        '<label class="checkout-field"><span>Модель пылесоса</span><input name="vacuumModel" type="text" maxlength="120" placeholder="Например: LG A9K-PRO1"></label>',
        '<div class="checkout-delivery">',
        "<h4>Доставка СДЭК</h4>",
        '<label class="checkout-field"><span>Город или населённый пункт *</span><input name="deliveryCity" type="text" autocomplete="address-level2" maxlength="120" placeholder="Например: Воронеж" required></label>',
        '<label class="checkout-field"><span>Способ получения *</span><select name="deliveryMethod" data-delivery-method required><option value="cdek-pvz">СДЭК — до пункта выдачи</option><option value="cdek-courier">СДЭК — курьером до адреса</option></select></label>',
        '<div data-delivery-pvz><label class="checkout-field"><span>Пункт выдачи СДЭК *</span><input name="cdekPvz" type="text" maxlength="180" placeholder="Код или адрес выбранного ПВЗ" required></label><a class="checkout-map-link" href="https://www.cdek.ru/ru/offices/" target="_blank" rel="noopener">Найти ПВЗ на карте СДЭК ↗</a></div>',
        '<div data-delivery-courier hidden><label class="checkout-field"><span>Адрес доставки *</span><input name="deliveryAddress" type="text" autocomplete="street-address" maxlength="240" placeholder="Улица, дом, квартира"></label></div>',
        '<p class="checkout-delivery__note">Стоимость и срок доставки рассчитываются перед оплатой.</p>',
        "</div>",
        '<label class="checkout-checkbox"><input name="consent" type="checkbox" required><span>Согласен на обработку персональных данных и принимаю <a href="' + assetPrefix() + 'privacy/" target="_blank" rel="noopener">политику конфиденциальности</a>.</span></label>',
        '<button class="button button--wide checkout-submit" type="button" disabled data-checkout-submit>Оплата подключается</button>',
        '<p class="checkout-payment-note">Данные пока никуда не отправляются. После подключения оплата будет проходить на защищённой странице ЮKassa; HELIONYX не получает и не хранит данные банковской карты.</p>',
        "</form>",
      ].join("")
    );

    const note = document.querySelector(".cart-note");
    if (note) note.textContent = "Стоимость и срок доставки подтверждаем перед оплатой.";
    syncDeliveryFields();
  }

  function renderCart() {
    ensureCheckoutForm();
    const items = getCartItems();
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    document.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = count;
    });

    const list = document.querySelector("[data-cart-items]");
    const empty = document.querySelector("[data-cart-empty]");
    const totalNode = document.querySelector("[data-cart-total]");
    const checkout = document.querySelector("[data-checkout-whatsapp]");
    if (!list || !empty || !totalNode || !checkout) return;

    list.innerHTML = items
      .map(
        (item) => `
        <div class="cart-item">
          <img src="${assetPrefix()}${item.image}" alt="">
          <div>
            <strong>${item.short}</strong>
            <span>${formatPrice(item.price)}</span>
            <div class="quantity">
              <button type="button" data-qty="${item.slug}" data-delta="-1">−</button>
              <b>${item.quantity}</b>
              <button type="button" data-qty="${item.slug}" data-delta="1">+</button>
            </div>
          </div>
          <button class="remove-item" type="button" data-remove="${item.slug}" aria-label="Удалить">×</button>
        </div>`
      )
      .join("");

    empty.hidden = items.length > 0;
    totalNode.textContent = formatPrice(total);
    checkout.classList.toggle("is-disabled", items.length === 0);

    const message = [
      "Здравствуйте! Хочу заказать аккумуляторы HELIONYX:",
      "",
      ...items.map(
        (item, index) =>
          `${index + 1}. ${item.title} — ${item.quantity} шт. × ${formatPrice(item.price)}`
      ),
      "",
      `Сумма товаров: ${formatPrice(total)}`,
      "Прошу проверить совместимость и рассчитать доставку.",
    ].join("\n");
    checkout.href = items.length
      ? `https://wa.me/79081445933?text=${encodeURIComponent(message)}`
      : "#";
  }

  function openCart() {
    document.body.classList.add("cart-open");
    document.querySelector("[data-cart-drawer]")?.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    document.body.classList.remove("cart-open");
    document.querySelector("[data-cart-drawer]")?.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-product]");
    if (add) {
      const slug = add.dataset.product;
      cart[slug] = (cart[slug] || 0) + 1;
      saveCart();
      openCart();
      return;
    }

    if (event.target.closest("[data-open-cart]")) openCart();
    if (event.target.closest("[data-close-cart]") || event.target.closest("[data-cart-overlay]")) closeCart();

    const quantity = event.target.closest("[data-qty]");
    if (quantity) {
      const slug = quantity.dataset.qty;
      cart[slug] = Math.max(0, (cart[slug] || 0) + Number(quantity.dataset.delta));
      if (!cart[slug]) delete cart[slug];
      saveCart();
    }

    const remove = event.target.closest("[data-remove]");
    if (remove) {
      delete cart[remove.dataset.remove];
      saveCart();
    }

    const thumb = event.target.closest("[data-gallery-image]");
    if (thumb) {
      document.querySelector("[data-gallery-main]")?.setAttribute("src", thumb.dataset.galleryImage);
      document.querySelectorAll("[data-gallery-image]").forEach((item) => item.classList.remove("is-active"));
      thumb.classList.add("is-active");
    }

    const filter = event.target.closest("[data-filter]");
    if (filter) {
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
      filter.classList.add("is-active");
      applyFilters();
    }

    if (event.target.closest("[data-menu]")) {
      document.body.classList.toggle("menu-open");
    }
  });

  function applyFilters() {
    const query = (document.querySelector("[data-product-search]")?.value || "").trim().toLowerCase();
    const filter = document.querySelector("[data-filter].is-active")?.dataset.filter || "all";
    let visible = 0;
    document.querySelectorAll(".product-card").forEach((card) => {
      const matchesQuery = !query || card.dataset.search.includes(query);
      const matchesFilter = filter === "all" || card.dataset.category === filter;
      const show = matchesQuery && matchesFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const noResults = document.querySelector("[data-no-results]");
    if (noResults) noResults.classList.toggle("is-visible", visible === 0);
  }

  document.querySelectorAll("[data-product-search]").forEach((input) => {
    input.addEventListener("input", applyFilters);
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q");
  const catalogSearch = document.querySelector("[data-product-search]");
  if (initialQuery && catalogSearch) {
    catalogSearch.value = initialQuery;
    applyFilters();
  }

  document.addEventListener("change", (event) => {
    const deliveryMethod = event.target.closest("[data-delivery-method]");
    if (deliveryMethod) syncDeliveryFields(deliveryMethod);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  renderCart();
})();
