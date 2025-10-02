<template>
  <div class="playlist-container">
    <div class="header">
      <h3>当前歌单</h3>
      <SearchBar placeholder="搜索歌曲..." @search="handleSearch" />
    </div>

    <ul class="playlist">
      <li
          v-for="song in filteredPlaylist"
          :key="song.id"
          :class="{ active: song.id === currentSongId }"
          @click="$emit('select', song.id)"
      >
        {{ getSongTitle(song.name) }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SearchBar from "../../common/SearchBar.vue";

const props = defineProps({
  playlist: { type: Array, required: true },
  currentSongId: { type: [String, Number], default: null }
})

const searchQuery = ref('')

const handleSearch = (keyword) => {
  searchQuery.value = keyword
}

const filteredPlaylist = computed(() => {
  if (!searchQuery.value) return props.playlist
  const query = searchQuery.value.toLowerCase()
  return props.playlist.filter(song =>
      getSongTitle(song.name).toLowerCase().includes(query)
  )
})

function getSongTitle(name) {
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.playlist {
  max-height: 670px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 12px 0 0 0;
}

.playlist li {
  list-style: none;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: #555;
  background: #fefae0;
  box-shadow: inset 0 0 0 rgba(0,0,0,0);
}

.playlist li:hover {
  background: #fff176;
  color: #333;
  transform: translateX(4px);
}

.playlist li.active {
  background: #f9a825;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(249, 168, 37, 0.3);
}
</style>
