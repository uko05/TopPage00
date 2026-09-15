/**
 * トップページ 管理者専用通知パネル
 *
 * 機種変申請(24_AccountCenter)・画像保管庫の承認待ち(17_storage)・
 * フレンド募集の通報(25_FriendBoard)を1箇所にまとめて表示する。
 * 管理者以外には何も表示しない(admin-notify-sectionはhiddenのまま)。
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, query, where, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCP4QfMGDDBSI8VDERnESBOlHpUhy7wGPk",
  authDomain: "genshin-bakatare01.firebaseapp.com",
  projectId: "genshin-bakatare01",
  storageBucket: "genshin-bakatare01.firebasestorage.app",
  messagingSenderId: "658089418604",
  appId: "1:658089418604:web:288c06b331da8c4f789d49",
};

// account-status.js等、同一ページ内の他スクリプトが既定Appを初期化済みならそれを再利用する
// (initializeApp()の二重呼び出しは例外になるため)。
const hasDefaultApp = getApps().some((a) => a.name === '[DEFAULT]');
const app = hasDefaultApp ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// AccountCenterのadmin.js/firestore.rulesのisAdmin()と同じ判定
// (固定UID、またはaccountLinks経由でsharedUserRolesに管理者ロールが付与されたアカウント)。
const ADMIN_UID = 'UPInlRxp2eM8OI3p18UU1d3OzNc2';
async function isEffectiveAdmin(user) {
  if (!user) return false;
  if (user.uid === ADMIN_UID) return true;
  try {
    const linkSnap = await getDoc(doc(db, 'accountLinks', user.uid));
    if (!linkSnap.exists()) return false;
    const roleSnap = await getDoc(doc(db, 'sharedUserRoles', linkSnap.data().omikujiUserId));
    return roleSnap.exists() && roleSnap.data().role === 'admin';
  } catch (e) {
    console.error('[admin-notify] admin check failed', e);
    return false;
  }
}

// 件数を数える対象一覧。増やす時はここに追加するだけでよい。
const NOTIFY_ITEMS = [
  {
    id: 'merge',
    label: '機種変申請',
    url: 'https://uko05.github.io/24_AccountCenter/admin/',
    collection: 'mergeRequests',
    filter: ['status', '==', 'pending'],
  },
  {
    id: 'storage17',
    label: '画像保管庫の承認待ち',
    url: 'https://uko05.github.io/17_storage/',
    collection: 'screenshotStorageImages',
    filter: ['moderationStatus', '==', 'flagged'],
  },
  {
    id: 'friendReport',
    label: 'フレンド募集の通報',
    url: 'https://uko05.github.io/25_FriendBoard/',
    collection: 'friendBoardReports',
    filter: ['handled', '==', false],
  },
];

let unsubscribers = [];
function stopListening() {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
}

function startListening() {
  const section = document.getElementById('admin-notify-section');
  const list = document.getElementById('admin-notify-list');
  if (!section || !list) return;

  list.innerHTML = '';
  NOTIFY_ITEMS.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'admin-notify-item';
    li.innerHTML = `
      <a href="${item.url}" target="_blank" rel="noopener">${item.label}</a>
      <span class="admin-notify-badge" id="admin-notify-badge-${item.id}" style="display:none;">0</span>
    `;
    list.appendChild(li);

    const q = query(collection(db, item.collection), where(...item.filter));
    const unsub = onSnapshot(q, (snap) => {
      const badge = document.getElementById(`admin-notify-badge-${item.id}`);
      if (!badge) return;
      const count = snap.size;
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }, (err) => console.error(`[admin-notify] ${item.collection} listen failed`, err));
    unsubscribers.push(unsub);
  });

  section.classList.remove('hidden');
}

onAuthStateChanged(auth, async (user) => {
  const admin = await isEffectiveAdmin(user);
  const section = document.getElementById('admin-notify-section');
  if (admin) {
    startListening();
  } else {
    stopListening();
    if (section) section.classList.add('hidden');
  }
});
