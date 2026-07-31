(function () {
  "use strict";

  var catalogIndex = null;
  var catalogPromise = null;

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("ru-RU")
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9+]+/gi, " ")
      .trim();
  }

  function matchesTokens(haystack, query) {
    var tokens = normalize(query).split(/\s+/).filter(Boolean);
    var text = normalize(haystack);
    return tokens.length > 0 && tokens.every(function (token) {
      return text.includes(token);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function installStyles() {
    if (document.getElementById("helionyx-quick-search-styles")) return;
    var style = document.createElement("style");
    style.id = "helionyx-quick-search-styles";
    style.textContent = [
      ".search-box.quick-search-box{position:relative}",
      ".quick-search-results{position:absolute;z-index:60;top:calc(100% + 10px);left:0;right:0;overflow:hidden;border:1px solid #dce4ef;border-radius:18px;background:#fff;box-shadow:0 22px 60px rgba(20,42,76,.18)}",
      ".quick-search-results[hidden]{display:none!important}",
      ".quick-search-results__head{display:flex;justify-content:space-between;gap:16px;padding:13px 16px;color:#667085;border-bottom:1px solid #edf1f6;font-size:13px}",
      ".quick-search-result{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:13px;align-items:center;padding:12px 16px;color:#172033;text-decoration:none;border-bottom:1px solid #edf1f6;background:#fff}",
      ".quick-search-result:last-child{border-bottom:0}",
      ".quick-search-result:hover,.quick-search-result:focus{color:#172033;background:#f4f8ff;outline:none}",
      ".quick-search-result img{width:62px;height:54px;object-fit:contain;border-radius:10px;background:#f5f7fa}",
      ".quick-search-result__copy{min-width:0}",
      ".quick-search-result__copy strong{display:block;margin-bottom:4px;color:#111827;line-height:1.3}",
      ".quick-search-result__copy span{display:block;overflow:hidden;color:#667085;font-size:12px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}",
      ".quick-search-result__price{color:#111827;font-size:15px;white-space:nowrap}",
      ".quick-search-empty{padding:18px 16px;color:#667085;line-height:1.5}",
      ".quick-search-empty a{color:#0d5fff;font-weight:700}",
      "@media(max-width:700px){.quick-search-results{left:-2px;right:-2px}.quick-search-result{grid-template-columns:52px minmax(0,1fr);padding:11px 12px}.quick-search-result img{width:52px;height:48px}.quick-search-result__price{grid-column:2;margin-top:-3px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function absolutePath(value, basePath) {
    try {
      return new URL(value, window.location.origin + basePath).pathname;
    } catch (_) {
      return value;
    }
  }

  function loadCatalogIndex() {
    if (catalogIndex) return Promise.resolve(catalogIndex);
    if (catalogPromise) return catalogPromise;

    catalogPromise = fetch("/catalog/", { headers: { Accept: "text/html" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Не удалось загрузить каталог");
        return response.text();
      })
      .then(function (html) {
        var documentCopy = new DOMParser().parseFromString(html, "text/html");
        catalogIndex = Array.from(documentCopy.querySelectorAll(".product-card")).map(function (card) {
          var titleLink = card.querySelector(".product-card__title");
          var image = card.querySelector(".product-card__image img");
          var spec = card.querySelector(".product-card__spec");
          var price = card.querySelector(".product-card__bottom strong");
          return {
            search: card.dataset.search || card.textContent || "",
            title: titleLink ? titleLink.textContent.trim() : "Аккумулятор HELIONYX",
            href: titleLink ? absolutePath(titleLink.getAttribute("href"), "/catalog/") : "/catalog/",
            image: image ? absolutePath(image.getAttribute("src"), "/catalog/") : "",
            spec: spec ? spec.textContent.trim() : "",
            price: price ? price.textContent.trim() : ""
          };
        });
        return catalogIndex;
      })
      .catch(function () {
        catalogIndex = [];
        return catalogIndex;
      });

    return catalogPromise;
  }

  function initHomepageSearch() {
    var input = document.querySelector("#selection [data-product-search]");
    if (!input) return;
    var box = input.closest(".search-box");
    if (!box) return;

    box.classList.add("quick-search-box");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");

    var results = document.createElement("div");
    results.className = "quick-search-results";
    results.setAttribute("role", "listbox");
    results.hidden = true;
    input.insertAdjacentElement("afterend", results);

    var catalogButton = box.querySelector('a[href*="catalog"]');
    var requestNumber = 0;

    function closeResults() {
      results.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }

    function rank(item, query) {
      var q = normalize(query);
      var title = normalize(item.title);
      if (title === q) return 100;
      if (title.includes(q)) return 80;
      return 40;
    }

    function draw(query, items) {
      var found = items
        .filter(function (item) { return matchesTokens(item.search + " " + item.title, query); })
        .sort(function (a, b) { return rank(b, query) - rank(a, query); })
        .slice(0, 6);

      if (!found.length) {
        results.innerHTML = '<div class="quick-search-empty">По этому запросу ничего не найдено. <a href="/catalog/?q=' + encodeURIComponent(query) + '">Посмотреть весь каталог</a></div>';
        results.hidden = false;
        input.setAttribute("aria-expanded", "true");
        return;
      }

      results.innerHTML = '<div class="quick-search-results__head"><span>Подходящие аккумуляторы</span><span>Найдено: ' + found.length + '</span></div>' + found.map(function (item) {
        return '<a class="quick-search-result" role="option" href="' + escapeHtml(item.href) + '">' +
          '<img src="' + escapeHtml(item.image) + '" alt="" loading="lazy">' +
          '<span class="quick-search-result__copy"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.spec) + '</span></span>' +
          '<b class="quick-search-result__price">' + escapeHtml(item.price) + '</b></a>';
      }).join("");
      results.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function search() {
      var query = input.value.trim();
      var currentRequest = ++requestNumber;
      if (catalogButton) catalogButton.href = query ? "/catalog/?q=" + encodeURIComponent(query) : "/catalog/";
      if (query.length < 2) {
        closeResults();
        return;
      }

      results.innerHTML = '<div class="quick-search-empty">Ищем подходящие аккумуляторы…</div>';
      results.hidden = false;
      input.setAttribute("aria-expanded", "true");
      loadCatalogIndex().then(function (items) {
        if (currentRequest !== requestNumber) return;
        draw(query, items);
      });
    }

    input.addEventListener("input", function () {
      window.setTimeout(search, 0);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        var first = results.querySelector(".quick-search-result");
        if (first) window.location.assign(first.href);
        else if (input.value.trim()) window.location.assign("/catalog/?q=" + encodeURIComponent(input.value.trim()));
      }
      if (event.key === "Escape") closeResults();
    });

    document.addEventListener("click", function (event) {
      if (!box.contains(event.target)) closeResults();
    });
  }

  function initCatalogSearchFix() {
    var input = document.querySelector(".section--catalog [data-product-search]");
    if (!input) return;

    function apply() {
      var query = input.value.trim();
      var activeFilter = document.querySelector("[data-filter].is-active");
      var filter = activeFilter ? activeFilter.dataset.filter : "all";
      var visible = 0;
      document.querySelectorAll(".section--catalog .product-card").forEach(function (card) {
        var matchesQuery = !query || matchesTokens(card.dataset.search || "", query);
        var matchesFilter = filter === "all" || card.dataset.category === filter;
        var show = matchesQuery && matchesFilter;
        card.hidden = !show;
        if (show) visible += 1;
      });
      var noResults = document.querySelector("[data-no-results]");
      if (noResults) noResults.classList.toggle("is-visible", visible === 0);
    }

    input.addEventListener("input", function () { window.setTimeout(apply, 0); });
    document.querySelectorAll("[data-filter]").forEach(function (button) {
      button.addEventListener("click", function () { window.setTimeout(apply, 0); });
    });
    window.setTimeout(apply, 0);
  }

  function init() {
    installStyles();
    initHomepageSearch();
    initCatalogSearchFix();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
