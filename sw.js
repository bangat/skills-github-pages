// sw.js
/* ===== 1) FCM (변경 없음) ===== */
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAlzPWmeLacWdnW0we7CtfnU2szvxgdIzc",
  authDomain: "hallymlinen.firebaseapp.com",
  projectId: "hallymlinen",
  messagingSenderId: "867775830688",
  appId: "1:867775830688:web:cef3ed4e70ae9818f347c5"
});

const messaging = firebase.messaging();

/* ===== 2) 스코프-상대 BASE 경로 계산 (핵심) ===== */
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith('/')
  ? SCOPE_URL.pathname
  : SCOPE_URL.pathname + '/';    // ex) '/skills-github-pages/'

/* ===== 3) FCM 백그라운드 알림: 아이콘/열URL도 BASE 기준으로 ===== */
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  // 아이콘: 스코프 기준
  const iconUrl = `${BASE_PATH}icons/icon-192.png`;
  self.registration.showNotification(n.title || "알림", {
    body: n.body || "",
    icon: iconUrl,
    data: payload.data || {}
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rel = event.notification?.data?.url || '';
  const url = rel.startsWith('http') ? rel : (BASE_PATH + rel.replace(/^\//,''));
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url === url && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});


/* ===== 4) 캐시 버전 ===== */
const SW_VERSION   = 'v2025-08-31-04';      // 배포 때만 변경
const STATIC_CACHE = `static-${SW_VERSION}`;

/* ===== 5) 프리캐시: 전부 BASE 기준 경로로 ===== */
const PRECACHE = [
  `${BASE_PATH}`,                   // 앱 루트
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icons/apple-touch-icon.png`,
];

/* ===== 6) 설치/활성화 ===== */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE)).catch(()=>{})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== STATIC_CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

/* ===== 7) 네비게이션: 네트워크 우선, 폴백도 BASE 기준 ===== */
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    return fresh;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match(`${BASE_PATH}index.html`))
        || (await cache.match(`${BASE_PATH}`))
        || new Response('Offline', { status: 503 });
  }
}

/* ===== 8) 정적 에셋: S-W-R, 동일 출처만 캐시 ===== */
function isSameOrigin(req) {
  try { return new URL(req.url).origin === self.location.origin; }
  catch { return false; }
}

async function handleAsset(request) {
  if (!isSameOrigin(request)) return fetch(request); // 외부 리소스는 캐시X
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(res => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await fetchPromise) || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // 확장 스킴/범위 밖 요청은 패스
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }
  event.respondWith(handleAsset(req));
});

