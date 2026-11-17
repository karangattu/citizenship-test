/* Offline support. App shell is cached; content files are network-first so
   updates to questions or code appear immediately when online. */
var CACHE = "civics-v2";
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

async function serveQuestionAudio(request) {
  var range = request.headers.get("range");
  var bytes = range && range.match(/^bytes=(\d+)-(\d*)$/);
  if (range && !bytes) return fetch(request);

  var cache = await caches.open(CACHE);
  var response = await cache.match(request.url);
  if (!response) {
    // Store the full MP3 so later media requests can play it offline.
    response = await fetch(request.url);
    if (response.status !== 200) return response;
    await cache.put(request.url, response.clone()).catch(function () {});
  }
  if (!bytes) return response;

  var clip = await response.blob();
  var start = Number(bytes[1]);
  var end = bytes[2] ? Math.min(Number(bytes[2]), clip.size - 1) : clip.size - 1;
  if (start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + clip.size } });
  }
  return new Response(clip.slice(start, end + 1, clip.type), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Range": "bytes " + start + "-" + end + "/" + clip.size,
      "Content-Length": String(end - start + 1)
    }
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (/\/audio\/\d+\.mp3$/.test(url.pathname)) {
    event.respondWith(serveQuestionAudio(request));
    return;
  }

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
