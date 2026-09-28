/**
 * うーこの部屋 共通: 新しいバージョンが出たら自動で読み込み直す
 *
 * タブを開きっぱなしのユーザーは古いプログラムのまま動き続けるため、
 * 読み取り削減などの大きめの修正が反映されない問題への対策(2026-09-29追加)。
 *
 * ■ 使い方（サイトごとに2つ用意するだけ）
 *   1. index.html の <head> に
 *        <meta name="uko-reload-version" content="1">
 *   2. index.html と同じフォルダに version.json を置く
 *        { "reloadVersion": 1 }
 *   ある程度大きい修正を公開するときだけ、両方の数字を同じだけ上げる
 *   (普段の細かい修正では上げない。上げると開いている全員のタブが読み込み直される)。
 *
 *   読み込みは sidebar.js が meta を見つけた時だけ自動で行う。sidebar.js を
 *   使っていないサイトは </body> 直前に下記を足す:
 *     <script src="https://uko05.github.io/TopPage00/shared/auto-reload.js"></script>
 *
 * ■ 動き
 *   - タブが裏から表に戻った時に version.json を確認する(5分に1回まで)。
 *     使っている最中に突然再読み込みされないよう、確認は「戻った瞬間」だけ。
 *   - version.json の数字が meta より大きければ再読み込みする。
 *   - ページ側で window.ukoCanAutoReload = () => false を返している間
 *     (入力途中など)は再読み込みせず、「新しいバージョンがあります」の帯を出す。
 *   - version.json は GitHub Pages の普通のファイルなので Firestore の読み取りは増えない。
 */
(function () {
  'use strict';
  if (window.__ukoAutoReloadStarted) return;
  window.__ukoAutoReloadStarted = true;

  var meta = document.querySelector('meta[name="uko-reload-version"]');
  if (!meta) return;
  var current = parseInt(meta.getAttribute('content'), 10) || 0;
  var url = new URL(meta.getAttribute('data-url') || 'version.json', location.href).href;
  var CHECK_INTERVAL_MS = 5 * 60 * 1000;
  var lastCheckAt = Date.now(); // 開いた直後は最新なので、最初の確認は5分後以降
  var bannerShown = false;

  function isEn() {
    return (document.documentElement.lang || '').indexOf('en') === 0;
  }

  function showBanner() {
    if (bannerShown) return;
    bannerShown = true;
    var bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;' +
      'display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#fff;color:#333;' +
      'border:2px solid #ffcc00;box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:13px;font-family:inherit;max-width:92vw;';
    var text = document.createElement('span');
    text.textContent = isEn() ? 'A new version is available.' : '新しいバージョンがあります。';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = isEn() ? 'Reload' : '更新する';
    btn.style.cssText = 'font-family:inherit;font-size:13px;font-weight:bold;padding:6px 12px;border-radius:8px;' +
      'border:1.5px solid #e0ac00;background:#fff8e1;color:#a67c00;cursor:pointer;white-space:nowrap;';
    btn.addEventListener('click', function () { location.reload(); });
    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'close');
    close.style.cssText = 'border:0;background:none;font-size:16px;color:#999;cursor:pointer;padding:0 4px;';
    close.addEventListener('click', function () { bar.remove(); });
    bar.appendChild(text);
    bar.appendChild(btn);
    bar.appendChild(close);
    document.body.appendChild(bar);
  }

  function check() {
    if (Date.now() - lastCheckAt < CHECK_INTERVAL_MS) return;
    lastCheckAt = Date.now();
    fetch(url, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var latest = data && parseInt(data.reloadVersion, 10);
        if (!latest || latest <= current) return;
        var canReload = typeof window.ukoCanAutoReload !== 'function' || window.ukoCanAutoReload() !== false;
        if (canReload) location.reload();
        else showBanner();
      })
      .catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') check();
  });
})();
