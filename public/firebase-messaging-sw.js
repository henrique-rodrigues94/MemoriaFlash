// ============================================================================
// Service Worker do Firebase Cloud Messaging — recebe notificações push
// quando o app está em segundo plano ou fechado.
//
// ATENÇÃO: os valores abaixo devem ser IDÊNTICOS aos de
// `firebase-applet-config.json` na raiz do projeto. Service Workers carregam
// via <script> clássico (importScripts), não suportam `import` de módulos ES
// de forma universal em todos os navegadores — por isso os valores públicos
// (não-secretos) do Firebase são duplicados aqui. Se você trocar de projeto
// Firebase, atualize os dois lugares.
// ============================================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'flashcardsia-a2f43',
  appId: '1:773874565537:web:1cd3a96a3fc6939c4fcbe0',
  apiKey: 'AIzaSyAaRwF97HfsJFy37Y8T5Wethsv5eye7df0',
  authDomain: 'flashcardsia-a2f43.firebaseapp.com',
  storageBucket: 'flashcardsia-a2f43.firebasestorage.app',
  messagingSenderId: '773874565537',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'MemoriaFlash';
  const options = {
    body: notification.body || 'Você tem cartões esperando por revisão.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    tag: (payload.data && payload.data.tag) || 'flashmind-reminder',
  };
  self.registration.showNotification(title, options);
});

// Ao clicar na notificação, foca uma aba já aberta do app (ou abre uma nova).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
