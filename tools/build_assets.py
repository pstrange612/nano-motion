#!/usr/bin/env python3
"""Build the generated files for the Nano Motion demo store.

Reads js/products.js (the single source of truth) and writes:
  images/<product id>-<color code>.svg   one illustration per product color
  catalog/nano-motion-catalog.csv        product feed, one row per variant

Usage:
  python3 tools/build_assets.py
  python3 tools/build_assets.py --base-url https://www.nanomotion.example

The catalog is an illustration of Nano Motion's real product feed, so its URLs use a
stand-in production domain and photo file names, not this demo site's addresses.
What must line up with the site is the item_id in each row.

The CSV follows OpenAI's product file schema:
https://developers.openai.com/commerce/specs/file-upload/products
"""
import argparse
import csv
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_BASE_URL = "https://www.nanomotion.example"


def load_catalog():
    text = (ROOT / "js" / "products.js").read_text()
    start = text.index("window.NM_CATALOG")
    body = text[text.index("{", start):].rstrip().rstrip(";")
    return json.loads(body)


def variant_id(product, color_code, size):
    """Mirror of variantId() in js/store.js."""
    if product["sizes"]:
        return f'{product["id"]}-{color_code}-{size}'
    if len(product["colors"]) > 1:
        return f'{product["id"]}-{color_code}'
    return product["id"]


# ---------- Illustrations ----------

def mix(hex_color, target, amount):
    rgb = [int(hex_color[i:i + 2], 16) for i in (1, 3, 5)]
    out = [round(c + (target - c) * amount) for c in rgb]
    return "#%02x%02x%02x" % tuple(out)


