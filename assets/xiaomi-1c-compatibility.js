(function () {
  var path = window.location.pathname;
  var products = {
    "/products/xiaomi-1c-5200/": {
      sku: "BAT1C5200",
      capacity: "5200 мАч",
      description: "Аккумулятор HELIONYX BAT1C5200 для Xiaomi Mi Robot Vacuum Mop, Xiaomi Robot Vacuum-Mop 2C и Mijia Sweeping Robot 1C. Совместимые обозначения: STYTJ01ZHM, SKV4093GL, BHR5781EU, XMSTJQR2C. Парт-номера: P1904-4S1P-MM и P1904-4S2P-MM."
    },
    "/products/xiaomi-1c-6400/": {
      sku: "BAT1C6500",
      capacity: "6400 мАч",
      description: "Аккумулятор HELIONYX BAT1C6500 повышенной ёмкости для Xiaomi Mi Robot Vacuum Mop, Xiaomi Robot Vacuum-Mop 2C и Mijia Sweeping Robot 1C. Совместимые обозначения: STYTJ01ZHM, SKV4093GL, BHR5781EU, XMSTJQR2C. Парт-номера: P1904-4S1P-MM и P1904-4S2P-MM."
    }
  };
  var item = products[path];
  if (!item) return;

  var models = ["Xiaomi Mi Robot Vacuum Mop", "Xiaomi Robot Vacuum-Mop 2C", "Mijia Sweeping Robot 1C"];
  var deviceCodes = ["STYTJ01ZHM", "SKV4093GL", "BHR5781EU", "XMSTJQR2C"];
  var partNumbers = ["P1904-4S1P-MM", "P1904-4S2P-MM"];

  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", item.description);
  var og = document.querySelector('meta[property="og:description"]');
  if (og) og.setAttribute("content", item.description);

  document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
    try {
      var data = JSON.parse(script.textContent);
      if (data && data["@type"] === "Product") {
        data.description = item.description;
        data.sku = item.sku;
        data.mpn = item.sku;
        script.textContent = JSON.stringify(data);
      }
    } catch (error) {}
  });

  var specs = document.querySelector(".product-info .spec-list");
  if (specs && !specs.querySelector('[data-product-sku]')) {
    var row = document.createElement("div");
    row.setAttribute("data-product-sku", "");
    row.innerHTML = "<span>Артикул</span><strong>" + item.sku + "</strong>";
    specs.appendChild(row);
  }

  var lead = document.querySelector(".product-lead");
  if (lead) lead.textContent = "Аккумулятор HELIONYX " + item.sku + " для совместимых роботов-пылесосов Xiaomi и Mijia. Проверены модели, обозначения устройств и парт-номера батарей.";

  var compatibility = Array.from(document.querySelectorAll(".product-details")).find(function (block) {
    return block.querySelector("h2") && block.querySelector("h2").textContent.indexOf("Подходит к моделям") !== -1;
  });
  if (compatibility) {
    var paragraph = compatibility.querySelector("p");
    if (paragraph) {
      paragraph.innerHTML = "<strong>Совместимые модели:</strong> " + models.join(", ") + ".<br><strong>Обозначения устройств:</strong> " + deviceCodes.join(", ") + ".<br><strong>Парт-номера аккумулятора:</strong> " + partNumbers.join(", ") + ".";
    }
  }

  var copy = document.querySelector(".product-description__copy");
  if (copy) {
    var oldCompatibilityText = Array.from(copy.querySelectorAll("p")).find(function (p) {
      return /STYTJ01ZHM|P1904-4S1P-MM/.test(p.textContent);
    });
    if (oldCompatibilityText) {
      oldCompatibilityText.textContent = "Совместимость проверена для Xiaomi Mi Robot Vacuum Mop, Xiaomi Robot Vacuum-Mop 2C и Mijia Sweeping Robot 1C. Обозначения устройств: STYTJ01ZHM, SKV4093GL, BHR5781EU и XMSTJQR2C. Поддерживаемые парт-номера батарей: P1904-4S1P-MM и P1904-4S2P-MM.";
    }
  }

  var guide = document.querySelector("[data-xiaomi-1c-guide] p");
  if (guide) guide.textContent = "Подробно разобрали симптомы износа, совместимые модели, обозначения STYTJ01ZHM, SKV4093GL, BHR5781EU, XMSTJQR2C, парт-номера P1904-4S1P-MM и P1904-4S2P-MM, порядок замены и выбор ёмкости.";
})();
