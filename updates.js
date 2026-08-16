/* =========================
   更新履歴（対象リポジトリの最新コミットをGitHub APIから取得して表示）
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  // script.js のDOMContentLoadedリスナー（初期言語適用・ラジオのchangeリスナー登録）より
  // 後に実行させるため、同じくDOMContentLoaded内で処理する
  const GITHUB_USER = "uko05";
  const MAX_ITEMS = 20;
  const CACHE_KEY = "uko_updates_cache_v1";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10分

  // トップページにカードとして掲載中のリポジトリのみを対象にする
  const REPO_LABELS = {
    artifactCheck13: { ja: "これいる聖遺物", en: "Artifact Check" },
    TiersList01: { ja: "推しキャラランキング(原神)", en: "Oshi Ranking (Genshin)" },
    TiersList02: { ja: "推しキャラランキング(スタレ運命)", en: "Oshi Ranking (Star Rail Path)" },
    TiersList03: { ja: "推しキャラランキング(スタレ属性)", en: "Oshi Ranking (Star Rail Element)" },
    genshinFormat04: { ja: "フリーフォーマット(原神)", en: "Free Format (Genshin)" },
    starrailFormat05: { ja: "フリーフォーマット(スタレ)", en: "Free Format (Star Rail)" },
    genshinCheck06: { ja: "原神チェックシート", en: "Genshin Check Sheet" },
    starrailCheck07: { ja: "スタレチェックシート", en: "Star Rail Check Sheet" },
    "11_GenshinQuiz": { ja: "原神クイズ王", en: "Genshin Quiz" },
    "12_GenshinZoomUp": { ja: "原神ズームアップ", en: "Genshin ZoomUp" },
    "14_GenshinOmikuji": { ja: "原神おみくじ", en: "Genshin Omikuji" },
    "16_NTEChecker": { ja: "NTEチェッカー", en: "NTE Checker" },
  };

  const listEl = document.getElementById("update-list");
  if (!listEl) return;

  let cachedItems = null; // null = 未取得, [] = 取得済みだが0件
  let fetchFailed = false;

  function currentLang() {
    // ラジオの実際のcheckedを優先（changeイベント発火時点で確定しているため、
    // script.js側のlocalStorage更新タイミングに依存しない）
    const checked = document.querySelector('input[name="lang"]:checked');
    if (checked) return checked.value === "en" ? "en" : "ja";
    const saved = localStorage.getItem("lang");
    return saved === "en" ? "en" : "ja";
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  }

  function renderMessage(text) {
    listEl.innerHTML = "";
    const li = document.createElement("li");
    li.className = "update-item update-message-only";
    li.textContent = text;
    listEl.appendChild(li);
  }

  function render() {
    const lang = currentLang();

    if (fetchFailed) {
      renderMessage(lang === "en" ? "Failed to load recent updates" : "更新履歴を取得できませんでした");
      return;
    }
    if (cachedItems === null) {
      renderMessage(lang === "en" ? "Loading..." : "読み込み中...");
      return;
    }
    if (cachedItems.length === 0) {
      renderMessage(lang === "en" ? "No recent updates" : "最近の更新はありません");
      return;
    }

    listEl.innerHTML = "";
    cachedItems.forEach((item) => {
      const label = REPO_LABELS[item.repo] ? REPO_LABELS[item.repo][lang] : item.repo;

      const li = document.createElement("li");
      li.className = "update-item";

      const a = document.createElement("a");
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "update-link";

      const repoSpan = document.createElement("span");
      repoSpan.className = "update-repo";
      repoSpan.textContent = `[${label}]`;

      const msgSpan = document.createElement("span");
      msgSpan.className = "update-message";
      msgSpan.textContent = item.message;

      a.appendChild(repoSpan);
      a.appendChild(msgSpan);

      const dateSpan = document.createElement("span");
      dateSpan.className = "update-date";
      dateSpan.textContent = formatDate(item.date);

      li.appendChild(a);
      li.appendChild(dateSpan);
      listEl.appendChild(li);
    });
  }

  // 言語切替時に再描画
  document.querySelectorAll('input[name="lang"]').forEach((radio) => {
    radio.addEventListener("change", render);
  });

  render(); // 読み込み中表示

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.timestamp !== "number" || !Array.isArray(parsed.items)) return null;
      if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
      return parsed.items;
    } catch {
      return null;
    }
  }

  function writeCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items }));
    } catch {
      // localStorageが使えない環境は無視
    }
  }

  const cached = readCache();
  if (cached) {
    cachedItems = cached;
    render();
    return;
  }

  const repoNames = Object.keys(REPO_LABELS);

  Promise.all(
    repoNames.map((repo) =>
      fetch(`https://api.github.com/repos/${GITHUB_USER}/${repo}/commits?per_page=3`)
        .then((res) => (res.ok ? res.json() : []))
        .then((commits) =>
          (Array.isArray(commits) ? commits : []).map((c) => ({
            repo,
            message: c.commit.message.split("\n")[0],
            date: c.commit.author.date,
            url: c.html_url,
          }))
        )
        .catch(() => [])
    )
  )
    .then((results) => {
      const items = results.flat();
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      cachedItems = items.slice(0, MAX_ITEMS);

      if (items.length === 0) {
        // 全リポジトリ取得失敗（レート制限等）の可能性が高い場合はエラー扱いにしない
        // （0件表示のままにして、静かに失敗させる）
      } else {
        writeCache(cachedItems);
      }
      render();
    })
    .catch(() => {
      fetchFailed = true;
      render();
    });
});
