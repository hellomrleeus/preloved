// Home page: hero + category tabs + product grid.
(async function () {
  let data;
  try {
    data = await fetch("data/products.json", { cache: "no-cache" }).then(function (r) { return r.json(); });
  } catch (e) {
    document.querySelector(".grid").innerHTML = '<p class="empty">Failed to load products.</p>';
    return;
  }

  const products = Array.isArray(data.products) ? data.products : [];
  let lang = window.getLang();
  let currentCat = "all";
  let hideSold = localStorage.getItem("hideSold") === "1";

  // Preserve sheet-order for categories.
  const categories = [];
  products.forEach(function (p) {
    if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
  });

  const tabsEl = document.querySelector(".category-tabs");
  const gridEl = document.querySelector(".grid");
  const countEl = document.querySelector("[data-count]");
  const langBtn = document.querySelector("[data-lang-btn]");
  const soldBtn = document.querySelector("[data-sold-btn]");
  const brandNameEl = document.querySelector("[data-brand-name]");
  const brandTagEl = document.querySelector("[data-brand-tag]");
  const kickerEl = document.querySelector("[data-hero-kicker]");
  const line1El = document.querySelector("[data-hero-line1]");
  const line2El = document.querySelector("[data-hero-line2]");
  const subEl = document.querySelector("[data-hero-sub]");
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function catCount(key) {
    return products.filter(function (p) {
      if (key !== "all" && p.category !== key) return false;
      if (hideSold && (p.status || "").toLowerCase() === "sold") return false;
      return true;
    }).length;
  }

  function makeTab(key, label) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab" + (currentCat === key ? " active" : "");
    b.innerHTML = window.escHtml(label) +
      ' <span class="tab-count">' + catCount(key) + "</span>";
    b.addEventListener("click", function () { currentCat = key; render(); });
    return b;
  }

  function renderTabs(L) {
    tabsEl.innerHTML = "";
    tabsEl.appendChild(makeTab("all", L.all));
    categories.forEach(function (c) { tabsEl.appendChild(makeTab(c, L[c] || c)); });
  }

  function renderGrid(L) {
    let list = products.slice();
    if (currentCat !== "all") list = list.filter(function (p) { return p.category === currentCat; });
    if (hideSold) list = list.filter(function (p) { return (p.status || "").toLowerCase() !== "sold"; });

    const order = { available: 0, reserved: 1, sold: 2 };
    list.sort(function (a, b) {
      const ra = order[(a.status || "available").toLowerCase()] || 0;
      const rb = order[(b.status || "available").toLowerCase()] || 0;
      if (ra !== rb) return ra - rb;
      return (b.id || "").localeCompare(a.id || "");
    });

    if (countEl) countEl.textContent = L.itemCount(list.length);

    gridEl.innerHTML = "";
    if (!list.length) {
      gridEl.innerHTML = '<p class="empty">' + window.escHtml(L.empty) + "</p>";
      return;
    }

    list.forEach(function (p, i) {
      const a = document.createElement("a");
      const statusLower = (p.status || "").toLowerCase();
      a.href = "product.html?id=" + encodeURIComponent(p.id);
      a.className = "card" + (statusLower === "sold" ? " is-sold" : "");
      a.style.animationDelay = (i * 40) + "ms";

      const cover = (p.images && p.images[0]) || "";
      const imgHtml = cover
        ? '<div class="card-img-wrap"><div class="card-img" style="background-image:url(\'' + cover + '\')"></div></div>'
        : '<div class="card-img-wrap"><div class="card-img placeholder"><span>📦</span></div></div>';

      let badge = "";
      if (statusLower === "sold") {
        badge = '<span class="ribbon sold">' + window.escHtml(L.sold) + "</span>";
      } else if (statusLower === "reserved") {
        badge = '<span class="ribbon reserved">' + window.escHtml(L.reserved) + "</span>";
      }

      const condBadge = p.condition
        ? '<span class="card-cond">' + window.escHtml(L.conditionValues[p.condition] || p.condition) + "</span>"
        : "";

      const priceHtml = p.askingPrice != null
        ? '<span class="card-price"><span class="currency">CAD $</span>' + p.askingPrice + "</span>"
        : '<span class="card-price">—</span>';

      a.innerHTML =
        imgHtml +
        badge +
        '<div class="card-body">' +
          '<div class="card-title">' + window.escHtml(p.title) + "</div>" +
          '<div class="card-meta">' + priceHtml + condBadge + "</div>" +
        "</div>";
      gridEl.appendChild(a);
    });
  }

  function render() {
    const L = window.tDict(lang);
    document.documentElement.lang = lang === "zh" ? "zh" : "en";
    document.title = L.siteTitle + " · Preloved";
    if (brandNameEl) brandNameEl.textContent = L.brandName;
    if (brandTagEl) brandTagEl.textContent = L.brandTag;
    if (kickerEl) kickerEl.textContent = L.heroKicker;
    if (line1El) line1El.textContent = L.heroLine1;
    if (line2El) line2El.textContent = L.heroLine2;
    if (subEl) subEl.textContent = L.heroSub;
    langBtn.textContent = L.langSwitch;
    soldBtn.textContent = hideSold ? L.showAll : L.hideSold;
    soldBtn.classList.toggle("active", hideSold);
    renderTabs(L);
    renderGrid(L);
  }

  langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "zh" : "en";
    window.setLang(lang);
    render();
  });
  soldBtn.addEventListener("click", function () {
    hideSold = !hideSold;
    localStorage.setItem("hideSold", hideSold ? "1" : "0");
    render();
  });

  render();
})();
