const CACHE_NAME = 'app-cache-v1';
const VIDEO_CACHE = 'video-cache-v1';
const MAX_VIDEO_ENTRIES = 5; // 限制最多缓存 5 个视频
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 限制视频缓存总大小 500MB

// 打开缓存辅助函数
async function openCache(name) {
    return await caches.open(name);
}

// 获取缓存大小
async function getVideoCacheSize() {
    const cache = await caches.open(VIDEO_CACHE);
    const requests = await cache.keys();
    let total = 0;
    for (const req of requests) {
        const res = await cache.match(req);
        if (res) {
            const buf = await res.clone().arrayBuffer();
            total += buf.byteLength;
        }
    }
    return total;
}

// 清理多余的视频缓存
async function cleanupVideoCache() {
    const cache = await caches.open(VIDEO_CACHE);
    const requests = await cache.keys();

    if (requests.length > MAX_VIDEO_ENTRIES) {
        // 删除最旧的条目（FIFO 策略）
        await cache.delete(requests[0]);
    }

    const totalSize = await getVideoCacheSize();
    if (totalSize > MAX_VIDEO_SIZE) {
        // 逐步删除最旧的直到小于限制
        for (const req of requests) {
            if ((await getVideoCacheSize()) <= MAX_VIDEO_SIZE) break;
            await cache.delete(req);
        }
    }
}

// 安装阶段，缓存基础静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            cache.addAll([
                '/',
                './favicon.png',
            ])
        )
    );
    void self.skipWaiting();
});

// 激活阶段
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 拦截 fetch 请求
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) {
        // 针对视频资源的缓存策略
        event.respondWith(
            (async () => {
                const cache = await caches.open(VIDEO_CACHE);
                const cached = await cache.match(event.request);
                if (cached) return cached;

                try {
                    const response = await fetch(event.request, { mode: 'cors' });
                    if (!response || response.status !== 200) return response;

                    // 克隆一份放入缓存
                    const cloned = response.clone();
                    await cache.put(event.request, cloned);
                    await cleanupVideoCache();
                    return response;
                } catch (err) {
                    // 回退到缓存
                    if (cached) return cached;
                    return new Response('Video unavailable', { status: 503 });
                }
            })()
        );
    } else {
        // 普通请求，带 CORS 回退
        event.respondWith(
            (async () => {
                try {
                    return await fetch(event.request);
                } catch (err) {
                    const cache = await caches.open(CACHE_NAME);
                    const cached = await cache.match(event.request, { ignoreVary: true });
                    if (cached) return cached;
                    return new Response('Resource unavailable', { status: 503 });
                }
            })()
        );
    }
});
