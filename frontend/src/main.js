// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')

// 推荐在主入口注册 SW（只注册一次）
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered (main):', reg))
        .catch(err => console.warn('SW register failed (main):', err));
}
