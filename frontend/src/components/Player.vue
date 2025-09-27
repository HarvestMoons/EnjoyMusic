<template>
  <div>
    <div class="player-container">
      <!-- 左侧歌单 -->
      <div class="playlist-container">
        <h3>当前歌单</h3>
        <ul class="playlist">
          <li
              v-for="(song, index) in playlist"
              :key="song.id"
              :class="{ active: index === currentIndex }"
              @click="handlePlaylistClick(index)"
          >
            {{ getSongTitle(song.name) }}
          </li>

        </ul>
      </div>

      <!-- 右侧播放器信息 -->
      <div class="song-info-container">
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
    </div>

    <!-- 频谱 & 背景粒子 & Ripple -->
    <SpectrumVisualizer />
    <BackgroundParticles zIndex="0" opacity="0.4" color="0,0,0" :count="99" />
    <BackgroundRipple apiBase="/api" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SpectrumVisualizer from './SpectrumVisualizer.vue'
import BackgroundParticles from './BackgroundParticles.vue'
import BackgroundRipple from "./BackgroundRipple.vue";

const API_BASE = '/api';
const DEFAULT_FOLDER = 'ha_ji_mi';

// 响应式状态
const playlist = ref([]);           // 歌曲列表
const currentIndex = ref(-1);       // 当前播放索引
const historyStack = ref([]);       // 历史播放栈

// DOM元素
let audioPlayer, currentSongEl, playBtn, prevBtn, playModeSelect, folderSelector;
let likeBtn, dislikeBtn, likeCountEl, dislikeCountEl;

