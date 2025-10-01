import { createRouter, createWebHistory } from 'vue-router'
import PrivacyPage from '../views/PrivacyPage.vue'
import HomePage from "../views/HomePage.vue";
import About from "../views/About.vue";

const routes = [
    { path: '/', component: HomePage },
    { path: '/privacy', component: PrivacyPage },
    { path: '/about', component: About }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
