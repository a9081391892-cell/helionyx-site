(function () {
  if (window.location.pathname !== "/catalog/") return;

  const details = {
    "dyson-v7": { badges: ["Хит продаж"], models: 7, part: "BATDYSV7_2500", fits: "Dyson V7, SV11, Absolute, Animal, Motorhead" },
    "dyson-v6": { badges: ["Штатная ёмкость"], models: 14, part: "BATDYSV6_2500", fits: "Dyson V6, DC58–DC74, SV03–SV09" },
    "dyson-v11": { badges: ["Повышенная ёмкость"], models: 5, part: "BATDYSV11_4000", fits: "Dyson V11, SV15, SV16, SV17, SV22" },
    "dreame-5200": { badges: ["Хит продаж", "Штатная ёмкость"], models: 17, part: "P2150-4S2P-MMBK", fits: "Dreame D9, F9, L10S Ultra, Xiaomi X10+ и другие" },
    "samsung-jet90": { badges: ["Хит продаж"], models: 5, part: "VCA-SBT90", fits: "Samsung Jet 75, Jet 90, Jet 90E, VS9000" },
    "exvac-3200": { badges: ["Штатная ёмкость"], models: 12, part: "INR18650 M26-4S1P", fits: "Mamibot, Polaris, Ecovacs, DEXP, Neatsvor" },
    "mop2-lite": { badges: ["Штатная ёмкость"], models: 7, part: "BATMOP2LITE3200", fits: "Xiaomi Mop 2 Lite, E5, E10, E12, Mijia Mop 3C Plus" },
    "mop2-3200": { badges: ["Штатная ёмкость"], models: 3, part: "P2051-4S1P-ZM", fits: "Xiaomi Vacuum-Mop 2, STYTJ03ZHM" },
    "xiaomi-g1": { badges: ["Штатная ёмкость"], models: 5, part: "H18650CH-4S1P", fits: "Xiaomi Vacuum-Mop Essential G1, Mijia G1" },
    "samsung-jet60": { badges: ["Штатная ёмкость"], models: 3, part: "BATJET60", fits: "Samsung Jet 60 и совместимые версии" },
    "lg-a9": { badges: ["Штатная ёмкость"], models: 8, part: "BATLG_A9", fits: "LG CordZero A9 и совместимые модификации" },
    "samsung-jet70": { badges: ["Штатная ёмкость"], models: 4, part: "VCA-SBT90E", fits: "Samsung Jet 70, Jet 90E и совместимые версии" },
    "dreame-6400": { badges: ["Повышенная ёмкость"], models: 17, part: "P2150-4S2P-MMBK", fits: "Dreame D9, F9, L10S Ultra, Xiaomi X10+ и другие" },
    "xiaomi-1c-5200": { badges: ["Хит продаж", "Штатная ёмкость"], models: 4, part: "P1904-4S1P-MM", fits: "Xiaomi Vacuum-Mop 1C, STYTJ01ZHM" },
    "roborock-6400": { badges: ["Повышенная ёмкость"], models: 8, part: "BATROBOROCK6400", fits: "Roborock S5, S6, S7 и совместимые версии" },
    "xiaomi-mopp-3200": { badges: ["Штатная ёмкость"], models: 8, part: "BATMOPP_3200", fits: "Xiaomi Vacuum-Mop P, 2S, S10, S12" },
    "xiaomi-1c-6400": { badges: ["Повышенная ёмкость"], models: 4, part: "P1904-4S1P-MM", fits: "Xiaomi Vacuum-Mop 1C, STYTJ01ZHM" }
  };

  const style = document.createElement("style");
  style.textContent = `
    .product-card__badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
    .product-card__badge{display:inline-flex;align-items:center;min-height:24px;padding:4px 8px;border-radius:999px;background:#eef4ff;color:#174ea6;font-size:12px;font-weight:700;line-height:1.2}
    .product-card__badge--hit{background:#fff1d6;color:#8a5200}
    .product-card__compatibility{margin-top:10px;padding-top:10px;border-top:1px solid rgba(21,40,75,.1);display:grid;gap:5px;font-size:13px;line-height:1.35;color:#536078}
    .product-card__compatibility strong{color:#1d2b45;font-weight:700}
    .product-card__part{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;overflow-wrap:anywhere}
    .product-card__models{font-weight:700;color:#244d91}
  `;
  document.head.appendChild(style);

  document.querySelectorAll(".product-card").forEach((card) => {
    const slug = card.querySelector("[data-product]")?.dataset.product;
    const info = details[slug];
    const body = card.querySelector(".product-card__body");
    const title = card.querySelector(".product-card__title");
    const spec = card.querySelector(".product-card__spec");
    if (!info || !body || !title || !spec || body.querySelector(".product-card__compatibility")) return;

    const badges = document.createElement("div");
    badges.className = "product-card__badges";
    info.badges.forEach((label) => {
      const badge = document.createElement("span");
      badge.className = "product-card__badge" + (label === "Хит продаж" ? " product-card__badge--hit" : "");
      badge.textContent = label;
      badges.appendChild(badge);
    });
    title.before(badges);

    const block = document.createElement("div");
    block.className = "product-card__compatibility";
    block.innerHTML =
      '<div class="product-card__models">Проверено моделей: ' + info.models + '</div>' +
      '<div><strong>Подходит:</strong> ' + info.fits + '</div>' +
      '<div class="product-card__part"><strong>Парт-номер:</strong> ' + info.part + '</div>';
    spec.after(block);
  });
})();
