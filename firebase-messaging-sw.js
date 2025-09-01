// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAlzPWmeLacWdnW0we7CtfnU2szvxgdIzc",
  authDomain: "hallymlinen.firebaseapp.com",
  projectId: "hallymlinen",
  messagingSenderId: "867775830688",
  appId: "1:867775830688:web:cef3ed4e70ae9818f347c5"
});

const messaging = firebase.messaging();

// 현재 프로젝트의 베이스 경로: 예) '/skills-github-pages/'
const BASE = new URL('.', self.registration.scope).pathname;

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json() || {};
  const n = payload.notification || {};
  const data = payload.data || {};

  const title = n.title || data.title || '새 알림';
  const body  = n.body  || data.body  || '';
  const icon  = n.icon  || data.icon  || (BASE + 'icons/apple-touch-icon.png');
  const badge = n.badge || data.badge || (BASE + 'icons/apple-touch-icon.png');
  const url   =
    (payload.fcmOptions && payload.fcmOptions.link) ||
    data.link ||
    (BASE + '방명록.html');

  event.waitUntil(self.registration.showNotification(title, {
    body, icon, badge,
    data: { url },
    vibrate: [80, 40, 80],
    tag: data.tag || 'linen-guest',
    renotify: !!data.renotify
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
