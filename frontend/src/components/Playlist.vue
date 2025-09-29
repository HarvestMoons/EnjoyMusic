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
.playlist {
  width: 300px;               /* 固定宽度 */
  max-height: 670px;          /* 限制高度（根据 player-container 高度设置） */
  overflow-y: auto;           /* 超出时内部滚动 */
  border-right: 1px solid #ccc;
  padding: 10px;
  box-sizing: border-box;
}

.playlist ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.playlist li {
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.playlist li:hover {
  background: #f0f0f0;
}

.playlist li.active {
  background: #5ab9ea;
  color: #fff;
}
</style>