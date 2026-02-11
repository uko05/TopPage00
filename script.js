document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     (A) 既存サイドバーJSがある場合の安全化
     ========================= */
  const toggleButton = document.getElementById("toggle-button");
  const sidebar = document.getElementById("sidebar");

  if (toggleButton && sidebar) {
    toggleButton.addEventListener("click", () => {
      sidebar.classList.toggle("hidden");
      const isExpanded = !sidebar.classList.contains("hidden");
      toggleButton.setAttribute("aria-expanded", String(isExpanded));
      toggleButton.setAttribute("aria-label", isExpanded ? "メニューを閉じる" : "メニューを開く");
    });

    // 親ノード複数対応（将来の保守用）
    document.querySelectorAll(".parent-node").forEach((parent) => {
      parent.addEventListener("click", (event) => {
        event.preventDefault();
        const next = parent.nextElementSibling; // 直後のULを想定
        if (!next || !next.classList.contains("child-nodes")) return;

        next.classList.toggle("active");
        const isActive = next.classList.contains("active");

        // 先頭の▼/▶だけ切替（テキスト崩れを防ぐ）
        const label =
          parent.getAttribute("data-label") ||
          parent.textContent.replace(/^▼\s*|^▶\s*/, "");
        parent.setAttribute("data-label", label);
        parent.textContent = `${isActive ? "▼" : "▶"} ${label}`;
      });
    });
  }

  /* =========================
     (B) トップ(index)の言語切替（localStorage: "lang"）
     ※ data-i18n 方式で統一
     ========================= */

  const langRadios = document.querySelectorAll('input[name="lang"]');

  // トップページ判定（site-titleが存在しないページでは何もしない）
  const siteTitle = document.getElementById("site-title");
  if (!siteTitle || !langRadios.length) return;

  // i18n辞書（HTMLの data-i18n とキー名を一致させる）
  const dict = {
    ja: {
      homeTitle: "うーこの部屋",
      secRanking: "推しキャラランキング",
      secFree: "フリーフォーマット",
      secCheck: "チェックシート",
      friend: "＜友達ください…",
      langJa: "日本語",
      langEn: "English",

      cardGenshin: "原神",
      cardStarrailPath: "スタレ【運命】",
      cardStarrailElem: "スタレ【属性】",
      cardStarrail: "スタレ",
      cardGenshinCheck: "#原神チェックシート",
    },
    en: {
      homeTitle: "Uko's Room",
      secRanking: "Oshi Character Ranking",
      secFree: "Free Format",
      secCheck: "Check Sheet",
      friend: "< Follow me on X!",
      langJa: "Japanese",
      langEn: "English",

      cardGenshin: "Genshin",
      cardStarrailPath: "Star Rail (Path)",
      cardStarrailElem: "Star Rail (Element)",
      cardStarrail: "Star Rail",
      cardGenshinCheck: "Genshin",
    },
  };

  function applyLang(lang) {
    const d = dict[lang] || dict.ja;

    // 言語を保存（他サイトと統一）
    localStorage.setItem("lang", lang);

    // data-i18n を持つ要素を全部差し替え（キーがある時だけ更新）
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (Object.prototype.hasOwnProperty.call(d, key)) {
        el.textContent = d[key];
      }
    });

    // <html lang=""> も更新（任意だけど良い）
    document.documentElement.lang = lang;
  }

  // 初期言語
  const savedLang = localStorage.getItem("lang");
  const initialLang = (savedLang === "en" || savedLang === "ja") ? savedLang : "ja";

  // ラジオ反映
  const targetRadio = document.querySelector(`input[name="lang"][value="${initialLang}"]`);
  if (targetRadio) targetRadio.checked = true;

  // 初期適用
  applyLang(initialLang);

  // 変更時
  langRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => applyLang(e.target.value));
  });

});
