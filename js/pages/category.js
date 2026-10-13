// Category page: category.html?c=running
(function () {
  "use strict";

  var main = document.getElementById("main");
  var category = NM.getCategory(NM.param("c"));

  if (!category) {
    main.innerHTML =
      '<section class="section empty-state">' +
        "<h1>We couldn't find that category</h1>" +
        '<a class="btn btn-dark" href="index.html">Back to home</a>' +
      "</section>";
    return;
  }

  var products = NM.productsIn(category.id);
  document.title = category.name + " | Nano Motion";

  main.innerHTML =
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span>' +
      NM.escapeHtml(category.name) + "</nav>" +
    '<section class="section">' +
      '<div class="category-head">' +
        "<h1>" + NM.escapeHtml(category.name) + "</h1>" +
        '<p class="muted">' + NM.escapeHtml(category.tagline) + "</p>" +
        '<p class="muted small">' + products.length + " products</p>" +
      "</div>" +
      '<div class="product-grid">' + products.map(NM.productCard).join("") + "</div>" +
    "</section>";

  // MEASUREMENT: a category page has loaded. In scope: category (id, name), products.
  oaiq("measure", "page_viewed", {
    type: "contents",
    contents: [
      { id: "category-" + category.id, name: category.name + " category", content_type: "page" }
    ]
  });
})();
