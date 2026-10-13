// Checkout page: one page, test details only. Placing the order saves it in the
// browser and moves to the confirmation page. No payment is processed and
// the demo order stays in the browser; the Pixel sends measurement events.
(function () {
  "use strict";

  var main = document.getElementById("main");
  var summary = NM.cart.summary();

  if (!summary.items.length) {
    window.location.replace("cart.html");
    return;
  }

  var TEST_DETAILS = {
    email: "taylor.test@example.com",
    phoneCountryCode: "1",
    phone: "(415) 555-0132",
    firstName: "Taylor",
    lastName: "Test",
    address: "123 Main Street",
    city: "San Francisco",
    region: "CA",
    postalCode: "94107",
    country: "US"
  };

  // Country calling codes offered beside the phone number.
  var PHONE_CODES = [
    { code: "1", label: "+1 US" },
    { code: "44", label: "+44 UK" },
    { code: "61", label: "+61 AU" },
    { code: "49", label: "+49 DE" },
    { code: "33", label: "+33 FR" },
    { code: "81", label: "+81 JP" }
  ];

  function field(id, label, type, autocomplete, extra) {
    return (
      '<label class="field' + (extra || "") + '" for="' + id + '"><span>' + label + "</span>" +
        '<input id="' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + autocomplete + '" required>' +
      "</label>"
    );
  }

  main.innerHTML =
    '<section class="section">' +
      "<h1>Checkout</h1>" +
      '<div class="checkout-layout">' +
        '<form class="checkout-form" id="checkout-form" novalidate>' +
          '<div class="form-head"><h2>Contact</h2>' +
            '<button type="button" class="link-btn" id="fill-test">Fill test details</button></div>' +
          '<div class="field-row">' +
            field("email", "Email", "email", "email") +
            '<label class="field" for="phone"><span>Phone</span>' +
              '<span class="phone-group">' +
                '<select id="phoneCountryCode" name="phoneCountryCode" aria-label="Country calling code" autocomplete="tel-country-code">' +
                  PHONE_CODES.map(function (c) {
                    return '<option value="' + c.code + '">' + c.label + "</option>";
                  }).join("") +
                "</select>" +
                '<input id="phone" name="phone" type="tel" autocomplete="tel-national" required>' +
              "</span>" +
            "</label>" +
          "</div>" +

          "<h2>Shipping</h2>" +
          '<div class="field-row">' +
            field("firstName", "First name", "text", "given-name") +
            field("lastName", "Last name", "text", "family-name") +
          "</div>" +
          field("address", "Address", "text", "street-address") +
          '<div class="field-row field-row-3">' +
            field("city", "City", "text", "address-level2") +
            field("region", "State", "text", "address-level1") +
            field("postalCode", "ZIP code", "text", "postal-code") +
          "</div>" +
          '<label class="field" for="country"><span>Country</span>' +
            '<select id="country" name="country"><option value="US">United States</option></select></label>' +
          '<p class="muted small">Arrives in 3 to 5 business days. Standard shipping is free.</p>' +

          "<h2>Payment</h2>" +
          '<div class="payment-method">' +
            '<span class="payment-radio" aria-hidden="true"></span>' +
            '<span class="payment-brand">VISA</span>' +
            '<span class="payment-number">&bull;&bull;&bull;&bull; 4242</span>' +
            '<span class="muted small">Expires 12/28</span>' +
          "</div>" +

          '<p class="form-error" id="form-error" hidden></p>' +
          '<button type="submit" class="btn btn-dark btn-block" id="place-order">Place order</button>' +
        "</form>" +

        '<aside class="summary-card">' +
          "<h2>Order summary</h2>" +
          '<div class="summary-items">' +
            summary.items.map(function (item) {
              return (
                '<div class="summary-item">' +
                  '<img src="' + item.image + '" alt="">' +
                  "<div><strong>" + NM.escapeHtml(item.name) + "</strong>" +
                    (item.label ? '<span class="muted">' + NM.escapeHtml(item.label) + "</span>" : "") +
                    '<span class="muted">Qty ' + item.quantity + "</span></div>" +
                  "<span>" + NM.money(item.lineTotal) + "</span>" +
                "</div>"
              );
            }).join("") +
          "</div>" +
          '<div class="summary-row"><span>Subtotal</span><span>' + NM.money(summary.subtotal) + "</span></div>" +
          '<div class="summary-row"><span>Shipping</span><span>Free</span></div>' +
          '<div class="summary-row"><span>Tax</span><span>' + NM.money(summary.tax) + "</span></div>" +
          '<div class="summary-row summary-total"><span>Order total</span><span>' + NM.money(summary.total) + " " + summary.currency + "</span></div>" +
        "</aside>" +
      "</div>" +
    "</section>";

  var form = document.getElementById("checkout-form");
  var emailInput = document.getElementById("email");
  var errorBox = document.getElementById("form-error");

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  document.getElementById("fill-test").addEventListener("click", function () {
    Object.keys(TEST_DETAILS).forEach(function (key) {
      var input = document.getElementById(key);
      if (input) {
        input.value = TEST_DETAILS[key];
        input.classList.remove("has-error");
      }
    });
    errorBox.hidden = true;
  });

  // Clear a field's error outline as soon as the shopper types in it.
  form.addEventListener("input", function (event) {
    event.target.classList.remove("has-error");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var values = {};
    var missing = [];
    ["email", "phoneCountryCode", "phone", "firstName", "lastName", "address", "city", "region", "postalCode", "country"].forEach(function (key) {
      var input = document.getElementById(key);
      values[key] = input.value.trim();
      input.classList.toggle("has-error", !values[key]);
      if (!values[key]) missing.push(key);
    });

    if (missing.length || !isEmail(values.email)) {
      if (!missing.length) emailInput.classList.add("has-error");
      errorBox.textContent = missing.length
        ? "Please fill in every field, or use Fill test details."
        : "Please enter a valid email address.";
      errorBox.hidden = false;
      return;
    }

    var cart = NM.cart.summary();
    var order = {
      id: NM.orders.newId(),
      createdAt: new Date().toISOString(),
      currency: cart.currency,
      items: cart.items,
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      tax: cart.tax,
      total: cart.total,
      customer: {
        email: values.email,
        phoneCountryCode: values.phoneCountryCode,
        phone: values.phone,
        firstName: values.firstName,
        lastName: values.lastName,
        city: values.city,
        region: values.region,
        postalCode: values.postalCode,
        country: values.country
      }
    };

    NM.orders.save(order);
    NM.cart.clear();
    window.location.href = "order-confirmation.html?order=" + encodeURIComponent(order.id);
  });

  // MEASUREMENT: checkout has started. In scope: summary (items, itemCount, subtotal, tax, total, currency).
  oaiq("measure", "checkout_started", {
    type: "contents",
    amount: summary.subtotal,
    currency: "USD",
    contents: summary.items.map(function (item) {
      return {
        id: item.itemId,
        name: item.name,
        content_type: "product",
        quantity: item.quantity,
        amount: item.unitPrice,
        currency: "USD"
      };
    })
  });
})();
