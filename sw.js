/* Offline support. App shell is cached; content files are network-first so
   updates to questions or code appear immediately when online. */
var CACHE = "civics-v1";
var SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./questions.js",
  "./state-data.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function put(request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") return response;
  var copy = response.clone();
  caches.open(CACHE).then(function (cache) { cache.put(request, copy); }).catch(function () {});
  return response;
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) { return put(request, response); })
        .catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  var freshFirst = /\.(?:js|css)$/.test(url.pathname) || /\.webmanifest$/.test(url.pathname);
  if (freshFirst) {
    event.respondWith(
      fetch(request)
        .then(function (response) { return put(request, response); })
        .catch(function () { return caches.match(request); })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      return cached || fetch(request).then(function (response) { return put(request, response); });
    })
  );
});
