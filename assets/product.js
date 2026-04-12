// Product detail page.
(async function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const detailEl = document.querySelector(".detail");
  const langBtn = document.querySelector("[data-lang-btn]");
  const backBtn = document.querySelector("[data-back]");
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  let productData, contact;
  try {
    const [pData, cData] = await Promise.all([
      fetch("data/products.json", { cache: "no-cache" }).then(function (r) { return r.json(); }),
      fetch("data/contact.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]);
    productData = pData;
    contact = cData || {};
  } catch (e) {
    detailEl.innerHTML = '<p class="empty">Failed to load product.</p>';
    return;
  }

  const product = (productData.products || []).find(function (p) { return p.id === id; });
  let lang = window.getLang();

  function fallbackCopy(text) {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(input);
    return ok;
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {}
    }
    return fallbackCopy(text);
  }

  function ensureLightbox(L) {
    let lightbox = document.querySelector(".image-lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "image-lightbox";
      lightbox.hidden = true;
      lightbox.innerHTML =
        '<button type="button" class="image-lightbox-close" data-lightbox-close aria-label="' + window.escHtml(L.closePreview) + '">×</button>' +
        '<div class="image-lightbox-backdrop" data-lightbox-close></div>' +
        '<div class="image-lightbox-dialog">' +
          '<img class="image-lightbox-img" alt="">' +
        "</div>";
      document.body.appendChild(lightbox);

      lightbox.addEventListener("click", function (e) {
        if (e.target.hasAttribute("data-lightbox-close")) closeLightbox();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeLightbox();
      });
    } else {
      const closeBtn = lightbox.querySelector(".image-lightbox-close");
      if (closeBtn) closeBtn.setAttribute("aria-label", L.closePreview);
    }
    return lightbox;
  }

  function openLightbox(src, alt, L) {
    const lightbox = ensureLightbox(L);
    const image = lightbox.querySelector(".image-lightbox-img");
    if (!image) return;
    image.src = src;
    image.alt = alt || "";
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    const lightbox = document.querySelector(".image-lightbox");
    if (!lightbox) return;
    const image = lightbox.querySelector(".image-lightbox-img");
    if (image) {
      image.removeAttribute("src");
      image.alt = "";
    }
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
  }

  function renderContact(L) {
    if (!contact || typeof contact !== "object") return "";
    const items = [];
    if (contact.wechatQR || contact.wechatId) {
      let inner = '<div class="label">' + window.escHtml(L.wechat) + "</div>";
      if (contact.wechatId) {
        inner += '<button type="button" class="value link copy-btn" data-copy-text="' +
          window.escHtml(contact.wechatId) + '">' + window.escHtml(contact.wechatId) + "</button>" +
          '<div class="hint copy-feedback" data-copy-feedback>' + window.escHtml(L.wechatCopy) + "</div>";
      }
      if (contact.wechatQR) {
        inner += '<div class="qr-frame"><img class="qr" src="' + window.escHtml(contact.wechatQR) +
          '" alt="WeChat QR" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="hint">' + window.escHtml(L.wechatScan) + "</div>";
      }
      items.push('<div class="contact-item wechat">' + inner + "</div>");
    }
    if (contact.email) {
      items.push(
        '<div class="contact-item"><div class="label">' + window.escHtml(L.email) +
        '</div><a class="value link" href="mailto:' + window.escHtml(contact.email) + '">' +
        window.escHtml(contact.email) + "</a></div>"
      );
    }
    if (contact.phone) {
      items.push(
        '<div class="contact-item"><div class="label">' + window.escHtml(L.phone) +
        '</div><a class="value link" href="tel:' + window.escHtml(contact.phone) + '">' +
        window.escHtml(contact.phone) + "</a></div>"
      );
    }
    if (contact.xiaohongshu) {
      items.push(
        '<div class="contact-item"><div class="label">' + window.escHtml(L.xiaohongshu) +
        '</div><a class="value link" href="' + window.escHtml(contact.xiaohongshu) +
        '" target="_blank" rel="noopener">' + window.escHtml(contact.xiaohongshu) + "</a></div>"
      );
    }
    if (!items.length) {
      return '<p class="empty small">Contact info not set yet. Edit <code>data/contact.json</code>.</p>';
    }
    return '<div class="contact-grid">' + items.join("") + "</div>";
  }

  function bindCopyButtons(L) {
    detailEl.querySelectorAll("[data-copy-text]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const feedback = button.parentElement && button.parentElement.querySelector("[data-copy-feedback]");
        const ok = await copyText(button.getAttribute("data-copy-text") || "");
        if (feedback) feedback.textContent = ok ? L.wechatCopied : L.wechatCopyFailed;
      });
    });
  }

  function render() {
    const L = window.tDict(lang);
    document.documentElement.lang = lang === "zh" ? "zh" : "en";
    langBtn.textContent = L.langSwitch;
    backBtn.textContent = L.back;

    if (!product) {
      document.title = L.notFound + " · " + L.siteTitle;
      detailEl.innerHTML = '<p class="empty">' + window.escHtml(L.notFound) + "</p>";
      return;
    }

    document.title = product.title + " · " + L.siteTitle;
    const statusLower = (product.status || "").toLowerCase();
    const images = product.images && product.images.length ? product.images : [];
    const mainSrc = images[0] || "";
    const displayPrice = window.getDisplayPrice(product);

    const galleryHtml =
      '<div class="gallery">' +
        '<div class="main-img-wrap">' +
          (mainSrc
            ? '<button type="button" class="main-img-trigger" data-main-src="' + window.escHtml(mainSrc) +
              '" aria-label="' + window.escHtml(L.viewOriginal) + '">' +
                '<img class="main-img" src="' + window.escHtml(mainSrc) + '" alt="' + window.escHtml(product.title) + '">' +
              "</button>"
            : '<div class="main-img placeholder"><span>📦</span></div>') +
        "</div>" +
        (images.length > 1
          ? '<div class="thumbs">' + images.map(function (src, i) {
              return '<button type="button" class="thumb' + (i === 0 ? " active" : "") +
                '" data-src="' + src + '" style="background-image:url(\'' + src + '\')"></button>';
            }).join("") + "</div>"
          : "") +
      "</div>";

    const badges = [];
    badges.push('<span class="badge cat">' + window.escHtml(L[product.category] || product.category) + "</span>");
    if (product.condition) {
      badges.push('<span class="badge cond">' +
        window.escHtml(L.conditionValues[product.condition] || product.condition) + "</span>");
    }
    if (product.negotiable) {
      badges.push('<span class="badge neg">' + window.escHtml(L.negotiable) + "</span>");
    } else {
      badges.push('<span class="badge firm">' + window.escHtml(L.firm) + "</span>");
    }
    if (statusLower === "sold") {
      badges.push('<span class="badge sold">' + window.escHtml(L.sold) + "</span>");
    } else if (statusLower === "reserved") {
      badges.push('<span class="badge reserved">' + window.escHtml(L.reserved) + "</span>");
    } else if (statusLower === "deleted") {
      badges.push('<span class="badge deleted">' + window.escHtml(L.deleted) + "</span>");
    }

    const metas = [];
    if (product.brand) {
      metas.push('<div class="meta-row"><span class="meta-label">' + L.brand + "</span><span>" + window.escHtml(product.brand) + "</span></div>");
    }
    if (product.model) {
      metas.push('<div class="meta-row"><span class="meta-label">' + L.model + "</span><span>" + window.escHtml(product.model) + "</span></div>");
    }
    if (product.postedDate) {
      metas.push('<div class="meta-row"><span class="meta-label">' + L.posted + "</span><span>" + window.escHtml(product.postedDate) + "</span></div>");
    }

    const primaryPriceLabel = L[window.getPrimaryPriceLabel(product)] || "";
    const priceFacts = window.getPriceFacts(product);
    const priceFactsHtml = priceFacts.length
      ? '<div class="detail-price-meta">' + priceFacts.map(function (item) {
          return '<div class="detail-price-meta-row' + (item.isPrimary ? ' is-primary' : '') +
            '"><span class="detail-price-meta-label">' +
            window.escHtml(L[item.key] || item.key) + '</span><span class="detail-price-meta-value">' +
            window.escHtml(window.formatPrice(item.value)) + "</span></div>";
        }).join("") + "</div>"
      : "";
    const primaryPriceNoteHtml = primaryPriceLabel && !priceFacts.length
      ? '<div class="detail-price-note">' + window.escHtml(primaryPriceLabel) + "</div>"
      : "";

    const infoHtml =
      '<div class="info">' +
        '<div class="badges">' + badges.join("") + "</div>" +
        '<h1 class="detail-title">' + window.escHtml(product.title) + "</h1>" +
        '<div class="detail-price-wrap">' +
          (displayPrice != null
            ? '<div class="detail-price"><span class="currency">CAD $</span>' + displayPrice + "</div>"
            : '<div class="detail-price">—</div>') +
          primaryPriceNoteHtml +
        "</div>" +
        priceFactsHtml +
        (metas.length ? '<div class="meta-list">' + metas.join("") + "</div>" : "") +
        (product.description
          ? '<section class="description"><h3>' + L.description + "</h3><p>" +
            window.escHtml(product.description).replace(/\n/g, "<br>") + "</p></section>"
          : "") +
        '<section class="contact"><h3>' + L.contactMe + "</h3>" +
          '<p class="contact-note">' + window.escHtml(L.contactNote) + "</p>" +
          renderContact(L) +
        "</section>" +
      "</div>";

    detailEl.innerHTML = galleryHtml + infoHtml;
    detailEl.classList.toggle("is-sold", statusLower === "sold");
    detailEl.classList.toggle("is-deleted", statusLower === "deleted");
    bindCopyButtons(L);
    ensureLightbox(L);

    // Thumbnail switching
    const mainImg = detailEl.querySelector(".main-img");
    const mainTrigger = detailEl.querySelector(".main-img-trigger");
    if (mainTrigger) {
      mainTrigger.addEventListener("click", function () {
        openLightbox(mainTrigger.getAttribute("data-main-src") || "", product.title, L);
      });
    }
    detailEl.querySelectorAll(".thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        detailEl.querySelectorAll(".thumb").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        if (mainImg && mainTrigger) {
          mainImg.src = t.dataset.src || "";
          mainTrigger.setAttribute("data-main-src", t.dataset.src || "");
        }
      });
    });
  }

  langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "zh" : "en";
    window.setLang(lang);
    render();
  });

  backBtn.addEventListener("click", function (e) {
    if (document.referrer && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });

  render();
})();
