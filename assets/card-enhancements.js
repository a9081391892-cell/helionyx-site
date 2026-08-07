(function () {
  "use strict";

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
