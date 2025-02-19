const CACHE_NAME = 'dolar-agora-v1';
const OFFLINE_URL = '/offline.html';

// Recursos que queremos cachear para uso offline
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/modules/index.js',
    '/js/modules/api.js',
    '/js/modules/chart.js',
    '/js/modules/table.js',
    '/js/modules/theme.js',
    '/js/modules/utils.js',
    '/img/dolar-logo.webp',
    '/img/favicon.ico',
    '/img/apple-touch-icon.png',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js',
    OFFLINE_URL
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache aberto');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Estratégia de cache: Network First, fallback to cache
self.addEventListener('fetch', (event) => {
    // Não interceptar requisições para a API
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Se a resposta for válida, clone-a e armazene no cache
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                // Se falhar, tente buscar do cache
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        
                        // Se não encontrar no cache e for uma requisição de página,
                        // mostrar página offline
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        
                        // Para outros recursos, retornar uma resposta vazia
                        return new Response(null, {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
            })
    );
});

// Lidar com mensagens do cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});