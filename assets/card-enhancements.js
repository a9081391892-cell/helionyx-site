(function () {
  "use strict";

  function installHomepageHeroImage() {
    var path = window.location.pathname;
    if (path !== "/" && path !== "/index.html") return;

    var heroVisual = document.querySelector(".hero-visual");
    if (!heroVisual || heroVisual.querySelector("[data-helionyx-homepage-hero]")) return;

    var source = "/assets/brand/h.jpg";
    var image = new Image();
    image.decoding = "async";
    image.fetchPriority = "high";
    image.alt = "HELIONYX — золотая середина между дорогим оригиналом и сомнительными аналогами";

    image.onload = function () {
      if (!document.querySelector("style[data-helionyx-homepage-hero-style]")) {
        var style = document.createElement("style");
        style.setAttribute("data-helionyx-homepage-hero-style", "");
        style.textContent = [
          ".hero-visual{min-height:560px;overflow:visible}",
          ".hero-homepage-image{width:min(540px,112%);margin:0;position:relative;transform:translate(12px,-8px)}",
          ".hero-homepage-image::before{content:\"\";position:absolute;inset:10% 5% 8%;border-radius:42px;background:radial-gradient(circle at 50% 32%,rgba(255,207,77,.18),transparent 50%),linear-gradient(145deg,rgba(255,255,255,.6),rgba(221,235,255,.42));filter:blur(24px);transform:translateY(16px);z-index:-1}",
          ".hero-homepage-image img{display:block;width:100%;height:auto;border:1px solid rgba(255,255,255,.9);border-radius:30px;background:#fff;box-shadow:0 20px 54px rgba(21,51,91,.13)}",
          ".hero-homepage-image figcaption{max-width:470px;margin:14px auto 0;padding:11px 15px;border:1px solid rgba(203,220,244,.9);border-radius:14px;background:rgba(255,255,255,.82);box-shadow:0 10px 28px rgba(21,51,91,.08);color:#30415d;font-size:14px;font-weight:750;line-height:1.45;text-align:center;backdrop-filter:blur(10px)}",
          "@media(max-width:760px){.hero-visual{min-height:auto}.hero-homepage-image{width:min(450px,100%);transform:none}.hero-homepage-image figcaption{font-size:13px}}",
          "@media(max-width:440px){.hero-homepage-image img{border-radius:22px}.hero-homepage-image figcaption{margin-top:10px;padding:10px 12px}}"
        ].join("");
        document.head.appendChild(style);
      }

      var figure = document.createElement("figure");
      figure.className = "hero-homepage-image";
      figure.setAttribute("data-helionyx-homepage-hero", "");
      figure.appendChild(image);

      var caption = document.createElement("figcaption");
      caption.textContent = "HELIONYX — оптимальный выбор по цене, надёжности и доступности.";
      figure.appendChild(caption);

      heroVisual.replaceChildren(figure);
    };

    image.onerror = function () {
      // Пока h.jpg не загружен, сохраняем действующий блок главной страницы.
    };

    image.src = source;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHomepageHeroImage);
  } else {
    installHomepageHeroImage();
  }

  if (window.location.pathname === "/products/xiaomi-1c-6400/" && !document.querySelector('script[data-helionyx-product-reviews]')) {
    var reviewsScript = document.createElement("script");
    reviewsScript.src = "/assets/product-reviews.js";
    reviewsScript.defer = true;
    reviewsScript.setAttribute("data-helionyx-product-reviews", "");
    document.head.appendChild(reviewsScript);
  }

  if (
    (window.location.pathname === "/articles/" || window.location.pathname === "/articles/pochemu-robot-pylesos-bystro-razryazhaetsya/") &&
    !document.querySelector('script[data-razryazhaetsa-media]')
  ) {
    var articleMediaScript = document.createElement("script");
    articleMediaScript.src = "/assets/article-razryazhaetsa-media.js";
    articleMediaScript.defer = true;
    articleMediaScript.setAttribute("data-razryazhaetsa-media", "");
    document.head.appendChild(articleMediaScript);
  }
})();