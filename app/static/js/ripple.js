let darkenInterval = null;
let overlay = null;
let longPressTimer = null;
let isTriggered = false;
let videoElement = null;
let clickCount = 0;

let videoCache = new Map(); // 内存缓存

// 添加：缓存配置
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 一天

// 添加：Service Worker注册
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/sw.js')
        .then(registration => {
            console.log('SW registered: ', registration);
        })
        .catch(error => {
            console.log('SW registration failed: ', error);
        });
}

// 添加：检查视频是否在缓存中的函数
async function isVideoCached(videoId) {
    if (!('caches' in window)) return false;

    try {
        const cache = await caches.open('video-cache-v1');
        // 尝试通过自定义请求查找缓存（包含videoId信息）
        const customRequest = new Request(`/video/${videoId}`);
        const response = await cache.match(customRequest);

        if (!response) return false;

        // 检查是否过期
        const expiryHeader = response.headers.get('x-cache-expiry');
        if (expiryHeader) {
            const expiryTime = parseInt(expiryHeader);
            if (Date.now() > expiryTime) {
                await cache.delete(customRequest);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.log('检查缓存失败:', error);
        return false;
    }
}

// 添加：将视频添加到缓存
async function addVideoToCache(videoId, videoUrl) {
    if (!('caches' in window)) return;

    try {
        const cache = await caches.open('video-cache-v1');
        const response = await fetch(videoUrl);
        if (response.status === 200) {
            // 添加过期时间和视频ID信息
            const headers = new Headers(response.headers);
            headers.set('x-cache-expiry', Date.now() + CACHE_EXPIRY_TIME);
            headers.set('x-video-id', videoId);

            const responseWithMetadata = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers
            });

            // 使用包含videoId的自定义URL进行缓存
            const cacheRequest = new Request(`/video/${videoId}`);
            await cache.put(cacheRequest, responseWithMetadata);
            console.log('视频已缓存，ID:', videoId);
        }
    } catch (error) {
        console.log('缓存视频失败:', error);
    }
}

