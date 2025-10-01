<template>
  <Sidebar />
  <div class="about-page">
    <h1>关于本站</h1>
    <p>开发者：小蜜蜂 <span style="color: transparent">特别鸣谢：ChatGPT、DeepSeek</span></p>
    <p>本站是一个个人音乐网站，基于 Vue3 + Spring 开发，音乐来源于Bilibili网站。<span style="color: transparent">在主页面，长按空白处可以观看随机逆天视频。</span></p>
  </div>
</template>

<script setup>
import Sidebar from "../components/layout/Sidebar.vue";
</script>

<style scoped>

.about-page {
  text-align: left;
  padding: 20px;
  margin-left: 120px; /* 给侧边栏留出空间，偏右 */
  box-sizing: border-box;

}
</style>
