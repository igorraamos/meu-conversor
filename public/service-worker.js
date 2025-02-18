const CACHE_NAME = 'dolar-agora-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/public/css/style.css',
    '/public/js/script.js',
    '/public/js/config.js',
    '/public/js/modules/chart.js',
    '/public/js/modules/converter.js',
    '/public/js/modules/datetime.js',
    '/public/js/modules/table.js',
    '/public/js/modules/utils.js',
    '/public/img/dolar-logo.webp'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});