def luminance(hex_color):
    r, g, b = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def shapes(art, fill, detail, light, dark):
    """Return SVG markup for one product type, drawn on a 500 x 600 canvas."""
    def ln(width=5):
        return f'fill="none" stroke="{detail}" stroke-width="{width}" stroke-linecap="round"'

    body = f'fill="{fill}" stroke="{detail}" stroke-width="2" stroke-linejoin="round"'
    accent = '<circle cx="{x}" cy="{y}" r="6" fill="#c8f03c"/>'

    if art == "tee":
        return (
            f'<path {body} d="M170 150 L215 128 Q250 165 285 128 L330 150 L410 215 L372 268 L340 245 '
            f'L340 480 Q250 492 160 480 L160 245 L128 268 L90 215 Z"/>'
            f'<path {ln()} d="M215 128 Q250 165 285 128"/>'
            f'<path {ln(3)} d="M160 462 Q250 474 340 462"/>'
            + accent.format(x=302, y=218)
        )
    if art == "tank":
        return (
            f'<path {body} d="M195 125 L212 125 Q250 200 288 125 L305 125 L318 215 Q326 255 345 275 '
            f'L345 480 Q250 492 155 480 L155 275 Q174 255 182 215 Z"/>'
            f'<path {ln()} d="M212 125 Q250 200 288 125"/>'
            + accent.format(x=300, y=300)
        )
    if art == "short":
        return (
            f'<path {body} d="M150 180 L350 180 L378 420 L262 420 L250 300 L238 420 L122 420 Z"/>'
            f'<rect x="150" y="180" width="200" height="26" fill="{detail}"/>'
            f'<path {ln(3)} d="M250 206 L250 300"/>'
            f'<path {ln(3)} d="M236 206 L232 250 M264 206 L268 250"/>'
            + accent.format(x=338, y=398)
        )
    if art == "pants":
        return (
            f'<path {body} d="M175 95 L325 95 L338 260 L322 520 L268 520 L250 250 L232 520 L178 520 L162 260 Z"/>'
            f'<rect x="175" y="95" width="150" height="24" fill="{detail}"/>'
            f'<path {ln(3)} d="M190 300 Q205 400 200 500 M310 300 Q295 400 300 500"/>'
            + accent.format(x=308, y=142)
        )
    if art == "jogger":
        return (
            f'<path {body} d="M165 95 L335 95 L352 270 L335 500 L272 500 L250 250 L228 500 L165 500 L148 270 Z"/>'
            f'<rect x="165" y="95" width="170" height="26" fill="{detail}"/>'
            f'<rect x="162" y="496" width="70" height="24" rx="4" fill="{detail}"/>'
            f'<rect x="268" y="496" width="70" height="24" rx="4" fill="{detail}"/>'
            f'<path {ln(3)} d="M240 121 L236 170 M260 121 L264 170"/>'
            f'<path {ln(4)} d="M185 160 L205 215 M315 160 L295 215"/>'
        )
    if art == "jacket":
        return (
            f'<path {body} d="M175 130 L215 108 L250 140 L285 108 L325 130 L400 195 L425 450 L375 460 '
            f'L352 270 L350 495 L150 495 L148 270 L125 460 L75 450 L100 195 Z"/>'
            f'<path fill="{detail}" d="M215 108 Q250 88 285 108 L250 140 Z"/>'
            f'<path {ln(4)} d="M250 140 L250 495"/>'
            f'<path {ln(3)} d="M185 380 L225 372 M275 372 L315 380"/>'
            + accent.format(x=300, y=215)
        )
    if art == "vest":
        return (
            f'<path {body} d="M190 120 L222 108 L250 140 L278 108 L310 120 L338 210 Q328 255 350 280 '
            f'L350 490 L150 490 L150 280 Q172 255 162 210 Z"/>'
            f'<path fill="{detail}" d="M222 108 Q250 92 278 108 L250 140 Z"/>'
            f'<path {ln(4)} d="M250 140 L250 490"/>'
            f'<path {ln(3)} d="M152 310 L348 310 M150 370 L350 370 M150 430 L350 430 M172 250 L328 250"/>'
        )
    if art == "duffel":
        return (
            f'<path fill="none" stroke="{fill}" stroke-width="18" stroke-linecap="round" '
            f'd="M175 262 Q175 165 250 165 Q325 165 325 262"/>'
            f'<rect {body} x="75" y="250" width="350" height="205" rx="62"/>'
            f'<path {ln(4)} d="M150 252 L150 453 M350 252 L350 453"/>'
            f'<path {ln(3)} stroke-dasharray="10 8" d="M165 285 L335 285"/>'
            f'<rect x="222" y="340" width="56" height="34" rx="6" fill="{detail}"/>'
            + accent.format(x=250, y=357)
        )
    if art == "bottle":
        return (
            f'<rect x="216" y="92" width="68" height="50" rx="12" fill="{detail}"/>'
            f'<rect x="226" y="140" width="48" height="30" fill="{dark}"/>'
            f'<rect {body} x="188" y="165" width="124" height="345" rx="36"/>'
            f'<rect x="206" y="205" width="13" height="255" rx="6.5" fill="#ffffff" opacity="0.28"/>'
            f'<path {ln(3)} d="M190 420 L310 420"/>'
            + accent.format(x=250, y=455)
        )
    if art == "cap":
        return (
            f'<path fill="{detail}" d="M140 345 Q250 312 360 345 Q425 357 445 398 Q335 408 250 386 Q188 370 140 345 Z"/>'
            f'<path {body} d="M140 345 Q138 205 250 205 Q362 205 360 345 Q250 312 140 345 Z"/>'
            f'<path {ln(3)} d="M250 205 Q236 265 228 326 M250 205 Q300 250 322 334"/>'
            f'<circle cx="250" cy="205" r="9" fill="{detail}"/>'
            + accent.format(x=280, y=290)
        )
    if art == "mat":
        return (
            f'<path fill="{dark}" d="M95 330 L60 455 L330 455 L372 372 Z"/>'
            f'<rect {body} x="95" y="255" width="300" height="118" rx="59"/>'
            f'<rect x="165" y="255" width="16" height="118" fill="{detail}"/>'
            f'<rect x="250" y="255" width="16" height="118" fill="{detail}"/>'
            f'<circle cx="336" cy="314" r="59" fill="{light}" stroke="{detail}" stroke-width="2"/>'
            f'<circle cx="336" cy="314" r="40" {ln(3)}/>'
            f'<circle cx="336" cy="314" r="21" {ln(3)}/>'
        )
    if art == "block":
        return (
            f'<polygon fill="{light}" stroke="{detail}" stroke-width="2" stroke-linejoin="round" points="110,300 185,235 410,235 335,300"/>'
            f'<polygon fill="{dark}" stroke="{detail}" stroke-width="2" stroke-linejoin="round" points="335,300 410,235 410,385 335,450"/>'
            f'<polygon {body} points="110,300 335,300 335,450 110,450"/>'
            + "".join(
                f'<circle cx="{x}" cy="{y}" r="{r}" fill="{detail}" opacity="0.55"/>'
                for x, y, r in [(150, 335, 4), (205, 395, 3), (270, 340, 5), (300, 415, 3), (175, 425, 3), (240, 370, 2.5)]
            )
        )
    raise ValueError(f"Unknown art type: {art}")


