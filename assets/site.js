(function () {
  if (!document.querySelector('link[rel~="icon"]')) {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/svg+xml";
    favicon.href = "/favicon.svg";
    document.head.appendChild(favicon);
  }

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
  let citySearchTimer;
  let citySearchController;
  let paymentAvailable = false;
  let paymentConfigRequested = false;

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


  function currentQuoteKey(form, items = getCartItems()) {
    const cityCode = form?.querySelector("[data-cdek-city-code]")?.value || "";
    const method = form?.querySelector("[data-delivery-method]")?.value || "";
    const cartSignature = items.map((item) => `${item.slug}:${item.quantity}`).sort().join(",");
    return cityCode && method && cartSignature ? [cityCode, method, cartSignature].join(":") : "";
  }

  function hideOrderSummary(form) {
    const summary = form?.querySelector("[data-order-summary]");
    if (summary) summary.hidden = true;
  }

  function showOrderSummary(form, goodsTotal, deliveryAmount) {
    const summary = form?.querySelector("[data-order-summary]");
    if (!summary) return;
    const goods = summary.querySelector("[data-summary-goods]");
    const delivery = summary.querySelector("[data-summary-delivery]");
    const total = summary.querySelector("[data-summary-total]");
    if (goods) goods.textContent = formatPrice(goodsTotal);
    if (delivery) delivery.textContent = formatPrice(deliveryAmount);
    if (total) total.textContent = formatPrice(goodsTotal + deliveryAmount);
    summary.hidden = false;
  }

  async function loadOrderQuote(form) {
    const items = getCartItems();
    const key = currentQuoteKey(form, items);
    const status = form?.querySelector("[data-delivery-quote]");
    const goodsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!form || !key || !paymentAvailable) {
      if (status && !key) status.textContent = "";
      hideOrderSummary(form);
      renderPaymentButton(form, items);
      return;
    }
    if (form.dataset.quoteKey === key) {
      const deliveryAmount = Number(form.dataset.deliveryAmount);
      if (Number.isFinite(deliveryAmount)) showOrderSummary(form, goodsTotal, deliveryAmount);
      renderPaymentButton(form, items);
      return;
    }

    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    if (status) status.textContent = "Рассчитываем доставку СДЭК…";
    form.dataset.quoteKey = "";
    form.dataset.deliveryAmount = "";
    hideOrderSummary(form);

    try {
      const response = await fetch("/api/cdek/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          cdekCityCode: form.querySelector("[data-cdek-city-code]")?.value || "",
          deliveryMethod: form.querySelector("[data-delivery-method]")?.value || "",
          quantity,
        }),
      });
      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Не удалось рассчитать доставку.");
      const deliveryAmount = Number(payload.amount);
      if (!Number.isFinite(deliveryAmount)) throw new Error("СДЭК вернул некорректную стоимость доставки.");
      form.dataset.quoteKey = key;
      form.dataset.deliveryAmount = String(deliveryAmount);
      showOrderSummary(form, goodsTotal, deliveryAmount);
      if (status) {
        status.textContent = payload.period_min
          ? `Ориентировочный срок доставки: ${payload.period_min}–${payload.period_max || payload.period_min} дн.`
          : "Стоимость доставки рассчитана.";
      }
    } catch (error) {
      form.dataset.deliveryAmount = "";
      hideOrderSummary(form);
      if (status) status.textContent = error.message || "Не удалось рассчитать доставку.";
    }
    renderPaymentButton(form, items);
  }

  function renderPaymentButton(form, items = getCartItems()) {
    const button = form?.querySelector("[data-checkout-submit]");
    if (!button) return;
    const quoteReady = form.dataset.quoteKey === currentQuoteKey(form, items);
    button.disabled = !paymentAvailable || !items.length || !quoteReady;
    button.textContent = paymentAvailable ? "Оплатить через СБП" : "Оплата временно закрыта";
  }

  async function loadPaymentConfig(form) {
    if (paymentConfigRequested) return;
    paymentConfigRequested = true;
    const lead = form?.querySelector("[data-checkout-lead]");
    const note = form?.querySelector("[data-checkout-status]");
    try {
      const response = await fetch("/api/payment/config", {headers: {Accept: "application/json"}});
      const payload = await readApiJson(response);
      paymentAvailable = Boolean(response.ok && payload.available);
      if (lead) lead.textContent = payload.message || "Статус оплаты временно недоступен.";
      if (note) {
        note.textContent = paymentAvailable
          ? "Оплата проходит на защищённой странице ЮKassa. Данные банковской карты не передаются HELIONYX."
          : "Заказ можно оформить через WhatsApp. Кнопку СБП включим после контрольной проверки.";
      }
    } catch {
      paymentAvailable = false;
      if (lead) lead.textContent = "Проверяем готовность оплаты через СБП.";
    }
    renderPaymentButton(form);
    if (paymentAvailable) loadOrderQuote(form);
  }

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
        '<p class="checkout-form__lead" data-checkout-lead>СБП и чеки подключены. Завершаем техническую проверку.</p>',
        '<label class="checkout-field"><span>ФИО *</span><input name="customerName" type="text" autocomplete="name" minlength="5" maxlength="120" placeholder="Иванов Иван Иванович" required></label>',
        '<div class="checkout-form__grid">',
        '<label class="checkout-field"><span>Телефон *</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" placeholder="+7 900 000-00-00" required></label>',
        '<label class="checkout-field"><span>Email для чека *</span><input name="email" type="email" autocomplete="email" maxlength="120" placeholder="mail@example.ru" required></label>',
        "</div>",
        '<label class="checkout-field"><span>Модель пылесоса</span><input name="vacuumModel" type="text" maxlength="120" placeholder="Например: LG A9K-PRO1"></label>',
        '<div class="checkout-delivery">',
        "<h4>Доставка СДЭК</h4>",
        '<div class="checkout-city-field"><label class="checkout-field"><span>Город или населённый пункт *</span><input name="deliveryCity" data-delivery-city type="text" autocomplete="off" maxlength="120" placeholder="Начните вводить: Воронеж" role="combobox" aria-autocomplete="list" aria-expanded="false" required></label><input name="cdekCityCode" data-cdek-city-code type="hidden"><div class="checkout-city-suggestions" data-city-suggestions role="listbox" hidden></div><p class="checkout-city-status" data-city-status aria-live="polite"></p></div>',
        '<label class="checkout-field"><span>Способ получения *</span><select name="deliveryMethod" data-delivery-method required><option value="cdek-pvz">СДЭК — до пункта выдачи</option><option value="cdek-courier">СДЭК — курьером до адреса</option></select></label>',
        '<div data-delivery-pvz><label class="checkout-field"><span>Пункт выдачи СДЭК *</span><input name="cdekPvz" data-cdek-pvz type="text" maxlength="180" placeholder="Сначала укажите город и загрузите ПВЗ" required></label><div class="checkout-pvz-actions"><button class="checkout-map-button" type="button" data-load-pvz>Показать ПВЗ СДЭК</button><a class="checkout-map-link" href="https://www.cdek.ru/ru/offices/" target="_blank" rel="noopener">Открыть карту ↗</a></div><p class="checkout-pvz-status" data-pvz-status role="status" aria-live="polite"></p><label class="checkout-field" data-pvz-select-wrap hidden><span>Выберите удобный пункт</span><select data-pvz-select><option value="">Выберите ПВЗ</option></select></label></div>',
        '<div data-delivery-courier hidden><label class="checkout-field"><span>Адрес доставки *</span><input name="deliveryAddress" type="text" autocomplete="street-address" maxlength="240" placeholder="Улица, дом, квартира"></label></div>',
        '<p class="checkout-delivery__note">Литий-ионные аккумуляторы отправляем СДЭК только наземным транспортом.</p><p class="checkout-delivery__note" data-delivery-quote aria-live="polite"></p>',
        "</div>",
        '<div class="checkout-summary" data-order-summary aria-live="polite" hidden>',
        '<div class="checkout-summary__row"><span>Товары</span><strong data-summary-goods>—</strong></div>',
        '<div class="checkout-summary__row"><span>Доставка СДЭК</span><strong data-summary-delivery>—</strong></div>',
        '<div class="checkout-summary__row checkout-summary__total"><span>Итого к оплате</span><strong data-summary-total>—</strong></div>',
        '<p class="checkout-summary__note">Доставка уже включена в итог. В ЮKassa будет выставлена именно эта сумма.</p>',
        "</div>",
        '<label class="checkout-checkbox"><input name="consent" type="checkbox" required><span>Согласен на обработку персональных данных и принимаю <a href="' + assetPrefix() + 'privacy/" target="_blank" rel="noopener">политику конфиденциальности</a>.</span></label>',
        '<button class="button button--wide checkout-submit" type="submit" disabled data-checkout-submit>Оплата временно закрыта</button>',
        '<p class="checkout-payment-note" data-checkout-status>До завершения контрольной проверки заказ можно оформить через WhatsApp.</p>',
        "</form>",
      ].join("")
    );

    const note = document.querySelector(".cart-note");
    if (note) note.textContent = "Стоимость и срок доставки подтверждаем перед оплатой.";
    syncDeliveryFields();
    loadPaymentConfig(document.querySelector("[data-checkout-form]"));
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
    const paymentForm = document.querySelector("[data-checkout-form]");
    renderPaymentButton(paymentForm, items);
    if (paymentAvailable) loadOrderQuote(paymentForm);

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

  function closeCitySuggestions(form) {
    const suggestions = form?.querySelector("[data-city-suggestions]");
    const input = form?.querySelector("[data-delivery-city]");
    if (suggestions) suggestions.hidden = true;
    if (input) input.setAttribute("aria-expanded", "false");
  }

  async function readApiJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Сервис временно недоступен. Попробуйте ещё раз через минуту.");
    }
    return response.json();
  }

  async function loadCitySuggestions(input) {
    const form = input.closest("[data-checkout-form]");
    const suggestions = form?.querySelector("[data-city-suggestions]");
    const status = form?.querySelector("[data-city-status]");
    const query = input.value.trim();
    if (!form || !suggestions || query.length < 2) {
      closeCitySuggestions(form);
      if (status) status.textContent = query ? "Введите ещё одну букву." : "";
      return;
    }

    citySearchController?.abort();
    citySearchController = new AbortController();
    if (status) status.textContent = "Ищем населённый пункт…";

    try {
      const response = await fetch(`/api/cdek/cities?q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
        signal: citySearchController.signal,
      });
      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить города.");
      const cities = Array.isArray(payload.cities) ? payload.cities : [];
      suggestions.replaceChildren();

      cities.forEach((city) => {
        const details = [city.sub_region, city.region].filter(Boolean);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "checkout-city-option";
        button.dataset.cityOption = "";
        button.dataset.cityCode = city.code;
        button.dataset.cityName = city.name;
        const name = document.createElement("strong");
        name.textContent = city.name;
        const region = document.createElement("span");
        region.textContent = details.join(", ");
        button.append(name, region);
        suggestions.append(button);
      });

      suggestions.hidden = cities.length === 0;
      input.setAttribute("aria-expanded", cities.length ? "true" : "false");
      if (status) status.textContent = cities.length ? "Выберите населённый пункт из списка." : "Ничего не найдено.";
    } catch (error) {
      if (error.name === "AbortError") return;
      closeCitySuggestions(form);
      if (status) status.textContent = error.message || "Не удалось загрузить города.";
    }
  }

  function scheduleCitySearch(input) {
    window.clearTimeout(citySearchTimer);
    citySearchTimer = window.setTimeout(() => loadCitySuggestions(input), 350);
  }

  async function loadPickupPoints(button, selectedCityCode = "") {
    if (button.disabled) return;
    const form = button.closest("[data-checkout-form]");
    const cityInput = form?.querySelector("[data-delivery-city]");
    const cityCodeInput = form?.querySelector("[data-cdek-city-code]");
    const status = form?.querySelector("[data-pvz-status]");
    const select = form?.querySelector("[data-pvz-select]");
    const selectWrap = form?.querySelector("[data-pvz-select-wrap]");
    const pvzInput = form?.querySelector("[data-cdek-pvz]");
    const city = (cityInput?.value || "").trim();
    const cityCode = selectedCityCode || cityCodeInput?.value || "";

    if (!city) {
      cityInput?.focus();
      if (status) status.textContent = "Сначала укажите город или населённый пункт.";
      return;
    }

    button.disabled = true;
    button.textContent = "Загружаем…";
    if (status) status.textContent = "Получаем актуальные пункты выдачи СДЭК.";

    try {
      const officeQuery = cityCode ? `city_code=${encodeURIComponent(cityCode)}&city=${encodeURIComponent(city)}` : `city=${encodeURIComponent(city)}`;
      const response = await fetch(`/api/cdek/offices?${officeQuery}`, {
        headers: { Accept: "application/json" },
      });
      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить ПВЗ.");
      const points = Array.isArray(payload.points) ? payload.points : [];
      if (!points.length) throw new Error("В этом городе пункты выдачи не найдены.");

      select.replaceChildren(new Option("Выберите ПВЗ", ""));
      points.forEach((point) => {
        const label = `${point.address} · ${point.code}${point.work_time ? ` · ${point.work_time}` : ""}`;
        const option = new Option(label, `${point.code} — ${point.address}`);
        option.dataset.code = point.code || "";
        option.dataset.address = point.address || "";
        select.add(option);
      });
      if (selectWrap) selectWrap.hidden = false;
      if (pvzInput) pvzInput.value = "";
      if (status) status.textContent = `Найдено пунктов: ${points.length}. Выберите удобный ПВЗ.`;
      select.focus();
    } catch (error) {
      if (selectWrap) selectWrap.hidden = true;
      if (status) status.textContent = error.message || "Не удалось загрузить ПВЗ СДЭК.";
    } finally {
      button.disabled = false;
      button.textContent = "Показать ПВЗ СДЭК";
    }
  }

  document.addEventListener("click", (event) => {
    const cityOption = event.target.closest("[data-city-option]");
    if (cityOption) {
      const form = cityOption.closest("[data-checkout-form]");
      const cityInput = form?.querySelector("[data-delivery-city]");
      const cityCodeInput = form?.querySelector("[data-cdek-city-code]");
      const cityStatus = form?.querySelector("[data-city-status]");
      const loadButton = form?.querySelector("[data-load-pvz]");
      if (cityInput) cityInput.value = cityOption.dataset.cityName || "";
      if (cityCodeInput) cityCodeInput.value = cityOption.dataset.cityCode || "";
      if (cityStatus) cityStatus.textContent = "Населённый пункт выбран.";
      closeCitySuggestions(form);
      if (loadButton) loadPickupPoints(loadButton, cityOption.dataset.cityCode || "");
      loadOrderQuote(form);
      return;
    }

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

    const loadPvz = event.target.closest("[data-load-pvz]");
    if (loadPvz) {
      loadPickupPoints(loadPvz);
      return;
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
    if (deliveryMethod) {
      syncDeliveryFields(deliveryMethod);
      const form = deliveryMethod.closest("[data-checkout-form]");
      if (form) {
        form.dataset.quoteKey = "";
        form.dataset.deliveryAmount = "";
        hideOrderSummary(form);
        loadOrderQuote(form);
      }
    }

    const pvzSelect = event.target.closest("[data-pvz-select]");
    if (pvzSelect) {
      const form = pvzSelect.closest("[data-checkout-form]");
      const pvzInput = form?.querySelector("[data-cdek-pvz]");
      if (pvzInput) pvzInput.value = pvzSelect.value;
    }


  });

  document.addEventListener("input", (event) => {
    const cityInput = event.target.closest("[data-delivery-city]");
    if (!cityInput) return;
    const form = cityInput.closest("[data-checkout-form]");
    const cityCodeInput = form?.querySelector("[data-cdek-city-code]");
    const pvzInput = form?.querySelector("[data-cdek-pvz]");
    const selectWrap = form?.querySelector("[data-pvz-select-wrap]");
    const pvzStatus = form?.querySelector("[data-pvz-status]");
    if (cityCodeInput) cityCodeInput.value = "";
    if (pvzInput) pvzInput.value = "";
    form.dataset.quoteKey = "";
    form.dataset.deliveryAmount = "";
    hideOrderSummary(form);
    if (selectWrap) selectWrap.hidden = true;
    if (pvzStatus) pvzStatus.textContent = "";
    scheduleCitySearch(cityInput);
  });



  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-checkout-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-checkout-status]");
    const button = form.querySelector("[data-checkout-submit]");
    const items = getCartItems();
    if (!paymentAvailable) {
      if (status) status.textContent = "Оплата через СБП пока закрыта до завершения контрольной проверки.";
      return;
    }
    if (!items.length || !form.reportValidity()) return;
    if (!form.querySelector("[data-cdek-city-code]")?.value) {
      if (status) status.textContent = "Выберите населённый пункт из подсказок СДЭК.";
      form.querySelector("[data-delivery-city]")?.focus();
      return;
    }
    if (form.dataset.quoteKey !== currentQuoteKey(form, items)) {
      await loadOrderQuote(form);
      if (form.dataset.quoteKey !== currentQuoteKey(form, items)) return;
    }

    const fields = new FormData(form);
    const payload = Object.fromEntries(fields.entries());
    payload.items = items.map((item) => ({slug: item.slug, quantity: item.quantity}));

    button.disabled = true;
    button.textContent = "Создаём заказ…";
    if (status) status.textContent = "Подготавливаем безопасную оплату через СБП.";

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {"Content-Type": "application/json", Accept: "application/json"},
        body: JSON.stringify(payload),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.error || "Не удалось создать заказ.");
      if (!result.confirmation_url) throw new Error("ЮKassa не вернула ссылку на оплату.");
      window.location.assign(result.confirmation_url);
    } catch (error) {
      if (status) status.textContent = error.message || "Не удалось перейти к оплате.";
      renderPaymentButton(form, items);
    }
  });


  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const visibleSuggestions = document.querySelector("[data-city-suggestions]:not([hidden])");
    if (visibleSuggestions) {
      closeCitySuggestions(visibleSuggestions.closest("[data-checkout-form]"));
      return;
    }
    closeCart();
  });

  renderCart();
})();
