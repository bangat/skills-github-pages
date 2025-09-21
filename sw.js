// sw.js (최종 수정본)

// ===== 1) FCM 라이브러리 로드 방식 및 버전 변경 (v10 모듈 방식) =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';

// ===== 2) Firebase 초기화 방식 변경 (v10 모듈 방식) =====
const firebaseConfig = {
  apiKey: "AIzaSyAlzPWmeLacWdnW0we7CtfnU2szvxgdIzc",
  authDomain: "hallymlinen.firebaseapp.com",
  projectId: "hallymlinen",
  messagingSenderId: "867775830688",
  appId: "1:867775830688:web:cef3ed4e70ae9818f347c5"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ===== 3) 스코프-상대 BASE 경로 계산 (기존과 동일) =====
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith('/')
  ? SCOPE_URL.pathname
  : SCOPE_URL.pathname + '/';

// ===== 4) FCM 백그라운드 알림 핸들러 변경 (v10 모듈 방식) =====
onBackgroundMessage(messaging, (payload) => {
  // FCM이 webpush.notification으로 자동 표시하므로 여기서는 콘솔 로그만 남깁니다.
  try { console.log("[SW] Background message received:", payload); } catch {}
});

// ===== 5) 알림 클릭 핸들러 (기존과 거의 동일) =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // payload.data.url 또는 payload.fcmOptions.link 에서 URL을 가져옵니다.
  const relativeUrl = event.notification?.data?.url || '';
  const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : (BASE_PATH + relativeUrl.replace(/^\//,''));

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // 이미 열려있는 창이 있으면 포커스
    for (const client of allClients) {
      const clientUrl = new URL(client.url);
      const targetUrl = new URL(fullUrl);
      if (clientUrl.href === targetUrl.href && 'focus' in client) {
        return client.focus();
      }
    }
    // 없으면 새 창으로 열기
    if (clients.openWindow) return clients.openWindow(fullUrl);
  })());
});

/* ================================================================== */
/* ===== 아래의 PWA 오프라인 캐싱 관련 코드는 수정할 필요 없습니다. ===== */
/* ================================================================== */

const SW_VERSION   = 'v2025-09-09-02';
const STATIC_CACHE = `static-${SW_VERSION}`;

const PRECACHE = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}방명록.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icons/apple-touch-icon.png`,
];

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

function isSameOrigin(req) {
  try { return new URL(req.url).origin === self.location.origin; }
  catch { return false; }
}

async function handleAsset(request) {
  if (!isSameOrigin(request)) return fetch(request);
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
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }
  event.respondWith(handleAsset(req));
});
