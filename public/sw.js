const CACHE_NAME = "matt-driver-v2-8";
const OFFLINE_URL = "/kierowca";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/pwa/icon-192.png",
        "/pwa/icon-512.png"
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "MATT DRIVER",
      body: event.data ? event.data.text() : "Masz nowe powiadomienie."
    };
  }

  const title = data.title || "MATT DRIVER";
  const options = {
    body: data.body || "Masz nowe powiadomienie.",
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag: data.tag || "matt-driver",
    renotify: Boolean(data.renotify),
    vibrate: [180, 80, 180],
    data: {
      url: data.url || "/kierowca"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification?.data?.url || "/kierowca";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
