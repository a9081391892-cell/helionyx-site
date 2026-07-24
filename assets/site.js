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

  function renderCart() {
    const items = Object.entries(cart)
      .filter(([slug, quantity]) => bySlug[slug] && quantity > 0)
      .map(([slug, quantity]) => ({ ...bySlug[slug], quantity }));

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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  renderCart();
})();
