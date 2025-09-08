// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Register from '../components/Register.vue';
import Login from '../components/Login.vue';
import Dashboard from '../components/Dashboard.vue'; // 登录后跳转的页面
import Pipeline from '../components/Pipeline.vue'; // 登录后跳转的页面
import ExternalView from '../components/ExternalRedirect.vue'; // 登录后跳转的页面

const routes = [
  { path: '/register', component: Register },
  { path: '/login', component: Login },
  { path: '/pipeline', component: Pipeline, meta: { requiresAuth: true } },
  {
    path: '/dashboard',
    component: ExternalView,
    meta: { bypassAuth: true,external: true  }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const whiteList = ['/external', '/public']


// 路由守卫：检查用户是否登录
router.beforeEach((to, from, next) => {
    document.title = to.meta.title || '默认标题'
  
  if (whiteList.includes(to.path)) {
    return next()
  }

  const token = localStorage.getItem('access_token');
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;