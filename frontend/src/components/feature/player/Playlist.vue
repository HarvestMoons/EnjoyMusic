<template>
  <div class="playlist-container">
    <h3>当前歌单</h3>
    <ul class="playlist">
      <li
          v-for="(song, index) in playlist"
          :key="song.id"
          :class="{ active: index === currentIndex }"
          @click="$emit('select', index)"
      >
        {{ getSongTitle(song.name) }}
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  playlist: { type: Array, required: true },
  currentIndex: { type: Number, required: true }
})

function getSongTitle(name) {
  // 去掉 .mp3 后缀
  let title = name.replace(/\.(mp3)$/i, '')
  const match = title.match(/^(.*?)_?BV[0-9A-Za-z]+/i)
  if (match) title = match[1]
  return title
}
</script>

<style scoped>
.playlist-container {
  width: 320px;
  background: #fff9d6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 16px;
  box-sizing: border-box;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.playlist-container h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.playlist {
  max-height: 670px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
}

.playlist li {
  list-style: none;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: #555;
  background: #fefae0; /* 浅米黄，柔和背景 */
  box-shadow: inset 0 0 0 rgba(0,0,0,0);
}

.playlist li:hover {
  background: #fff176; /* 柔和黄色，hover高亮 */
  color: #333;
  transform: translateX(4px);
}

.playlist li.active {
  background: #f9a825; /* 温暖橙黄，清晰区分 */
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(249, 168, 37, 0.3);
}

</style>
