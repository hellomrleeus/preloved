# Preloved of DongDong · 冬冬二手好物

A tiny static catalog of secondhand goods, deployed on GitHub Pages.

**Live site:** https://hellomrleeus.github.io/preloved/

## How it works

- `index.html` — category tabs + product grid
- `product.html?id=001` — product detail page
- `data/products.json` — product data (regenerated locally from a private source)
- `data/contact.json` — seller contact info
- `images/<id>/` — one folder per product; first file is the cover image

No build step, no dependencies, no framework. Just open `index.html` in a browser (or any static server) and it works.

## Editing seller contact info

Edit `data/contact.json`. Supported fields: `wechatId`, `wechatQR` (image path), `email`, `phone`, `xiaohongshu`. Set any field to `""` to hide it.

To add a WeChat QR code, save the image to `assets/contact/wechat-qr.png` and set `"wechatQR": "assets/contact/wechat-qr.png"`.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
