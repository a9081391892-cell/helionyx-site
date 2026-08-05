(function () {
  "use strict";

  var ARTICLE_PATH = "/articles/pochemu-robot-pylesos-bystro-razryazhaetsya/";
  var INDEX_PATH = "/articles/";
  var MAIN_IMAGE = "/assets/articles/razryazhaetsa.jpg";
  var THUMB_IMAGE = "/assets/articles/razryazhaetsa-thumb.jpg";
  var ALT = "Почему робот-пылесос быстро разряжается: 8 причин и что делать";

  function preload(src, onReady) {
    var image = new Image();
    image.onload = function () { onReady(src); };
    image.src = src;
  }

  function addStyles() {
    if (document.querySelector("style[data-razryazhaetsa-media]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-razryazhaetsa-media", "");
    style.textContent = [
      ".article-feature-image{margin:28px auto 36px;max-width:720px}",
      ".article-feature-image img{display:block;width:100%;height:auto;border-radius:22px;border:1px solid #dfe7f1;background:#fff;box-shadow:0 18px 44px rgba(21,51,91,.15)}",
      ".article-feature-image figcaption{margin:10px 8px 0;color:#66758a;font-size:14px;line-height:1.55;text-align:center}",
      "@media(max-width:680px){.article-feature-image{margin:22px auto 30px}.article-feature-image img{border-radius:16px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function updateArticleMetadata() {
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute("content", location.origin + MAIN_IMAGE);

    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(function (script) {
      try {
        var data = JSON.parse(script.textContent);
        if (data && data["@type"] === "Article") {
          data.image = [location.origin + MAIN_IMAGE];
          script.textContent = JSON.stringify(data);
        }
      } catch (error) {
        // Ignore unrelated JSON-LD blocks.
      }
    });
  }

  function insertArticleImage() {
    if (document.querySelector("[data-razryazhaetsa-feature]")) return;
    var lead = document.querySelector(".article-copy .article-lead");
    if (!lead) return;

    addStyles();
    var figure = document.createElement("figure");
    figure.className = "article-feature-image";
    figure.setAttribute("data-razryazhaetsa-feature", "");
    figure.innerHTML = '<img src="' + MAIN_IMAGE + '" alt="' + ALT + '" width="1086" height="1448" decoding="async" fetchpriority="high"><figcaption>Основные причины быстрого разряда: повышенная мощность, загрязнение, проблемы с зарядкой и естественный износ аккумулятора.</figcaption>';
    lead.insertAdjacentElement("afterend", figure);
    updateArticleMetadata();
  }

  function replaceArticleThumbnail() {
    var link = document.querySelector('a[href="./pochemu-robot-pylesos-bystro-razryazhaetsya/"], a[href$="/pochemu-robot-pylesos-bystro-razryazhaetsya/"]');
    var image = link && link.querySelector("img");
    if (!image) return;
    image.src = THUMB_IMAGE;
    image.alt = ALT;
    image.width = 1200;
    image.height = 750;
  }

  if (window.location.pathname === ARTICLE_PATH) {
    preload(MAIN_IMAGE, insertArticleImage);
  } else if (window.location.pathname === INDEX_PATH) {
    preload(THUMB_IMAGE, replaceArticleThumbnail);
  }
})();
