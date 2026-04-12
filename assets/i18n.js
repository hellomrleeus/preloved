// Translations and language helpers.
window.I18N = {
  en: {
    siteTitle: "Preloved of DongDong",
    siteSub: "Quality secondhand goods",
    brandName: "Preloved",
    brandTag: "of DongDong",
    heroKicker: "✨ Curated · Sudbury · Pre-loved",
    heroLine1: "Great stuff,",
    heroLine2: "second time around.",
    heroSub: "A tiny catalog of things I'm passing on — all in Sudbury, all ready for a new home.",
    itemCount: function (n) { return n + (n === 1 ? " item" : " items"); },
    all: "All",
    allStatuses: "All statuses",
    filterStatus: "Status",
    filterCategory: "Category",
    Furniture: "Furniture",
    Electronics: "Electronics",
    Kitchen: "Kitchen",
    Clothing: "Clothing",
    Other: "Other",
    available: "AVAILABLE",
    sold: "SOLD",
    reserved: "RESERVED",
    deleted: "DELETED",
    negotiable: "Negotiable",
    firm: "Firm",
    condition: "Condition",
    brand: "Brand",
    model: "Model",
    description: "Description",
    posted: "Posted",
    contactMe: "Interested? Contact me",
    contactNote: "Reach out via any channel below — first come first served.",
    back: "← Back",
    empty: "No products in this category yet.",
    langSwitch: "中文",
    conditionValues: {
      "New": "New",
      "Like New": "Like New",
      "Good": "Good",
      "Fair": "Fair",
      "Poor": "Poor"
    },
    wechat: "WeChat",
    wechatScan: "Scan to add on WeChat",
    wechatCopy: "Click to copy WeChat ID",
    wechatCopied: "WeChat ID copied",
    wechatCopyFailed: "Copy failed. Copy it manually.",
    viewOriginal: "View original image",
    closePreview: "Close image preview",
    email: "Email",
    phone: "Phone",
    xiaohongshu: "Xiaohongshu",
    notFound: "Product not found.",
    listingPrice: "Listing price",
    reservedPrice: "Reserved price",
    soldPrice: "Sold price"
  },
  zh: {
    siteTitle: "冬冬二手好物",
    siteSub: "精挑细选的二手好物",
    brandName: "冬冬二手",
    brandTag: "Preloved",
    heroKicker: "✨ 精选 · Sudbury · 二手好物",
    heroLine1: "好东西，",
    heroLine2: "值得再被爱一次。",
    heroSub: "一个小小的目录，都是我想转手的好物——都在 Sudbury，等一个新主人。",
    itemCount: function (n) { return n + " 件商品"; },
    all: "全部",
    allStatuses: "全部状态",
    filterStatus: "状态",
    filterCategory: "分类",
    Furniture: "家具",
    Electronics: "家电",
    Kitchen: "厨房",
    Clothing: "服装",
    Other: "其他",
    available: "在售",
    sold: "已售",
    reserved: "已预订",
    deleted: "已下架",
    negotiable: "可议价",
    firm: "一口价",
    condition: "成色",
    brand: "品牌",
    model: "型号",
    description: "描述",
    posted: "上架",
    contactMe: "感兴趣？联系我",
    contactNote: "任选下方任一方式联系，先到先得。",
    back: "← 返回",
    empty: "此分类暂无商品。",
    langSwitch: "EN",
    conditionValues: {
      "New": "全新",
      "Like New": "几乎全新",
      "Good": "良好",
      "Fair": "一般",
      "Poor": "较差"
    },
    wechat: "微信",
    wechatScan: "扫码添加微信",
    wechatCopy: "点击复制微信号",
    wechatCopied: "微信号已复制",
    wechatCopyFailed: "复制失败，请手动复制",
    viewOriginal: "查看原图",
    closePreview: "关闭图片预览",
    email: "邮箱",
    phone: "电话",
    xiaohongshu: "小红书",
    notFound: "未找到该商品。",
    listingPrice: "标价",
    reservedPrice: "预订价",
    soldPrice: "成交价"
  }
};

window.getLang = function () {
  const saved = localStorage.getItem("lang");
  if (saved === "en" || saved === "zh") return saved;
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
};

window.setLang = function (l) {
  localStorage.setItem("lang", l);
};

window.tDict = function (lang) {
  return window.I18N[lang] || window.I18N.en;
};

window.escHtml = function (s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
  });
};

window.formatPrice = function (n) {
  if (n == null || n === "") return "—";
  return "CAD $" + n;
};

window.getProductStatus = function (product) {
  const raw = product && product.status != null ? String(product.status) : "";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "reserved" || normalized === "sold" || normalized === "deleted") {
    return normalized;
  }
  return "available";
};

window.matchesCatalogFilters = function (product, filters) {
  const category = filters && filters.category ? filters.category : "all";
  const status = filters && filters.status ? filters.status : "all";
  if (category !== "all" && product.category !== category) return false;
  if (status !== "all" && window.getProductStatus(product) !== status) return false;
  return true;
};

window.getStatusCount = function (products, status, category) {
  return (products || []).filter(function (product) {
    return window.matchesCatalogFilters(product, {
      status: status,
      category: category || "all"
    });
  }).length;
};

window.getDisplayPrice = function (product) {
  if (!product || typeof product !== "object") return null;
  const status = window.getProductStatus(product);
  if (status === "reserved" && product.reservedPrice != null && product.reservedPrice !== "") {
    return product.reservedPrice;
  }
  if (status === "sold" && product.soldPrice != null && product.soldPrice !== "") {
    return product.soldPrice;
  }
  if (product.askingPrice != null && product.askingPrice !== "") {
    return product.askingPrice;
  }
  return null;
};

window.getPrimaryPriceLabel = function (product) {
  const status = window.getProductStatus(product);
  if (status === "reserved" && product && product.reservedPrice != null && product.reservedPrice !== "") {
    return "reservedPrice";
  }
  if (status === "sold" && product && product.soldPrice != null && product.soldPrice !== "") {
    return "soldPrice";
  }
  return "listingPrice";
};

window.getPriceFacts = function (product) {
  if (!product || typeof product !== "object") return [];

  const status = window.getProductStatus(product);
  const askingPrice = product.askingPrice;
  const reservedPrice = product.reservedPrice;
  const soldPrice = product.soldPrice;
  const facts = [];

  if (status === "reserved") {
    const effectiveReservedPrice = reservedPrice != null && reservedPrice !== "" ? reservedPrice : askingPrice;
    if (effectiveReservedPrice != null && effectiveReservedPrice !== "") {
      facts.push({ key: "reservedPrice", value: effectiveReservedPrice, isPrimary: true });
    }
    if (
      askingPrice != null &&
      askingPrice !== "" &&
      reservedPrice != null &&
      reservedPrice !== "" &&
      reservedPrice !== askingPrice
    ) {
      facts.push({ key: "listingPrice", value: askingPrice, isPrimary: false });
    }
    return facts;
  }

  if (status === "sold") {
    const effectiveSoldPrice = soldPrice != null && soldPrice !== "" ? soldPrice : askingPrice;
    if (effectiveSoldPrice != null && effectiveSoldPrice !== "") {
      facts.push({ key: "soldPrice", value: effectiveSoldPrice, isPrimary: true });
    }
    if (
      askingPrice != null &&
      askingPrice !== "" &&
      soldPrice != null &&
      soldPrice !== "" &&
      soldPrice !== askingPrice
    ) {
      facts.push({ key: "listingPrice", value: askingPrice, isPrimary: false });
    }
    return facts;
  }

  return facts;
};
