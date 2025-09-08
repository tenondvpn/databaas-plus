<template>
  <div>
    <h1>欢迎来到仪表盘</h1>
    <button @click="handleLogout">退出登录</button>
  </div>
</template>

<script setup>
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = async () => {
  localStorage.removeItem('user-token');
  delete axios.defaults.headers.common['Authorization'];
  router.push('/login');
};
</script>