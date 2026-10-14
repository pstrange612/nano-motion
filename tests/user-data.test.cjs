// Run with: node --test tests/user-data.test.cjs (Node.js 18+; no dependencies).
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { webcrypto, createHash } = require("node:crypto");
const vm = require("node:vm");

const root = join(__dirname, "..");
const helperSource = readFileSync(join(root, "js/user-data.js"), "utf8");
const confirmationSource = readFileSync(join(root, "js/pages/confirmation.js"), "utf8");
const checkoutSource = readFileSync(join(root, "js/pages/checkout.js"), "utf8");
const testDetails = vm.runInNewContext("(" + checkoutSource.match(/var TEST_DETAILS = (\{[\s\S]*?\n  \});/)[1] + ")");
const hash = value => createHash("sha256").update(value, "utf8").digest("hex");
const plain = value => JSON.parse(JSON.stringify(value));

function helper(crypto = webcrypto) {
  const context = vm.createContext({ window: { crypto }, TextEncoder, Uint8Array });
  vm.runInContext(helperSource, context);
  return context.window.NMUserData;
}

test("email case and surrounding whitespace produce the same SHA-256", async () => {
  const data = helper();
  for (const email of ["User@User.com", "user@user.com", " user@user.com "]) {
    assert.equal(data.normalizeEmail(email), "user@user.com");
    assert.equal(await data.sha256(data.normalizeEmail(email)), hash("user@user.com"));
  }
});

test("phone normalization joins the calling code after removing national leading zeroes", async () => {
  const data = helper();
  for (const [code, number, expected] of [
    ["1", "(415) 555-0132", "14155550132"],
    ["44", "07911 123456", "447911123456"],
    ["1", "2345678", "12345678"],
    ["44", "1234567890123", "441234567890123"]
  ]) {
    assert.equal(data.normalizePhone(code, number), expected);
    assert.equal(await data.sha256(data.normalizePhone(code, number)), hash(expected));
  }
  for (const [code, number] of [["1", "123456"], ["44", "12345678901234"], ["1", ""], ["", "4155550132"], ["1", "000"]]) {
    assert.equal(data.normalizePhone(code, number), "");
    assert.deepEqual(plain(await data.buildUserData({ phoneCountryCode: code, phone: number })), {});
  }
});

test("names remove all ASCII punctuation and whitespace, preserving non-ASCII characters", async () => {
  const data = helper();
  const punctuation = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32))
    .filter(ch => !/[a-z0-9 ]/i.test(ch)).join("");
  for (const [name, expected] of [
    ["Mary Jane", "maryjane"], ["O'Connor", "oconnor"], ["José", "josé"],
    ["O’Connor", "o’connor"], ["\t Mary\nJane\u00a0", "maryjane"],
    ["A" + punctuation + "B", "ab"]
  ]) {
    assert.equal(data.normalizeName(name), expected);
    assert.equal(await data.sha256(data.normalizeName(name)), hash(expected));
  }
});

test("builder includes only supported, nonempty fields and never changes its input", async () => {
  const data = helper();
  const customer = { ...testDetails, externalId: "unused" };
  const original = { ...customer };
  assert.deepEqual(plain(await data.buildUserData(customer)), {
    email_sha256: hash("taylor.test@example.com"),
    phone_number_sha256: hash("14155550132"),
    first_name_sha256: hash("taylor"),
    last_name_sha256: hash("test"),
    city: "San Francisco", region: "CA", postal_code: "94107", country: "US"
  });
  assert.deepEqual(customer, original);
  assert.deepEqual(plain(await data.buildUserData({ email: " ", firstName: " - ", lastName: "", city: "  ", country: null })), {});
  assert.deepEqual(plain(await data.buildUserData({ city: " Paris ", region: " IDF ", postalCode: " 75001 ", country: " FR " })), {
    city: "Paris", region: "IDF", postal_code: "75001", country: "FR"
  });
});

function storage() {
  const stored = new Map();
  return { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
}

function confirmation(userData, sessionStorage = storage()) {
  const calls = [];
  const order = {
    id: "NM-TEST-ORDER", customer: testDetails, subtotal: 9600, tax: 768, total: 10368, currency: "USD",
    items: [{ itemId: "NM-RUN-002-COB-M", name: "AeroLite Run Tee", quantity: 2, unitPrice: 4800, lineTotal: 9600, image: "test.svg" }]
  };
  const context = vm.createContext({
    document: { getElementById: () => ({ innerHTML: "" }) },
    NM: { param: () => order.id, orders: { last: () => order }, escapeHtml: String, money: String },
    NMUserData: userData,
    sessionStorage,
    oaiq: (...args) => calls.push(plain(args))
  });
  return { calls, run: () => vm.runInContext(confirmationSource, context) };
}

const purchase = ["measure", "order_created", {
  type: "contents", amount: 9600, currency: "USD",
  contents: [{ id: "NM-RUN-002-COB-M", name: "AeroLite Run Tee", content_type: "product", quantity: 2, amount: 4800, currency: "USD" }]
}];

test("confirmation waits for hashes, initializes only finished user data, then sends one unchanged purchase", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const data = helper();
  const page = confirmation({ buildUserData: async customer => { await gate; return data.buildUserData(customer); } });
  const pending = page.run();
  assert.deepEqual(page.calls, []);
  release();
  await pending;
  assert.deepEqual(page.calls, [["init", { user: plain(await data.buildUserData(testDetails)) }], purchase]);
  await page.run();
  assert.equal(page.calls.length, 2);
});

