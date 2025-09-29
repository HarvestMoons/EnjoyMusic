<template>
  <!-- 组件无可见 DOM（canvas 的背景粒子已独立） -->
  <div style="display:none" aria-hidden="true"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  apiBase: { type: String, default: '/api' },
  // 如果你想让组件负责注册 SW（可选），否则在 main.js 注册
  swRegister: { type: Boolean, default: false },
});

let darkenInterval = null;
let overlay = null;
let longPressTimer = null;
let isTriggered = false;
let videoElement = null;
let clickCount = 0;

const CACHE_NAME = 'video-cache-v1';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 1 天

function now() { return Date.now(); }

// SW 注册（如需在组件中注册）
async function tryRegisterSW() {
  if (!props.swRegister) return;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered in component: ', reg);
    } catch (err) {
      console.warn('SW registration failed (component):', err);
    }
  }
}

// 判断缓存中是否存在视频（并检查 expiry header）
async function isVideoCached(videoId) {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const req = new Request(`/video/${videoId}`);
    const res = await cache.match(req);
    if (!res) return false;
    const expiryHeader = res.headers.get('x-cache-expiry');
    if (expiryHeader && now() > parseInt(expiryHeader, 10)) {
      await cache.delete(req);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('检查缓存失败:', e);
    return false;
  }
}

async function addVideoToCache(videoId, videoUrl) {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(videoUrl);
    if (response && response.status === 200) {
      const headers = new Headers(response.headers);
      headers.set('x-cache-expiry', String(now() + CACHE_EXPIRY_TIME));
      headers.set('x-video-id', String(videoId));
      const responseWithMeta = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
      const cacheReq = new Request(`/video/${videoId}`);
      await cache.put(cacheReq, responseWithMeta);
      console.log('视频已缓存，ID:', videoId);
    }
  } catch (e) {
    console.warn('缓存视频失败:', e);
  }
}

async function getCachedVideoUrl(videoId) {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheReq = new Request(`/video/${videoId}`);
    const res = await cache.match(cacheReq);
    if (!res) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('获取缓存视频失败:', e);
    return null;
  }
}

function stopVideoInternal() {
  if (!videoElement) return;
  try {
    if (videoElement.src && videoElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(videoElement.src);
    }
  } catch (e) { /* ignore */ }

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
  // 恢复页面主 audio（如果存在）
  const mainAudio = document.getElementById('audio-player');
  if (mainAudio) {
    try { mainAudio.play(); } catch (e) {}
  }
}

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

function onVideoCanPlayThrough() {
  console.log("视频已缓冲足够数据，可以流畅播放");
}

async function playCachedVideo(selectedVideo, fromCache = false) {
  videoElement = document.createElement("video");

  if (fromCache) {
    const cachedUrl = await getCachedVideoUrl(selectedVideo.id);
    if (cachedUrl) {
      videoElement.src = cachedUrl;
      console.log('✅ 从缓存播放视频:', selectedVideo.id);
    } else {
      videoElement.src = selectedVideo.url;
      console.log('⚠️ 缓存获取失败，从网络播放:', selectedVideo.id);
    }
  } else {
    videoElement.src = selectedVideo.url;
    console.log('🌐 从网络播放视频:', selectedVideo.id);
  }

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

  // 暂停页面主音频
  const mainAudio = document.getElementById('audio-player');
  if (mainAudio) mainAudio.pause();

  videoElement.autoplay = true;
  videoElement.loop = false;

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

  videoElement.addEventListener("ended", stopVideoInternal);
  videoElement.addEventListener("error", (e) => {
    console.error("视频播放错误:", e);
    stopVideoInternal();
  });

  document.body.appendChild(videoElement);
  document.body.style.pointerEvents = "none";

  function onVideoClick() {
    clickCount += 1;
    if (clickCount >= 3) {
      stopVideoInternal();
      document.removeEventListener("click", onVideoClick);
    }
  }

  document.addEventListener("click", onVideoClick);
}

function clearOverlay() {
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
  // 保持 isTriggered 不被重置（保持原逻辑）
}

