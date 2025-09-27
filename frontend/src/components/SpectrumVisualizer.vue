<template>
  <div class="spectrum-container">
    <!-- 保留原 id，样式与原来一致 -->
    <canvas id="spectrumCanvas"></canvas>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

let rafId = null;
let audioCtx = null;
let source = null;
let analyser = null;

onMounted(() => {
  // 把原脚本的 IIFE 内容搬进来（尽量一模一样的逻辑）
  const audio = document.getElementById("audio-player");
  const canvas = document.getElementById("spectrumCanvas");
  const btn = document.getElementById("toggleSpectrumBtn");
  let showSpectrum = false;

  if (!audio || !canvas) {
    console.error("找不到 #audio-player 或 #spectrumCanvas，无法启动可视化");
    return;
  }

  const ctx = canvas.getContext("2d");
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  try {
    // createMediaElementSource 在同一页面只能被创建一次连接到同一个媒体元素。
    // 如果已经有 source 则先断开（防御性处理）
    source = audioCtx.createMediaElementSource(audio);
  } catch (e) {
    // 如果 createMediaElementSource 抛错，仍尝试继续（保持原始行为）
    console.warn("createMediaElementSource 可能已被创建:", e);
    try {
      // 若再次 create 失败，设置 source 为 null（后续绘制依赖 analyser）
      source = null;
    } catch (_) {
      source = null;
    }
  }

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  if (source) {
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  } else {
    // 若 source 无法建立，仍把 analyser 连接到输出（尽力而为）
    try {
      analyser.connect(audioCtx.destination);
    } catch (e) {
      // ignore
    }
  }

  // 初始隐藏 canvas（与原脚本保持一致）
  canvas.style.display = "none";

  const toggleHandler = () => {
    showSpectrum = !showSpectrum;
    if (btn) btn.textContent = showSpectrum ? "隐藏频谱" : "显示频谱";
    canvas.style.display = showSpectrum ? "block" : "none";
  };

  if (btn) btn.addEventListener("click", toggleHandler);

  // 公共渐变色
  const gradientColors = [
    { stop: 0, color: "rgba(255,200,180,0.8)" },
    { stop: 0.5, color: "rgba(255,180,150,0.7)" },
    { stop: 1, color: "rgba(255,160,120,0.6)" },
  ];

  function getGradient(x1, y1, x2, y2) {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    gradientColors.forEach(c => grad.addColorStop(c.stop, c.color));
    return grad;
  }

  let mode = "spectrum"; // "spectrum" / "waveform" / "circle"

  function clearCanvas() {
    ctx.fillStyle = "#fff8f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawSpectrum() {
    analyser.getByteFrequencyData(dataArray);
    clearCanvas();
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] * 0.8;
      ctx.fillStyle = getGradient(0, 0, 0, canvas.height);
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }

  function drawWaveform() {
    analyser.getByteTimeDomainData(dataArray);
    clearCanvas();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = getGradient(0, 0, 0, canvas.height);
    ctx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  function drawCircleSpectrum() {
    analyser.getByteFrequencyData(dataArray);
    clearCanvas();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.35;
    const bars = 128;
    const step = Math.floor(dataArray.length / bars);
    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step];
      const barHeight = value * 0.5;
      const angle = (i / bars) * Math.PI * 2;
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      ctx.strokeStyle = getGradient(x1, y1, x2, y2);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (!showSpectrum || canvas.style.display === "none" || canvas.style.visibility === "hidden") {
      clearCanvas();
      return;
    }
    if (mode === "spectrum") drawSpectrum();
    else if (mode === "waveform") drawWaveform();
    else drawCircleSpectrum();
  }

  function resumeAudioContext() {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  const clickResumeHandler = () => resumeAudioContext();
  const keydownResumeHandler = () => resumeAudioContext();

  document.addEventListener("click", clickResumeHandler);
  document.addEventListener("keydown", keydownResumeHandler);

  // 按 M 切换模式（保留原逻辑）
  const modeKeyHandler = (e) => {
    if (e.key.toLowerCase() !== "m") return;
    mode = mode === "spectrum" ? "waveform" : mode === "waveform" ? "circle" : "spectrum";
  };
  document.addEventListener("keydown", modeKeyHandler);

  // 启动绘制循环
  draw();

  // 存放清理函数到 element 上，便于卸载时找到（可选）
  canvas.__spectrumCleanup = () => {
    if (btn) btn.removeEventListener("click", toggleHandler);
    document.removeEventListener("click", clickResumeHandler);
    document.removeEventListener("keydown", keydownResumeHandler);
    document.removeEventListener("keydown", modeKeyHandler);
    if (rafId) cancelAnimationFrame(rafId);
    try {
      if (source) {
        source.disconnect();
      }
      if (analyser) analyser.disconnect();
      if (audioCtx && typeof audioCtx.close === 'function') {
        audioCtx.close();
      }
    } catch (e) {
      // ignore disconnect errors
    }
    rafId = null;
    audioCtx = null;
    source = null;
    analyser = null;
  };
});

onBeforeUnmount(() => {
  // 执行清理
  const canvas = document.getElementById("spectrumCanvas");
  if (canvas && typeof canvas.__spectrumCleanup === "function") {
    try { canvas.__spectrumCleanup(); } catch (e) { /* ignore */ }
    delete canvas.__spectrumCleanup;
  } else {
    // 兜底：取消 raf 与关闭 audioCtx
    if (rafId) cancelAnimationFrame(rafId);
    try {
      if (analyser) analyser.disconnect();
      if (source) source.disconnect();
      if (audioCtx && typeof audioCtx.close === 'function') audioCtx.close();
    } catch (e) {}
  }
});
</script>

<style>
/* 仅用于容器位置/外观（样式可由 Player.vue 中的样式控制） */
.spectrum-container {
  margin: 24px auto 0 auto;
  max-width: 900px;
  background: linear-gradient(180deg, #ffd8b0, #ffb685, #ff9f6a);
  border-radius: 12px;
  padding: 16px;
}
#spectrumCanvas {
  display: block;
  width: 100%;
  height: 260px;
  border-radius: 8px;
  background-color: #fff8f0;
}
</style>
