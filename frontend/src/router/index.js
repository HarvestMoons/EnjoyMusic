import { createRouter, createWebHistory } from 'vue-router'
import PrivacyPage from '../views/PrivacyPage.vue'
import HomePage from "../views/HomePage.vue";

const routes = [
    { path: '/', component: HomePage }, // 主页
    { path: '/privacy', component: PrivacyPage }, // 隐私政策
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