onMounted(() => {
  // 组件中注册 SW（如果需要）
  void tryRegisterSW();

  // 长按逻辑：监听 mousedown
  const mousedownHandler = (e) => {
    // 只响应左键，且不在表单/控件内触发
    if (e.button !== 0 || document.getElementById('audio-player') && videoElement || e.target.closest("button, select, a, input, textarea, label")) {
      return;
    }

    clearTimeout(longPressTimer);
    clearInterval(darkenInterval);
    if (overlay) {
      overlay.remove();
      overlay = null;
    }

    const x = e.clientX;
    const y = e.clientY;

    isTriggered = false;

    longPressTimer = setTimeout(async () => {
      isTriggered = true;
      document.removeEventListener("mouseup", clearOverlay);
      document.removeEventListener("mouseleave", clearOverlay);

      overlay = document.createElement("div");
      overlay.className = "ripple-overlay";
      document.body.appendChild(overlay);

      const rippleCircle = document.createElement("div");
      rippleCircle.className = "ripple-circle";
      rippleCircle.style.left = x + 'px';
      rippleCircle.style.top = y + 'px';
      overlay.appendChild(rippleCircle);

      const darkBackground = document.createElement("div");
      darkBackground.className = "dark-background";
      overlay.appendChild(darkBackground);

      setTimeout(() => {
        overlay.classList.add('active');
      }, 10);

      // 2 秒后执行停止主音频并播放视频（与原脚本保持时间）
      darkenInterval = setTimeout(async () => {
        // 停止主音频
        const mainAudio = document.getElementById('audio-player');
        if (mainAudio) mainAudio.pause();

        // 请求后端拿随机视频
        try {
          const res = await fetch(`${props.apiBase}/videos/random`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (!res.ok) throw new Error('HTTP status ' + res.status);
          const videoList = await res.json();
          if (!(videoList && videoList.length > 0)) {
            console.log('没有找到视频');
            if (overlay) { overlay.remove(); overlay = null; }
            return;
          }

          const randomIndex = Math.floor(Math.random() * videoList.length);
          const selectedVideo = videoList[randomIndex];

          const cached = await isVideoCached(selectedVideo.id);
          if (cached) {
            await playCachedVideo(selectedVideo, true);
          } else {
            await playCachedVideo(selectedVideo, false);
            // 异步缓存
            void addVideoToCache(selectedVideo.id, selectedVideo.url);
          }
        } catch (err) {
          console.error('获取视频失败:', err);
          if (overlay) { overlay.remove(); overlay = null; }
        }

      }, 2000);
    }, 4000); // 长按 4000ms 触发
  };

  const mouseupHandler = () => clearOverlay();
  const mouseleaveHandler = () => clearOverlay();

  document.addEventListener("mousedown", mousedownHandler);
  document.addEventListener("mouseup", mouseupHandler);
  document.addEventListener("mouseleave", mouseleaveHandler);

  // 保留全局变量清理引用，方便卸载
  document.__rippleCleanup = () => {
    document.removeEventListener("mousedown", mousedownHandler);
    document.removeEventListener("mouseup", mouseupHandler);
    document.removeEventListener("mouseleave", mouseleaveHandler);
    if (overlay) { overlay.remove(); overlay = null; }
    stopVideoInternal();
  };
});

onBeforeUnmount(() => {
  if (document.__rippleCleanup) {
    try { document.__rippleCleanup(); } catch (e) {}
    delete document.__rippleCleanup;
  }
});
</script>

<style>
/* 直接保持你原来的 ripple 样式 */
.ripple-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}
.ripple-circle {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 70%);
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: all 2s ease-out;
}
.dark-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  opacity: 0;
  transition: opacity 2s ease-in-out;
}
.ripple-overlay.active .ripple-circle {
  opacity: 1;
  transform: translate(-50%, -50%) scale(30);
}
.ripple-overlay.active .dark-background {
  opacity: 1;
}
.ripple-overlay.video-playing .ripple-circle {
  opacity: 0;
  transition: opacity 0.5s ease-in;
}
.ripple-overlay.video-playing .dark-background {
  opacity: 0;
  transition: opacity 0.5s ease-in;
}
.ripple-overlay.fade-out .ripple-circle,
.ripple-overlay.fade-out .dark-background {
  opacity: 0 !important;
  transition: opacity 0.3s ease-in;
}
</style>
