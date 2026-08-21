/* Service worker for web push notifications. */
self.addEventListener("push", (event) => {
  let payload = {
    title: "Sri Mahalakshmi Stores",
    body: "You have a new notification",
    link: "/notifications",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const target = payload.link || payload.url || "/notifications";

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: target },
      tag: payload.link || "store-notification",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/notifications";
  const url = target.startsWith("http") ? target : new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "NOTIFICATION_NAVIGATE", url: target });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
