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

function confirmation(userData) {
  const calls = [];
  const stored = new Map();
  const order = {
    id: "NM-TEST-ORDER", customer: testDetails, subtotal: 9600, tax: 768, total: 10368, currency: "USD",
    items: [{ itemId: "NM-RUN-002-COB-M", name: "AeroLite Run Tee", quantity: 2, unitPrice: 4800, lineTotal: 9600, image: "test.svg" }]
  };
  const context = vm.createContext({
    document: { getElementById: () => ({ innerHTML: "" }) },
    NM: { param: () => order.id, orders: { last: () => order }, escapeHtml: String, money: String },
    NMUserData: userData,
    sessionStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    oaiq: (...args) => calls.push(plain(args))
  });
  return { calls, run: () => vm.runInContext(confirmationSource, context) };
}

const purchase = ["measure", "order_created", {
  type: "contents", amount: 9600, currency: "USD",
  contents: [{ id: "NM-RUN-002-COB-M", name: "AeroLite Run Tee", content_type: "product", quantity: 2, amount: 4800, currency: "USD" }]
}, { event_id: "NM-TEST-ORDER" }];

test("confirmation waits for hashes, initializes only finished user data, then sends one unchanged purchase", async () => {
  let release;
  let builds = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const data = helper();
  const page = confirmation({ buildUserData: async customer => { builds++; await gate; return data.buildUserData(customer); } });
  const pending = page.run();
  assert.deepEqual(page.calls, []);
  await page.run(); // Even a reload while hashes are pending cannot send another purchase.
  assert.equal(builds, 1);
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

test("checkout still validates, fills test details, and saves the phone fields without setting Pixel user data", () => {
  const nodes = new Map();
  const calls = [];
  let savedOrder;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: "", hidden: true, handlers: {}, classList: { toggle() {}, add() {}, remove() {} },
      addEventListener(event, callback) { this.handlers[event] = callback; }
    });
    return nodes.get(id);
  }
  const summary = { items: [], subtotal: 9600, tax: 768, total: 10368, currency: "USD" };
  summary.items.push({ name: "Tee", quantity: 2, unitPrice: 4800, lineTotal: 9600 });
  const context = vm.createContext({
    document: { getElementById: node }, window: { location: {} },
    NM: { cart: { summary: () => summary, clear() {} }, money: String, escapeHtml: String,
      orders: { newId: () => "NM-TEST", save: order => { savedOrder = order; } } },
    oaiq: (...args) => calls.push(args)
  });
  vm.runInContext(checkoutSource, context);
  const submit = () => node("checkout-form").handlers.submit({ preventDefault() {} });
  submit();
  assert.equal(savedOrder, undefined);
  assert.equal(node("form-error").hidden, false);
  node("fill-test").handlers.click();
  for (const [field, value] of Object.entries(testDetails)) assert.equal(node(field).value, value);
  assert.equal(node("form-error").hidden, true);
  node("email").value = "invalid";
  submit();
  assert.equal(savedOrder, undefined);
  node("email").value = testDetails.email;
  submit();
  assert.equal(savedOrder.customer.phoneCountryCode, "1");
  assert.equal(savedOrder.customer.phone, "(415) 555-0132");
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [["measure", "checkout_started"]]);
  assert.equal(node("email").handlers.blur, undefined);
});

test("the reusable helper loads before confirmation and is not loaded by other pages", () => {
  const html = readFileSync(join(root, "order-confirmation.html"), "utf8");
  assert(html.indexOf('src="js/user-data.js"') < html.indexOf('src="js/pages/confirmation.js"'));
  for (const file of ["index.html", "category.html", "product.html", "cart.html", "checkout.html"]) {
    assert(!readFileSync(join(root, file), "utf8").includes("js/user-data.js"));
  }
});