test("missing crypto.subtle or a rejected digest still sends one purchase without user data", async () => {
  for (const crypto of [null, {}, { subtle: { digest: () => Promise.reject(new Error("digest failed")) } }]) {
    const page = confirmation(helper(crypto));
    await page.run();
    assert.deepEqual(page.calls, [purchase]);
    await page.run();
    assert.deepEqual(page.calls, [purchase]);
  }
});

function checkout(sessionStorage = storage(), items = [
  { itemId: "NM-RUN-002-COB-M", name: "Tee", quantity: 2, unitPrice: 4800, lineTotal: 9600 }
], saveSucceeds = true) {
  const nodes = new Map();
  const calls = [];
  let savedOrder;
  let cleared = false;
  function node(id) {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, {
        value: "", hidden: true, handlers: {},
        classList: {
          toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
          add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); }
        },
        addEventListener(event, callback) { this.handlers[event] = callback; }
      });
    }
    return nodes.get(id);
  }
  node("phoneCountryCode").value = "1";
  const summary = { items, subtotal: 9600, tax: 768, total: 10368, currency: "USD" };
  const location = {};
  const context = vm.createContext({
    document: { getElementById: node }, window: { location }, sessionStorage,
    NM: { cart: { summary: () => summary, clear() { cleared = true; } }, money: String, escapeHtml: String,
      orders: { newId: () => "NM-TEST", save: order => {
        if (saveSucceeds) savedOrder = order;
        return saveSucceeds;
      } } },
    oaiq: (...args) => calls.push(args)
  });
  vm.runInContext(checkoutSource, context);
  const submit = () => node("checkout-form").handlers.submit({ preventDefault() {} });
  return { node, calls, submit, location, get savedOrder() { return savedOrder; }, get cleared() { return cleared; } };
}

test("checkout still validates, fills test details, and saves the phone fields without setting Pixel user data", () => {
  const page = checkout();
  const { node, calls, submit } = page;
  submit();
  assert.equal(page.savedOrder, undefined);
  assert.equal(node("form-error").hidden, false);
  node("fill-test").handlers.click();
  for (const [field, value] of Object.entries(testDetails)) assert.equal(node(field).value, value);
  assert.equal(node("form-error").hidden, true);
  node("email").value = "invalid";
  submit();
  assert.equal(page.savedOrder, undefined);
  node("email").value = testDetails.email;
  submit();
  assert.equal(page.savedOrder.customer.phoneCountryCode, "1");
  assert.equal(page.savedOrder.customer.phone, "(415) 555-0132");
  assert.equal(page.cleared, true);
  assert.equal(page.location.href, "order-confirmation.html?order=NM-TEST");
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [["measure", "checkout_started"]]);
  assert.equal(node("email").handlers.blur, undefined);
});

test("location limits allow boundary values and omit invalid matching fields", async () => {
  const data = helper();
  const valid = { city: "A".repeat(128), region: "B".repeat(128), postalCode: "A1 -".repeat(8), country: "US" };
  assert.deepEqual(plain(await data.buildUserData(valid)), {
    city: valid.city, region: valid.region, postal_code: valid.postalCode.trim(), country: "US"
  });
  for (const postalCode of ["1".repeat(33), "94107/1234", "94107_1234", "94107\t1234"]) {
    assert.deepEqual(plain(await data.buildUserData({
      city: "A".repeat(129), region: "B".repeat(129), postalCode, country: "US"
    })), { country: "US" });
  }
});

test("checkout rejects invalid location fields and accepts trimmed boundary values", () => {
  for (const [field, value] of [
    ["city", "A".repeat(129)], ["region", "B".repeat(129)],
    ["postalCode", "1".repeat(33)], ["postalCode", "94107/1234"], ["postalCode", "94107_1234"]
  ]) {
    const page = checkout();
    page.node("fill-test").handlers.click();
    page.node(field).value = value;
    page.submit();
    assert.equal(page.savedOrder, undefined);
    assert.equal(page.cleared, false);
    assert.equal(page.location.href, undefined);
    assert.equal(page.node(field).classList.contains("has-error"), true);
    assert.equal(page.node("form-error").hidden, false);
  }
  const page = checkout();
  page.node("fill-test").handlers.click();
  page.node("city").value = " " + "A".repeat(128) + " ";
  page.node("region").value = "B".repeat(128);
  page.node("postalCode").value = "A1 -".repeat(7) + "A1-Z";
  page.submit();
  assert.equal(page.savedOrder.customer.city, "A".repeat(128));
  assert.equal(page.savedOrder.customer.postalCode.length, 32);
});

