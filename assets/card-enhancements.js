(function () {
  "use strict";

  function installGoldenMiddleHero() {
    var path = window.location.pathname;
    if (path !== "/" && path !== "/index.html") return;

    var heroVisual = document.querySelector(".hero-visual");
    if (!heroVisual || heroVisual.querySelector("[data-helionyx-golden-middle]")) return;

    if (!document.querySelector("style[data-helionyx-golden-middle-style]")) {
      var style = document.createElement("style");
      style.setAttribute("data-helionyx-golden-middle-style", "");
      style.textContent = [
        ".hero-visual{min-height:560px}",
        ".hero-golden-middle{width:min(500px,100%);margin:0;position:relative}",
        ".hero-golden-middle::before{content:\"\";position:absolute;inset:8% 4% 3%;border-radius:42px;background:radial-gradient(circle at 50% 30%,rgba(255,207,77,.24),transparent 48%),linear-gradient(145deg,rgba(255,255,255,.7),rgba(221,235,255,.5));filter:blur(18px);transform:translateY(18px);z-index:-1}",
        ".hero-golden-middle img{display:block;width:100%;height:auto;border:1px solid rgba(255,255,255,.92);border-radius:34px;background:#fff;box-shadow:0 24px 70px rgba(21,51,91,.18)}",
        "@media(max-width:760px){.hero-visual{min-height:auto}.hero-golden-middle{width:min(430px,100%)}}",
        "@media(max-width:440px){.hero-golden-middle img{border-radius:24px}}"
      ].join("");
      document.head.appendChild(style);
    }

    heroVisual.innerHTML = [
      '<figure class="hero-golden-middle" data-helionyx-golden-middle>',
      '<img src="/assets/brand/helionyx-golden-middle.svg?v=20260806" width="900" height="1125" fetchpriority="high" alt="HELIONYX — золотая середина между дорогим оригиналом и сомнительными аналогами">',
      "</figure>"
    ].join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installGoldenMiddleHero);
  } else {
    installGoldenMiddleHero();
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