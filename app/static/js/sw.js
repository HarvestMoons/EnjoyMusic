// sw.js
const CACHE_NAME = 'video-cache-v1';

self.addEventListener('install', () => {
    console.log('Service Worker installed');
    void self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // 只处理视频请求，但不进行缓存（由前端控制）
    if (url.includes('/videos/') && event.request.destination === 'video') {
        // 直接通过网络获取，不干预缓存逻辑
        event.respondWith(fetch(event.request));

    }

    // 对于其他请求，也直接通过网络获取
});