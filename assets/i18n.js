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
    Furniture: "Furniture",
    Electronics: "Electronics",
    Kitchen: "Kitchen",
    Clothing: "Clothing",
    Other: "Other",
    hideSold: "Hide sold",
    showAll: "Show all",
    sold: "SOLD",
    reserved: "RESERVED",
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
    email: "Email",
    phone: "Phone",
    xiaohongshu: "Xiaohongshu",
    notFound: "Product not found."
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
    Furniture: "家具",
    Electronics: "电子产品",
    Kitchen: "厨房",
    Clothing: "服装",
    Other: "其他",
    hideSold: "隐藏已售",
    showAll: "显示全部",
    sold: "已售",
    reserved: "已预订",
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
    email: "邮箱",
    phone: "电话",
    xiaohongshu: "小红书",
    notFound: "未找到该商品。"
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
