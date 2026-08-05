(function () {
  "use strict";

  if (window.location.pathname !== "/products/xiaomi-1c-6400/") return;
  if (document.querySelector('script[data-helionyx-product-reviews]')) return;

  var script = document.createElement("script");
  script.src = "/assets/product-reviews.js";
  script.defer = true;
  script.setAttribute("data-helionyx-product-reviews", "");
  document.head.appendChild(script);
})();