// ------------------- 初始化 -------------------
async function init() {
  // 获取 DOM 元素
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

  audioPlayer.crossOrigin = 'anonymous';
  audioPlayer.volume = 0.2;
  folderSelector.value = DEFAULT_FOLDER;

  setupEventListeners();

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

// ------------------- 歌单与文件夹 -------------------
async function handleFolderChange() {
  const selectedFolder = folderSelector.value;
  await setFolder(selectedFolder);
}

async function setFolder(folder) {
  try {
    showLoading(true);
    const res = await fetch(`${API_BASE}/songs/set-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder })
    });
    const result = await res.json();

    if (result.status === 'ok') {
      historyStack.value = [];
      await fetchSongList();
      if (playlist.value.length > 0) {
        playSongAtIndex(0);
      } else {
        currentSongEl.textContent = '无可播放歌曲';
        audioPlayer.src = '';
      }
    } else {
      alert('切换失败：' + result.error);
    }
  } catch (err) {
    console.error('切换音乐文件夹失败', err);
    alert('请求失败: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function fetchSongList() {
  try {
    const res = await fetch(`${API_BASE}/songs/get`);
    const data = await res.json();
    playlist.value = shuffleArray(data);
    return playlist.value;
  } catch (err) {
    console.error("获取歌曲列表失败", err);
    alert('获取歌曲列表失败: ' + err.message);
    return [];
  }
}

function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// ------------------- 播放控制 -------------------
function handlePlaylistClick(index) {
  //fromHistory设为false（默认），会把该点歌加入历史歌曲栈
  playSongAtIndex(index);
  const el = document.querySelector(`.playlist li.active`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function playSongAtIndex(index, fromHistory = false) {
  if (index < 0 || index >= playlist.value.length) {
    currentSongEl.textContent = '播放失败：索引越界';
    return;
  }

  if (!fromHistory && currentIndex.value !== -1 && currentIndex.value !== index) {
    historyStack.value.push(currentIndex.value);
  }

  currentIndex.value = index;
  const song = playlist.value[index];

  audioPlayer.src = song.url;
  const parsed = parseSongNameWithBv(song.name);
  if (parsed.bv) {
    currentSongEl.innerHTML = `${parsed.title} <a href="https://www.bilibili.com/video/${parsed.bv}/" target="_blank" style="font-size:14px;color:#007bff;">[叽里咕噜说啥呢]</a>`;
  } else {
    currentSongEl.textContent = parsed.title;
  }

  audioPlayer.play();
  refreshVotes(song.id);
}

function parseSongNameWithBv(name) {
  const clean = name.replace(/\.mp3$/, '');
  const match = clean.match(/^(.*?)_?(BV[0-9A-Za-z]+)/);
  return match ? { title: match[1], bv: match[2] } : { title: clean, bv: null };
}

function playPreviousSong() {
  if (historyStack.value.length === 0) {
    alert("没有上一首了！");
    return;
  }
  const prev = historyStack.value.pop();
  playSongAtIndex(prev, true);
}

function handlePlaybackEnd() {
  const diff = Math.abs(audioPlayer.currentTime - audioPlayer.duration);
  if (audioPlayer.duration > 0 && diff < 0.5) {
    const mode = playModeSelect.value;
    if (mode === 'single-loop') {
      audioPlayer.currentTime = 0;
      audioPlayer.play();
    } else if (mode === 'loop-list') {
      const next = (currentIndex.value + 1) % playlist.value.length;
      playSongAtIndex(next);
    } else {
      playRandomSong();
    }
  }
}

function handleAudioError() {
  console.warn(`❌ 无法播放：${playlist.value[currentIndex.value]?.name}，尝试下一首`);
  setTimeout(() => {
    const mode = playModeSelect.value;
    if (mode === 'loop-list') {
      const next = (currentIndex.value + 1) % playlist.value.length;
      playSongAtIndex(next);
    } else {
      playRandomSong();
    }
  }, 1000);
}

function playRandomSong() {
  if (!playlist.value || playlist.value.length === 0) {
    currentSongEl.textContent = '播放失败：歌曲列表为空';
    return;
  }
  const rand = Math.floor(Math.random() * playlist.value.length);
  playSongAtIndex(rand);
}

function handlePlayClick() {
  const mode = playModeSelect.value;
  if (mode === 'loop-list' && playlist.value.length > 0) {
    const next = (currentIndex.value + 1) % playlist.value.length;
    playSongAtIndex(next);
  } else {
    playRandomSong();
  }
}

// ------------------- 点赞 / 点踩 -------------------
async function handleLike() {
  const song = playlist.value[currentIndex.value];
  if (!song) return;
  try {
    const res = await fetch(`${API_BASE}/songs/like/${song.id}`, { method: 'POST' });
    const data = await res.json();
    likeCountEl.textContent = data.likes;
    dislikeCountEl.textContent = data.dislikes;
  } catch (err) {
    console.error('点赞失败', err);
  }
}

async function handleDislike() {
  const song = playlist.value[currentIndex.value];
  if (!song) return;
  try {
    const res = await fetch(`${API_BASE}/songs/dislike/${song.id}`, { method: 'POST' });
    const data = await res.json();
    likeCountEl.textContent = data.likes;
    dislikeCountEl.textContent = data.dislikes;
  } catch (err) {
    console.error('点踩失败', err);
  }
}

async function refreshVotes(songId) {
  try {
    const res = await fetch(`${API_BASE}/songs/votes/${songId}`);
    const data = await res.json();
    likeCountEl.textContent = data.likes;
    dislikeCountEl.textContent = data.dislikes;
  } catch (err) {
    console.error('获取投票数失败', err);
  }
}

// ------------------- 工具 -------------------
function showLoading(show) {
  document.body.classList.toggle('loading', show);
}

function openAuthor() {
  window.open('https://github.com/HarvestMoons/HarvestMoons', '_blank');
}

function getSongTitle(name) {
  // 去掉后缀 .mp3
  let title = name.replace(/\.(mp3)$/i, '');
  const match = title.match(/^(.*?)_?BV[0-9A-Za-z]+/i);
  if (match) title = match[1];
  return title;
}


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

.player-container {
  display: flex;
  gap: 20px;
}

.playlist-container {
  flex: 1 1 200px;
  max-height: 500px;
  overflow-y: auto;
  background-color: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e0e4e8;
}

.playlist-container ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.playlist-container li {
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  white-space: nowrap;         /* 单行 */
  overflow: hidden;            /* 超出隐藏 */
  text-overflow: ellipsis;     /* 显示省略号 */
}


.playlist-container li:hover {
  background-color: #f0f2f5;
}

.playlist-container li.active {
  background-color: #5ab9ea;
  color: #fff;
}

.song-info-container {
  flex: 2 1 auto;
}

</style>
