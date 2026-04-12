// Home page: hero + filter bar + product grid.
(async function () {
  let data;
  try {
    data = await fetch("data/products.json", { cache: "no-cache" }).then(function (r) { return r.json(); });
  } catch (e) {
    document.querySelector(".grid").innerHTML = '<p class="empty">Failed to load products.</p>';
    return;
  }

  const products = Array.isArray(data.products) ? data.products : [];
  const statusKeys = ["available", "reserved", "sold", "deleted"];
  const statusOrder = { available: 0, reserved: 1, sold: 2, deleted: 3 };

  let lang = window.getLang();
  let currentCat = "all";
  let currentStatus = localStorage.getItem("statusFilter") || "all";
  if (["all"].concat(statusKeys).indexOf(currentStatus) === -1) currentStatus = "all";

  const categories = [];
  products.forEach(function (p) {
    if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
  });

  const statusTabsEl = document.querySelector(".status-tabs");
  const tabsEl = document.querySelector(".category-tabs");
  const gridEl = document.querySelector(".grid");
  const countEl = document.querySelector("[data-count]");
  const langBtn = document.querySelector("[data-lang-btn]");
  const statusLabelEl = document.querySelector("[data-status-label]");
  const categoryLabelEl = document.querySelector("[data-category-label]");
  const brandNameEl = document.querySelector("[data-brand-name]");
  const brandTagEl = document.querySelector("[data-brand-tag]");
  const kickerEl = document.querySelector("[data-hero-kicker]");
  const line1El = document.querySelector("[data-hero-line1]");
  const line2El = document.querySelector("[data-hero-line2]");
  const subEl = document.querySelector("[data-hero-sub]");
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function catCount(key) {
    return products.filter(function (product) {
      return window.matchesCatalogFilters(product, {
        category: key,
        status: currentStatus
      });
    }).length;
  }

  function statusCount(key) {
    return window.getStatusCount(products, key, currentCat);
  }

  function makeTab(options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab" +
      (options.active ? " active" : "") +
      (options.kind ? " " + options.kind + "-tab" : "") +
      (options.tone ? " is-" + options.tone : "");
    button.innerHTML =
      '<span class="tab-text">' + window.escHtml(options.label) + "</span>" +
      ' <span class="tab-count">' + options.count + "</span>";
    button.addEventListener("click", options.onClick);
    return button;
  }

  function renderStatusTabs(L) {
    statusTabsEl.innerHTML = "";
    statusTabsEl.appendChild(makeTab({
      kind: "status",
      tone: "all",
      label: L.allStatuses,
      count: statusCount("all"),
      active: currentStatus === "all",
      onClick: function () {
        currentStatus = "all";
        localStorage.setItem("statusFilter", currentStatus);
        render();
      }
    }));

    statusKeys.forEach(function (key) {
      statusTabsEl.appendChild(makeTab({
        kind: "status",
        tone: key,
        label: L[key] || key,
        count: statusCount(key),
        active: currentStatus === key,
        onClick: function () {
          currentStatus = key;
          localStorage.setItem("statusFilter", currentStatus);
          render();
        }
      }));
    });
  }

  function renderCategoryTabs(L) {
    tabsEl.innerHTML = "";
    tabsEl.appendChild(makeTab({
      kind: "category",
      tone: "all",
      label: L.all,
      count: catCount("all"),
      active: currentCat === "all",
      onClick: function () {
        currentCat = "all";
        render();
      }
    }));

    categories.forEach(function (category) {
      tabsEl.appendChild(makeTab({
        kind: "category",
        tone: "category",
        label: L[category] || category,
        count: catCount(category),
        active: currentCat === category,
        onClick: function () {
          currentCat = category;
          render();
        }
      }));
    });
  }

  function renderGrid(L) {
    const list = products.filter(function (product) {
      return window.matchesCatalogFilters(product, {
        category: currentCat,
        status: currentStatus
      });
    });

    list.sort(function (a, b) {
      const ra = statusOrder[window.getProductStatus(a)];
      const rb = statusOrder[window.getProductStatus(b)];
      if (ra !== rb) return ra - rb;
      return (b.id || "").localeCompare(a.id || "");
    });

    if (countEl) countEl.textContent = L.itemCount(list.length);

    gridEl.innerHTML = "";
    if (!list.length) {
      gridEl.innerHTML = '<p class="empty">' + window.escHtml(L.empty) + "</p>";
      return;
    }

    list.forEach(function (product, index) {
      const card = document.createElement("a");
      const status = window.getProductStatus(product);
      card.href = "product.html?id=" + encodeURIComponent(product.id);
      card.className = "card";
      if (status === "sold" || status === "deleted") card.className += " is-muted";
      if (status === "sold") card.className += " is-sold";
      if (status === "deleted") card.className += " is-deleted";
      card.style.animationDelay = (index * 40) + "ms";

      const cover = (product.images && product.images[0]) || "";
      const imgHtml = cover
        ? '<div class="card-img-wrap"><div class="card-img" style="background-image:url(\'' + cover + '\')"></div></div>'
        : '<div class="card-img-wrap"><div class="card-img placeholder"><span>📦</span></div></div>';

      let badge = "";
      if (status === "sold") {
        badge = '<span class="ribbon sold">' + window.escHtml(L.sold) + "</span>";
      } else if (status === "reserved") {
        badge = '<span class="ribbon reserved">' + window.escHtml(L.reserved) + "</span>";
      } else if (status === "deleted") {
        badge = '<span class="ribbon deleted">' + window.escHtml(L.deleted) + "</span>";
      }

      const condBadge = product.condition
        ? '<span class="card-cond">' + window.escHtml(L.conditionValues[product.condition] || product.condition) + "</span>"
        : "";

      const displayPrice = window.getDisplayPrice(product);
      const priceHtml = displayPrice != null
        ? '<span class="card-price"><span class="currency">CAD $</span>' + displayPrice + "</span>"
        : '<span class="card-price">—</span>';

      card.innerHTML =
        imgHtml +
        badge +
        '<div class="card-body">' +
          '<div class="card-title">' + window.escHtml(product.title) + "</div>" +
          '<div class="card-meta">' + priceHtml + condBadge + "</div>" +
        "</div>";
      gridEl.appendChild(card);
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
    if (statusLabelEl) statusLabelEl.textContent = L.filterStatus;
    if (categoryLabelEl) categoryLabelEl.textContent = L.filterCategory;
    langBtn.textContent = L.langSwitch;
    renderStatusTabs(L);
    renderCategoryTabs(L);
    renderGrid(L);
  }

  langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "zh" : "en";
    window.setLang(lang);
    render();
  });

  render();
})();
