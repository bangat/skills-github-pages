// sw.js (기존 캐시 로직 위쪽에 추가)
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

// 백그라운드(탭 닫힘/백그라운드) 수신
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || "알림", {
    body: n.body || "",
    icon: n.icon || "/icons/apple-touch-icon.png",
    data: payload.data || {}
  });
});

// 알림 클릭 시 열 URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});


// sw.js
const SW_VERSION   = 'v2025-08-31-03';     // ✅ 배포마다 이 문자열만 바꿔줘
const STATIC_CACHE = `static-${SW_VERSION}`;

// 필요하면 여기에 선캐시할 파일 추가
const PRECACHE = [
  '/',                // 루트
  '/index.html',
  '/manifest.json',
  '/icons/apple-touch-icon.png',
];

// --- 설치: 즉시 대기 없이 새 SW 준비
self.addEventListener('install', (event) => {
  self.skipWaiting(); // ✅ old SW 있어도 바로 이 SW로 전환 준비
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE)).catch(()=>{})
  );
});

// --- 활성화: 모든 클라이언트 장악 + 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== STATIC_CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim(); // ✅ 페이지 새로고침 없이도 새 SW 적용
  })());
});

// --- HTML 네비게이션은 "네트워크 우선" (최신 코드 즉시 로드)
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    return fresh;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    // 루트 또는 캐시된 index.html로 폴백
    return (await cache.match('/index.html')) || (await cache.match('/')) ||
           new Response('Offline', { status: 503 });
  }
}

// --- 정적 파일은 Stale-While-Revalidate (체감 빠르게 + 백그라운드 갱신)
async function handleAsset(request) {
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

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }
  event.respondWith(handleAsset(req));
});




