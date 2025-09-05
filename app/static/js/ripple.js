let darkenInterval = null;
let overlay = null;
let longPressTimer = null;
let isTriggered = false;
let videoElement = null;
// 新增：记录视频播放后点击次数
let clickCount = 0;

document.addEventListener("mousedown", function (e) {
    if (e.button !== 0||videoElement || e.target.closest("button, select, a, input, textarea, label")) {
        return;
    }

    // 每次 mousedown 前，彻底清理旧定时器和动画
    clearTimeout(longPressTimer);
    clearInterval(darkenInterval);
    if (overlay) {
        overlay.remove();
        overlay = null;
    }

    const x = (e.clientX / window.innerWidth) * 100 + '%';
    const y = (e.clientY / window.innerHeight) * 100 + '%';

    isTriggered = false;
    longPressTimer = setTimeout(() => {
        isTriggered = true;
        document.removeEventListener("mouseup", clearOverlay);
        document.removeEventListener("mouseleave", clearOverlay);

        overlay = document.createElement("div");
        overlay.className = "ripple-overlay";
        overlay.style.setProperty('--x', x);
        overlay.style.setProperty('--y', y);
        document.body.appendChild(overlay);

        let opacity = 0.05;
        let brightness = 1;
        const maxOpacity = 1;
        const minBrightness = 0;

        overlay.style.opacity = opacity;
        overlay.style.backgroundColor = "#000";
        overlay.style.filter = `brightness(${brightness}) blur(8px)`;

        darkenInterval = setInterval(() => {
            if (opacity < maxOpacity) opacity += 0.02;
            if (brightness > minBrightness) brightness -= 0.02;

            overlay.style.opacity = Math.min(1, opacity);
            overlay.style.filter = `brightness(${brightness}) blur(8px)`;

            if (opacity >= maxOpacity && brightness <= minBrightness) {
                clearInterval(darkenInterval);
                stopAudio();
                playFullScreenVideo();
            }
        }, 50);
    }, 4000);
});

function playFullScreenVideo() {
    // 重置点击计数
    clickCount = 0;

    videoElement = document.createElement("video");
    videoElement.src = "static/secret/惊天♂魔盗团.mp4";
    Object.assign(videoElement.style, {
        position:      "fixed",
        top:           "0",
        left:          "0",
        width:         "100vw",
        height:        "100vh",
        objectFit:     "cover",
        pointerEvents: "none"
    });
    videoElement.autoplay = true;
    videoElement.loop     = false;

    videoElement.addEventListener("playing", () => {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    });

    videoElement.addEventListener("ended", stopVideo);

    document.body.appendChild(videoElement);
    document.body.style.pointerEvents = "none";

    // 累计点击：第二次点击才停止
    function onVideoClick() {
        clickCount += 1;
        if (clickCount >= 2) {
            stopVideo();
            document.removeEventListener("click", onVideoClick);
        }
    }
    document.addEventListener("click", onVideoClick);
}

function stopVideo() {
    if (!videoElement) return;

    videoElement.pause();
    videoElement.remove();
    videoElement = null;

    // 恢复页面交互
    document.body.style.pointerEvents = "";

    // 清理所有残余
    clearInterval(darkenInterval);
    clearTimeout(longPressTimer);
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    isTriggered = false;

    // 2. 停止后，重新绑定短按清理
    document.addEventListener("mouseup", clearOverlay);
    document.addEventListener("mouseleave", clearOverlay);
}

function clearOverlay(e) {
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
