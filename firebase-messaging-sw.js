// firebase-messaging-sw.js

/* ▷▷▷ 라이브러리 로드 시작 ▷▷▷ */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
/* ▷▷▷ 라이브러리 로드 종료 ▷▷▷ */

/* ▷▷▷ Firebase 초기화 시작 ▷▷▷ */
firebase.initializeApp({
  apiKey: "AIzaSyAlzPWmeLacWdnW0we7CtfnU2szvxgdIzc",
  authDomain: "hallymlinen.firebaseapp.com",
  projectId: "hallymlinen",
  messagingSenderId: "867775830688",
  appId: "1:867775830688:web:cef3ed4e70ae9818f347c5"
});
const messaging = firebase.messaging();
/* ▷▷▷ Firebase 초기화 종료 ▷▷▷ */

/* ▷▷▷ 경로/스코프 유틸 시작 ▷▷▷ */
// GitHub Pages(프로젝트 페이지)에서는 scope가 '/skills-github-pages/' 식으로 잡힘
const BASE = new URL('.', self.registration.scope).pathname;
// 절대 URL로 보정 (알림 클릭 매칭 정확도 ↑)
const toAbs = (path) => {
  try { return new URL(path, self.location.origin).href; }
  catch { return path; }
};
/* ▷▷▷ 경로/스코프 유틸 종료 ▷▷▷ */

/* ▷▷▷ FCM 푸시 수신 핸들러 시작 ▷▷▷ */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  // 일부 브라우저에서 event.data.json() 예외 발생 대비
  let payload = {};
  try { payload = event.data.json() || {}; } catch { payload = {}; }

  const n = payload.notification || {};
  const data = payload.data || {};

  const title = n.title || data.title || '새 알림';
  const body  = n.body  || data.body  || '';
  const icon  = n.icon  || data.icon  || (BASE + 'icons/apple-touch-icon.png');
  const badge = n.badge || data.badge || (BASE + 'icons/apple-touch-icon.png');

  // fcmOptions.link > notification.click_action > data.link > 기본값(방명록)
  const rawUrl =
    (payload.fcmOptions && payload.fcmOptions.link) ||
    n.click_action ||
    data.link ||
    (BASE + '방명록.html');

  const url = toAbs(rawUrl);

  const options = {
    body,
    icon,
    badge,
    data: { url },
    vibrate: [80, 40, 80],
    tag: data.tag || 'linen-guest',
    renotify: !!data.renotify
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
/* ▷▷▷ FCM 푸시 수신 핸들러 종료 ▷▷▷ */

/* ▷▷▷ 알림 클릭 핸들러 시작 ▷▷▷ */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url;
  if (!url) return;

  event.waitUntil(
    (async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      // 1) 동일 경로 열려있으면 포커스
      for (const client of list) {
        try {
          // origin 동일 + path 포함일 때 매칭 폭을 좀 더 느슨하게
          const u1 = new URL(client.url);
          const u2 = new URL(url);
          if (u1.origin === u2.origin && u1.pathname === u2.pathname) {
            if ('focus' in client) return client.focus();
          }
        } catch (_) {}
      }

      // 2) 없으면 새 창 열기
      if (clients.openWindow) return clients.openWindow(url);
    })()
  );
});
/* ▷▷▷ 알림 클릭 핸들러 종료 ▷▷▷ */

/* ▷▷▷ SW 생명주기 보조(선택) 시작 ▷▷▷ */
// 배포 직후 새 SW가 즉시 활성화되도록 (원하면 주석 해제)
/*
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
*/
// ▷▷▷ SW 생명주기 보조 종료 ◁◁◁
