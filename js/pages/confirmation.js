// Order confirmation page: order-confirmation.html?order=NM-XXXX
(async function () {
  "use strict";

  var main = document.getElementById("main");
  var orderId = NM.param("order");
  var order = NM.orders.last();

  if (!order || order.id !== orderId) {
    main.innerHTML =
      '<section class="section empty-state">' +
        "<h1>We couldn't find that order</h1>" +
        '<a class="btn btn-dark" href="index.html">Back to home</a>' +
      "</section>";
    return;
  }

  main.innerHTML =
    '<section class="section confirmation">' +
      '<p class="eyebrow">Order confirmed</p>' +
      "<h1>Thank you, " + NM.escapeHtml(order.customer.firstName) + ".</h1>" +
      '<p class="muted">Order <strong>' + NM.escapeHtml(order.id) + "</strong>. We've emailed your confirmation to " +
        NM.escapeHtml(order.customer.email) + ".</p>" +
      '<div class="confirmation-layout">' +
        '<div class="summary-card">' +
          "<h2>Items</h2>" +
          '<div class="summary-items">' +
            order.items.map(function (item) {
              return (
                '<div class="summary-item">' +
                  '<img src="' + item.image + '" alt="">' +
                  "<div><strong>" + NM.escapeHtml(item.name) + "</strong>" +
                    (item.label ? '<span class="muted">' + NM.escapeHtml(item.label) + "</span>" : "") +
                    '<span class="muted">Qty ' + item.quantity + " &middot; " + item.itemId + "</span></div>" +
                  "<span>" + NM.money(item.lineTotal) + "</span>" +
                "</div>"
              );
            }).join("") +
          "</div>" +
        "</div>" +
        '<div class="summary-card">' +
          "<h2>Summary</h2>" +
          '<div class="summary-row"><span>Subtotal</span><span>' + NM.money(order.subtotal) + "</span></div>" +
          '<div class="summary-row"><span>Shipping</span><span>Free</span></div>' +
          '<div class="summary-row"><span>Tax</span><span>' + NM.money(order.tax) + "</span></div>" +
          '<div class="summary-row summary-total"><span>Order total</span><span>' + NM.money(order.total) + " " + order.currency + "</span></div>" +
          '<p class="muted small">Shipping to ' + NM.escapeHtml(order.customer.city) + ", " +
            NM.escapeHtml(order.customer.region) + " " + NM.escapeHtml(order.customer.postalCode) + "</p>" +
          '<a class="btn btn-dark btn-block" href="index.html">Continue shopping</a>' +
        "</div>" +
      "</div>" +
    "</section>";

  // firstView is true only the first time this order's confirmation is shown,
  // so a page reload can be told apart from a new order.
  var seenKey = "nm_order_seen_" + order.id;
  var firstView = false;
  try {
    firstView = !sessionStorage.getItem(seenKey);
    sessionStorage.setItem(seenKey, "1");
  } catch (err) { /* storage unavailable */ }

  // MEASUREMENT: the order is confirmed. In scope: order (id, items, subtotal, tax, total,
  // currency, customer) and firstView (false when this page is reloaded).
  if (firstView) {
    var user = null;
    try {
      user = await NMUserData.buildUserData(order.customer);
    } catch (err) { /* Hashing unavailable or failed: send the purchase without user data. */ }

    if (user) {
      oaiq("init", { user: user });
    }

    oaiq("measure", "order_created", {
      type: "contents",
      amount: order.subtotal,
      currency: "USD",
      contents: order.items.map(function (item) {
        return {
          id: item.itemId,
          name: item.name,
          content_type: "product",
          quantity: item.quantity,
          amount: item.unitPrice,
          currency: "USD"
        };
      })
    }, { event_id: order.id });
  }
})();