// 添加：从缓存获取视频URL
async function getCachedVideoUrl(videoId) {
    if (!('caches' in window)) return null;

    try {
        const cache = await caches.open('video-cache-v1');
        const cacheRequest = new Request(`/video/${videoId}`);
        const response = await cache.match(cacheRequest);

        if (response) {
            // 创建Blob URL
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (error) {
        console.log('获取缓存视频失败:', error);
        return null;
    }
}


document.addEventListener("mousedown", function (e) {
    if (e.button !== 0 || videoElement || e.target.closest("button, select, a, input, textarea, label")) {
        return;
    }

    // 清理旧的状态
    clearTimeout(longPressTimer);
    clearInterval(darkenInterval);
    if (overlay) {
        overlay.remove();
        overlay = null;
    }

    const x = e.clientX;
    const y = e.clientY;

    isTriggered = false;

    longPressTimer = setTimeout(() => {
        isTriggered = true;
        document.removeEventListener("mouseup", clearOverlay);
        document.removeEventListener("mouseleave", clearOverlay);

        overlay = document.createElement("div");
        overlay.className = "ripple-overlay";
        document.body.appendChild(overlay);

        // 创建波纹圆圈
        const rippleCircle = document.createElement("div");
        rippleCircle.className = "ripple-circle";
        rippleCircle.style.left = x + 'px';
        rippleCircle.style.top = y + 'px';
        overlay.appendChild(rippleCircle);

        // 创建暗色背景
        const darkBackground = document.createElement("div");
        darkBackground.className = "dark-background";
        overlay.appendChild(darkBackground);

        // 强制重绘后激活动画
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);

        // 设置定时器，在动画完成后播放视频
        darkenInterval = setTimeout(() => {
            stopVideo();
            void playFullScreenVideo();
        }, 2000);

    }, 4000);
});

// 修改playFullScreenVideo函数
async function playFullScreenVideo() {
    clickCount = 0;

    try {
        // 调后端接口拿一个随机视频
        const res = await fetch(`${API_BASE}/videos/random`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const videoList = await res.json();

        if (!(videoList && videoList.length > 0)) {
            console.log("没有找到视频");
            return;
        }

        // 随机选择一个视频
        const randomIndex = Math.floor(Math.random() * videoList.length);
        const selectedVideo = videoList[randomIndex];

        // 修改：检查缓存并决定播放方式
        const isCached = await isVideoCached(selectedVideo.id);
        console.log(`视频 ${selectedVideo.id} 缓存状态:`, isCached ? '已缓存' : '未缓存');

        if (isCached) {
            // 从缓存播放
            await playCachedVideo(selectedVideo, true);
        } else {
            // 从网络播放并缓存
            await playCachedVideo(selectedVideo, false);
            // 异步缓存
            void addVideoToCache(selectedVideo.id, selectedVideo.url);
        }

    } catch (error) {
        console.error("获取视频失败:", error);
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }
}

// 修改：添加缓存来源参数
async function playCachedVideo(selectedVideo, fromCache = false) {
    videoElement = document.createElement("video");

    if (fromCache) {
        // 从缓存获取视频URL
        const cachedUrl = await getCachedVideoUrl(selectedVideo.id);
        if (cachedUrl) {
            videoElement.src = cachedUrl;
            console.log('✅ 从缓存播放视频:', selectedVideo.id);
        } else {
            // 缓存获取失败，回退到网络
            videoElement.src = selectedVideo.url;
            console.log('⚠️ 缓存获取失败，从网络播放:', selectedVideo.id);
        }
    } else {
        videoElement.src = selectedVideo.url;
        console.log('🌐 从网络播放视频:', selectedVideo.id);
    }

    // 原有代码保持不变...
    videoElement.addEventListener('progress', onVideoProgress);
    videoElement.addEventListener('canplaythrough', onVideoCanPlayThrough);

    videoElement.preload = 'auto';

    Object.assign(videoElement.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        objectFit: "cover",
        pointerEvents: "none",
        zIndex: "10000"
    });

    audioPlayer.pause();
    videoElement.autoplay = true;
    videoElement.loop = false;

    videoElement.addEventListener('canplay', () => {
        console.log("视频可以开始播放");
    });

    videoElement.addEventListener("playing", () => {
        console.log("视频开始播放");
        if (overlay) {
            overlay.classList.add('video-playing');
            setTimeout(() => {
                if (overlay) {
                    overlay.remove();
                    overlay = null;
                }
            }, 500);
        }
    });

    videoElement.addEventListener("ended", stopVideo);

    videoElement.addEventListener("error", (e) => {
        console.error("视频播放错误:", e);
        stopVideo();
    });

    document.body.appendChild(videoElement);
    document.body.style.pointerEvents = "none";

    function onVideoClick() {
        clickCount += 1;
        if (clickCount >= 2) {
            stopVideo();
            document.removeEventListener("click", onVideoClick);
        }
    }

    document.addEventListener("click", onVideoClick);
}

// 修改stopVideo函数，清理Blob URL
function stopVideo() {
    if (!videoElement) return;

    // 清理Blob URL防止内存泄漏
    if (videoElement.src && videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoElement.src);
    }

    // 原有代码保持不变...
    videoElement.removeEventListener('progress', onVideoProgress);
    videoElement.removeEventListener('canplaythrough', onVideoCanPlayThrough);

    videoElement.pause();
    videoElement.remove();
    videoElement = null;

    document.body.style.pointerEvents = "";

    clearInterval(darkenInterval);
    clearTimeout(longPressTimer);
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    isTriggered = false;
    audioPlayer.play();

    document.addEventListener("mouseup", clearOverlay);
    document.addEventListener("mouseleave", clearOverlay);
}

// 添加：视频缓冲进度监控
function onVideoProgress(e) {
    const video = e.target;
    if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
            const bufferedPercent = (bufferedEnd / duration) * 100;
            console.log(`视频已缓冲: ${bufferedPercent.toFixed(1)}%`);
        }
    }
}

// 添加：视频可以流畅播放的回调
function onVideoCanPlayThrough() {
    console.log("视频已缓冲足够数据，可以流畅播放");
}

function clearOverlay() {
    // 只在未触发长按时清理
    if (!isTriggered) {
        clearTimeout(longPressTimer);
        clearInterval(darkenInterval);
        if (overlay) {
            overlay.style.opacity = 0;
            overlay.style.filter = "brightness(1) blur(0px)";
            setTimeout(() => {
                if (overlay) {
                    overlay.remove();
                    overlay = null;
                }
            }, 500);
        }
    }
    // 无论如何，都不要重置 isTriggered 到 false 以让已触发的过程正常执行
}

document.addEventListener("mouseup", clearOverlay);
document.addEventListener("mouseleave", clearOverlay);