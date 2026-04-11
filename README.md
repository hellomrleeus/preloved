# Preloved of DongDong · 冬冬二手好物

A tiny static catalog of secondhand goods, deployed on GitHub Pages.

**Live site:** https://hellomrleeus.github.io/preloved/

## How it works

- `index.html` — category tabs + product grid
- `product.html?id=001` — product detail page
- `data/products.json` — product data (regenerated locally from `inventory.xlsx`)
- `data/contact.json` — seller contact info
- `images/<id>/` — generated copies of product photos for the deployed site

No build step, no dependencies, no framework. Just open `index.html` in a browser (or any static server) and it works.

## Product source

Product data comes from the local workbook:

`/Users/xlee/Documents/加拿大/多伦多租房/出二手/inventory.xlsx`

Photo source rules:

- If the `Photo Path` column is filled, that path is used as the source photo folder or image file.
- If `Photo Path` is blank, the default source is a folder next to `inventory.xlsx` named after the product ID, such as `001/`.
- The sync script copies those source photos into this repo's `images/<id>/` folder so GitHub Pages can serve them.

## Editing seller contact info

Edit `data/contact.json`. Supported fields: `wechatId`, `wechatQR` (image path), `email`, `phone`, `xiaohongshu`. Set any field to `""` to hide it.

To add a WeChat QR code, save the image to `assets/contact/wechat-qr.png` and set `"wechatQR": "assets/contact/wechat-qr.png"`.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Local sync

```bash
python3 scripts/sync.py
```

This refreshes both `data/products.json` and the generated product photos under `images/`.