def product_svg(product, color):
    fill = color["hex"]
    is_light = luminance(fill) > 0.3
    detail = mix(fill, 0, 0.22) if is_light else mix(fill, 255, 0.24)
    light = mix(fill, 255, 0.18)
    dark = mix(fill, 0, 0.18)
    label = f'{product["name"]} in {color["name"]}'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" role="img" '
        f'aria-label="{label.replace(chr(34), "&quot;")}">'
        '<defs><radialGradient id="g" cx="50%" cy="42%" r="65%">'
        '<stop offset="0" stop-color="#f5f3ee"/><stop offset="1" stop-color="#e4e0d7"/>'
        '</radialGradient></defs>'
        '<rect width="500" height="600" fill="url(#g)"/>'
        '<ellipse cx="250" cy="548" rx="160" ry="13" fill="#000000" opacity="0.08"/>'
        + shapes(product["art"], fill, detail, light, dark)
        + "</svg>\n"
    )


def build_images(catalog):
    out_dir = ROOT / "images"
    out_dir.mkdir(exist_ok=True)
    count = 0
    for product in catalog["products"]:
        for color in product["colors"]:
            path = out_dir / f'{product["id"]}-{color["code"]}.svg'
            path.write_text(product_svg(product, color))
            count += 1
    return count


# ---------- Catalog CSV ----------

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


COLUMNS = [
    "item_id", "group_id", "listing_has_variations", "variant_dict",
    "title", "description", "url", "brand", "image_url", "price", "availability",
    "seller_name", "seller_url", "product_category", "color", "size",
    "target_countries", "store_country",
    "is_eligible_search", "is_eligible_checkout", "is_ads_eligible",
]


def build_catalog_csv(catalog, base_url):
    base_url = base_url.rstrip("/")
    categories = {c["id"]: c["name"] for c in catalog["categories"]}
    rows = []
    for product in catalog["products"]:
        has_variants = bool(product["sizes"]) or len(product["colors"]) > 1
        for color in product["colors"]:
            for size in product["sizes"] or [None]:
                item_id = variant_id(product, color["code"], size)
                options = {}
                if has_variants:
                    options["color"] = color["name"]
                    if size:
                        options["size"] = size
                title = product["name"]
                if options:
                    title += " - " + ", ".join(options.values())
                rows.append({
                    "item_id": item_id,
                    "group_id": product["id"] if has_variants else "",
                    "listing_has_variations": "true" if has_variants else "",
                    "variant_dict": json.dumps(options) if options else "",
                    "title": title,
                    "description": product["description"],
                    "url": f'{base_url}/{product["category"]}/{slug(product["name"])}?variant={item_id}',
                    "brand": catalog["brand"],
                    "image_url": f'{base_url}/images/{product["id"]}-{color["code"]}.jpg',
                    # Feed prices are major units with a currency code; site and event amounts are cents.
                    "price": f'{product["price"] / 100:.2f} {catalog["currency"]}',
                    "availability": "in_stock",
                    "seller_name": catalog["brand"],
                    "seller_url": base_url + "/",
                    "product_category": f'Activewear > {categories[product["category"]]}',
                    "color": color["name"],
                    "size": size or "",
                    "target_countries": "US",
                    "store_country": "US",
                    "is_eligible_search": "true",
                    "is_eligible_checkout": "false",
                    "is_ads_eligible": "true",
                })
    out_dir = ROOT / "catalog"
    out_dir.mkdir(exist_ok=True)
    with open(out_dir / "nano-motion-catalog.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Domain to use in the catalog's product and image URLs")
    args = parser.parse_args()

    catalog = load_catalog()
    images = build_images(catalog)
    rows = build_catalog_csv(catalog, args.base_url)
    print(f"Wrote {images} product images and {rows} catalog rows (base URL: {args.base_url})")


if __name__ == "__main__":
    main()
