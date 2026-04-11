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

  function renderContact(L) {
    if (!contact || typeof contact !== "object") return "";
    const items = [];
    if (contact.wechatQR || contact.wechatId) {
      let inner = '<div class="label">' + window.escHtml(L.wechat) + "</div>";
      if (contact.wechatId) {
        inner += '<div class="value">' + window.escHtml(contact.wechatId) + "</div>";
      }
      if (contact.wechatQR) {
        inner += '<img class="qr" src="' + window.escHtml(contact.wechatQR) +
          '" alt="WeChat QR" onerror="this.style.display=\'none\'">' +
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

    const galleryHtml =
      '<div class="gallery">' +
        '<div class="main-img-wrap">' +
          (mainSrc
            ? '<div class="main-img" style="background-image:url(\'' + mainSrc + '\')"></div>'
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

    const infoHtml =
      '<div class="info">' +
        '<div class="badges">' + badges.join("") + "</div>" +
        '<h1 class="detail-title">' + window.escHtml(product.title) + "</h1>" +
        (product.askingPrice != null
          ? '<div class="detail-price"><span class="currency">CAD $</span>' + product.askingPrice + "</div>"
          : '<div class="detail-price">—</div>') +
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

    // Thumbnail switching
    const mainImg = detailEl.querySelector(".main-img");
    detailEl.querySelectorAll(".thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        detailEl.querySelectorAll(".thumb").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        if (mainImg) {
          mainImg.style.backgroundImage = "url('" + t.dataset.src + "')";
          mainImg.classList.remove("placeholder");
          mainImg.innerHTML = "";
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