test("phone input formats and caps US digits, strips other characters, and reformats on country change", () => {
  const { node } = checkout();
  const phone = node("phone");
  for (const [input, expected] of [
    ["4", "(4"], ["41", "(41"], ["415", "(415"], ["4155", "(415) 5"],
    ["(415) 555-2671", "(415) 555-2671"],
    ["4155552671999", "(415) 555-2671"], ["+abc415.555-2671", "(415) 555-2671"],
    ["14155552671", "(141) 555-5267"], ["", ""]
  ]) {
    phone.value = input;
    phone.handlers.input();
    assert.equal(phone.value, expected);
  }
  phone.value = "(415) 555-2671";
  assert.equal(helper().normalizePhone("1", phone.value), "14155552671");
  node("phoneCountryCode").value = "44";
  node("phoneCountryCode").handlers.change();
  assert.equal(phone.value, "4155552671");
  phone.value = "+abc07911 123456";
  phone.handlers.input();
  assert.equal(phone.value, "07911123456");
  assert.equal(helper().normalizePhone("44", phone.value), "447911123456");
  node("phoneCountryCode").value = "1";
  node("phoneCountryCode").handlers.change();
  assert.equal(phone.value, "(079) 111-2345");
});

test("checkout reload sends once for the same bag and again for changed items or quantities", () => {
  const session = storage();
  const items = [
    { itemId: "TEE", name: "Tee", quantity: 2, unitPrice: 4800, lineTotal: 9600 },
    { itemId: "BOTTLE", name: "Bottle", quantity: 1, unitPrice: 3200, lineTotal: 3200 }
  ];
  assert.equal(checkout(session, items).calls.length, 1);
  assert.equal(checkout(session, items).calls.length, 0);
  assert.equal(checkout(session, [...items].reverse()).calls.length, 0);
  const changed = items.map(item => ({ ...item, quantity: item.quantity + 1 }));
  assert.equal(checkout(session, changed).calls.length, 1);
  assert.equal(checkout(session, changed).calls.length, 0);
  assert.equal(checkout(session, changed.slice(0, 1)).calls.length, 1);
  assert.equal(checkout(session, items).calls.length, 1);
  assert.equal(checkout(storage(), items).calls.length, 1);
});

test("reload during hashing sends exactly one purchase even if the earlier run later finishes", async () => {
  const session = storage();
  let release;
  const oldPage = confirmation({ buildUserData: () => new Promise(resolve => { release = resolve; }) }, session);
  const pending = oldPage.run();
  assert.equal(session.getItem("nm_order_seen_NM-TEST-ORDER"), undefined);
  const newPage = confirmation(helper(), session);
  await newPage.run();
  assert.deepEqual(newPage.calls[1], purchase);
  release({});
  await pending;
  await newPage.run();
  assert.deepEqual(oldPage.calls, []);
  assert.equal(newPage.calls.filter(call => call[0] === "measure").length, 1);
});

test("failed marker reads or writes never send unguarded purchase or checkout events", async () => {
  for (const method of ["getItem", "setItem"]) {
    const session = storage();
    session[method] = () => { throw new Error("Storage unavailable"); };
    const page = confirmation(helper(), session);
    await page.run();
    await page.run();
    assert.deepEqual(page.calls, []);
    assert.deepEqual(checkout(session).calls, []);
  }
});

test("failed order save leaves checkout and bag intact and shows an error", () => {
  const page = checkout(storage(), undefined, false);
  page.node("fill-test").handlers.click();
  page.submit();
  assert.equal(page.savedOrder, undefined);
  assert.equal(page.cleared, false);
  assert.equal(page.location.href, undefined);
  assert.equal(page.node("form-error").hidden, false);
  assert.match(page.node("form-error").textContent, /couldn't save your order/);
});

test("order storage reports both successful and failed saves", () => {
  const session = storage();
  const context = vm.createContext({
    window: { NM_CATALOG: { products: [], categories: [], currency: "USD" } },
    document: { getElementById: () => null, body: { getAttribute: () => "checkout" } },
    sessionStorage: session
  });
  vm.runInContext(readFileSync(join(root, "js/store.js"), "utf8"), context);
  assert.equal(context.window.NM.orders.save({ id: "NM-TEST" }), true);
  assert.equal(context.window.NM.orders.last().id, "NM-TEST");
  session.setItem = () => { throw new Error("Quota exceeded"); };
  assert.equal(context.window.NM.orders.save({ id: "NM-NEXT" }), false);
  assert.equal(context.window.NM.orders.last().id, "NM-TEST");
});

test("the reusable helper loads before confirmation and is not loaded by other pages", () => {
  const html = readFileSync(join(root, "order-confirmation.html"), "utf8");
  assert(html.indexOf('src="js/user-data.js"') < html.indexOf('src="js/pages/confirmation.js"'));
  for (const file of ["index.html", "category.html", "product.html", "cart.html", "checkout.html"]) {
    assert(!readFileSync(join(root, file), "utf8").includes("js/user-data.js"));
  }
});
