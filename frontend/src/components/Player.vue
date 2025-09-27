<template>
  <div>
    <div class="player-container">
      <h1>🎵 小蜜蜂大乐堂 🐝</h1>

      <div class="song-info">
        <h2 id="current-song">当前未播放</h2>
        <div class="vote-controls">
          <button id="like-btn">👍 <span id="like-count">0</span></button>
          <button id="dislike-btn">👎 <span id="dislike-count">0</span></button>
        </div>
        <audio id="audio-player" controls></audio>
      </div>

      <div class="controls">
        <button id="play-btn">随便听听</button>
        <button id="prev-btn">上一首</button>
        <button id="toggleSpectrumBtn">显示频谱</button>

        <select id="play-mode">
          <option value="random">连播模式：随机播放</option>
          <option value="loop-list">连播模式：列表循环</option>
          <option value="single-loop">连播模式：单曲循环</option>
        </select>

        <select id="folder-selector">
          <option value="ha_ji_mi">哈基咪咪</option>
          <option value="dian_gun">溜冰密室</option>
          <option value="da_si_ma">起飞基地</option>
          <option value="ding_zhen">烟雾缭绕</option>
          <option value="dxl">东洋雪莲</option>
        </select>

        <button class="author-btn" @click="openAuthor">
          开发者信息
        </button>
      </div>
    </div>

    <!-- 频谱组件（已在另处实现） -->
    <SpectrumVisualizer />

    <!-- 背景粒子：组件会把 canvas 挂到 body（与原脚本行为一致） -->
    <!-- 这里传入原来 script 的属性：zIndex, opacity, color, count -->
    <BackgroundParticles zIndex="0" opacity="0.4" color="0,0,0" :count="99" />
    <BackgroundRipple apiBase="/api" /> <!-- 传入你的后端 base -->
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import SpectrumVisualizer from './SpectrumVisualizer.vue'
import BackgroundParticles from './BackgroundParticles.vue'
import BackgroundRipple from "./BackgroundRipple.vue";

// 配置（保持原有相对路径）
const API_BASE = '/api';
const DEFAULT_FOLDER = 'ha_ji_mi';

// DOM元素（将在 init 中获取）
let audioPlayer, currentSongEl, playBtn, prevBtn, playModeSelect, folderSelector;
let likeBtn, dislikeBtn, likeCountEl, dislikeCountEl;

// 状态变量（与原实现一致）
let playlist = [];
let currentIndex = -1;
let currentFolder = DEFAULT_FOLDER;
let historyStack = [];

// 初始化
async function init() {
  // 取得 DOM（必须在组件挂载后）
  audioPlayer = document.getElementById('audio-player');
  currentSongEl = document.getElementById('current-song');
  playBtn = document.getElementById('play-btn');
  prevBtn = document.getElementById('prev-btn');
  playModeSelect = document.getElementById('play-mode');
  folderSelector = document.getElementById('folder-selector');
  likeBtn = document.getElementById('like-btn');
  dislikeBtn = document.getElementById('dislike-btn');
  likeCountEl = document.getElementById('like-count');
  dislikeCountEl = document.getElementById('dislike-count');

  // 基础设置
  folderSelector.value = DEFAULT_FOLDER;
  currentFolder = DEFAULT_FOLDER;
  audioPlayer.crossOrigin = 'anonymous';
  audioPlayer.volume = 0.2;

  // 事件监听
  setupEventListeners();

  // 初始化文件夹并加载列表
  await setFolder(DEFAULT_FOLDER);
}

function setupEventListeners() {
  folderSelector.addEventListener('change', handleFolderChange);
  playBtn.addEventListener('click', handlePlayClick);
  prevBtn.addEventListener('click', playPreviousSong);
  audioPlayer.addEventListener('ended', handlePlaybackEnd);
  audioPlayer.addEventListener('error', handleAudioError);
  likeBtn.addEventListener('click', handleLike);
  dislikeBtn.addEventListener('click', handleDislike);
}

async function handleFolderChange() {
  const selectedFolder = folderSelector.value;
  await setFolder(selectedFolder);
}

async function setFolder(folder) {
  try {
    showLoading(true);
    const response = await fetch(`${API_BASE}/songs/set-folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ folder })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'ok') {
      currentFolder = folder;
      historyStack = []; // 清空历史记录
      await fetchSongList();

      if (playlist.length > 0) {
        playSongAtIndex(0);
      } else {
        currentSongEl.textContent = '无可播放歌曲';
        audioPlayer.src = '';
      }
    } else {
      alert('切换失败：' + result.error);
    }
  } catch (error) {
    console.error('切换音乐文件夹失败', error);
    alert('请求失败: ' + error.message);
  } finally {
    showLoading(false);
  }
}

async function fetchSongList() {
  try {
    const response = await fetch(`${API_BASE}/songs/get`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    playlist = shuffleArray(data);
    return playlist;
  } catch (error) {
    console.error("获取歌曲列表失败", error);
    alert('获取歌曲列表失败: ' + error.message);
    return [];
  }
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function playSongAtIndex(index, fromHistory = false) {
  if (index < 0 || index >= playlist.length) {
    currentSongEl.textContent = '播放失败：索引越界';
    return;
  }

  if (!fromHistory && currentIndex !== -1 && currentIndex !== index) {
    historyStack.push(currentIndex);
  }

  currentIndex = index;
  const item = playlist[index];

  audioPlayer.crossOrigin = 'anonymous';
  audioPlayer.src = item.url;

  const parsed = parseSongNameWithBv(item.name);
  if (parsed.bv) {
    currentSongEl.innerHTML = `${parsed.title} <a href="https://www.bilibili.com/video/${parsed.bv}/" target="_blank" style="font-size:14px;color:#007bff;">[叽里咕噜说啥呢]</a>`;
  } else {
    currentSongEl.textContent = parsed.title;
  }

  audioPlayer.play();
  refreshVotes(item.id);
}

function parseSongNameWithBv(songName) {
  const name = songName.replace(/\.mp3$/, '');
  const match = name.match(/^(.*?)_?(BV[0-9A-Za-z]+)/);
  if (match) {
    return {
      title: match[1],
      bv: match[2]
    };
  }
  return {
    title: name,
    bv: null
  };
}

function playPreviousSong() {
  if (historyStack.length === 0) {
    alert("没有上一首了！");
    return;
  }
  const prevIndex = historyStack.pop();
  playSongAtIndex(prevIndex, true);
}

function handlePlaybackEnd() {
  const diff = Math.abs(audioPlayer.currentTime - audioPlayer.duration);

  if (audioPlayer.duration > 0 && diff < 0.5) {
    const mode = playModeSelect.value;
    if (mode === 'single-loop') {
      audioPlayer.currentTime = 0;
      audioPlayer.play();
    } else if (mode === 'loop-list') {
      const nextIndex = (currentIndex + 1) % playlist.length;
      playSongAtIndex(nextIndex);
    } else {
      playRandomSong();
    }
  }
}

function handleAudioError() {
  console.warn(`❌ 无法播放：${playlist[currentIndex]?.name}，尝试下一首`);

  setTimeout(() => {
    const mode = playModeSelect.value;
    if (mode === 'loop-list') {
      const nextIndex = (currentIndex + 1) % playlist.length;
      playSongAtIndex(nextIndex);
    } else {
      playRandomSong();
    }
  }, 1000);
}

function playRandomSong() {
  if (!playlist || playlist.length === 0) {
    console.error('播放失败：歌曲列表为空');
    currentSongEl.textContent = '播放失败：歌曲列表为空';
    return;
  }

  const randomIndex = Math.floor(Math.random() * playlist.length);
  playSongAtIndex(randomIndex);
}

function handlePlayClick() {
  const mode = playModeSelect.value;
  if (mode === 'loop-list' && playlist.length > 0) {
    const nextIndex = (currentIndex + 1) % playlist.length;
    playSongAtIndex(nextIndex);
  } else {
    playRandomSong();
  }
}

async function handleLike() {
  if (!playlist[currentIndex]) return;

  try {
    const songId = playlist[currentIndex].id;
    const response = await fetch(`${API_BASE}/songs/like/${songId}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    likeCountEl.textContent = data.likes;
    dislikeCountEl.textContent = data.dislikes;
  } catch (error) {
    console.error('点赞失败', error);
    alert('点赞失败: ' + error.message);
  }
}

async function handleDislike() {
  if (!playlist[currentIndex]) return;

  try {
    const songId = playlist[currentIndex].id;
    const response = await fetch(`${API_BASE}/songs/dislike/${songId}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    likeCountEl.textContent = data.likes;
    dislikeCountEl.textContent = data.dislikes;
  } catch (error) {
    console.error('点踩失败', error);
    alert('点踩失败: ' + error.message);
  }
}

async function refreshVotes(songId) {
  try {
    const response = await fetch(`${API_BASE}/songs/votes/${songId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    likeCountEl.textContent = data.likes;
    dislikeCountEl.textContent = data.dislikes;
  } catch (error) {
    console.error('获取投票数失败', error);
  }
}

function showLoading(show) {
  document.body.classList.toggle('loading', show);
}

function openAuthor() {
  window.open('https://github.com/HarvestMoons/HarvestMoons', '_blank');
}

// 组件挂载后初始化（替代原来的 DOMContentLoaded）
onMounted(() => {
  init();
});
</script>

<style>
/* 直接保留你原来的样式（实际项目中可抽出到全局 CSS） */
body {
  font-family: 'Arial', sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f0f2f5;
  color: #333;
}

.player-container {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #e0e4e8;
}

/* 其余样式保持与原文件一致（此处为简洁省略重复，实际请保留你原样式） */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 15px;
}
.controls button,
.controls select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
}
button {
  padding: 10px 18px;
  background-color: #5ab9ea;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}
button:hover {
  background-color: #489fcc;
}
.author-btn {
  background-color: #f29e4c;
}
.author-btn:hover {
  background-color: #d3863a;
}
.song-info {
  margin: 24px 0;
  padding: 16px;
  background-color: #fafafb;
  border-radius: 6px;
  border: 1px solid #e5e8eb;
}
audio {
  width: 100%;
  margin-top: 12px;
}
.vote-controls {
  margin-top: 10px;
  display: flex;
  gap: 12px;
  justify-content: flex-start;
}
.vote-controls button {
  background-color: #e8f0fe;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}
.vote-controls button:hover {
  background-color: #cfe0fc;
}
</style>
