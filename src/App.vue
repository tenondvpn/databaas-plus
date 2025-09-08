<template>
    <el-menu :default-active="activeIndex" mode="horizontal" style="height: 44px;" :ellipsis="false"
        @select="handleSelect">
        <el-menu-item index="0">
            <img v-if="isDark" style="width: 100px" src="./images/shardora.png" alt="Element logo" />
            <img v-else style="width: 100px" src="./images/blue_shardora.png" alt="Element logo" />
        </el-menu-item>
        <el-tooltip class="box-item" content="进入流程管理页面，管理自己的流程！">
            <el-menu-item index="1" @click="toPipeline">流程管理</el-menu-item>
        </el-tooltip>
        <el-tooltip class="box-item" content="管理所有的计算任务！">
            <el-menu-item index="2">所有任务</el-menu-item>
        </el-tooltip>
        <el-tooltip class="box-item" content="管理插件，实现算法、数据、算力、模型的共享复用！">
            <el-menu-item index="3">插件管理</el-menu-item>
        </el-tooltip>
        <el-tooltip class="box-item" content="进入平台统计大屏，包括算力，数据，模型，任务，用户统计信息！">
            <el-menu-item index="7" @click="toDashboard">平台大屏</el-menu-item>
        </el-tooltip>
        <el-menu-item index="4" style="margin-top:0px;width:60px">
            <el-tooltip class="box-item" content="切换主题！">
                <div class="hello">
                    <div>
                        <el-switch v-model="isDark" :active-icon="Moon" :inactive-icon="Sunny" inline-prompt
                            @change="toggleDark" style="margin-top: 0px; width: 30px;margin-left:-10px;" />
                    </div>
                </div>
            </el-tooltip>
        </el-menu-item>
        <el-menu-item index="5" style="margin-top:0px">
            <el-tooltip class="box-item" content="切换主题！">
                <el-color-picker v-model="themeColor" show-alpha :predefine="predefineColors" @change="logColor" />
            </el-tooltip>
        </el-menu-item>
        <el-menu-item index="6" @click="handleLogout">
            用户管理
            <!-- <div class="demo-basic--circle" style="margin-top: -32px;">
                <div class="block">
                    <el-avatar :size="30" :src="circleUrl" @click="handleLogout"/>
                </div>
            </div> -->
        </el-menu-item>
    </el-menu>
    <router-view></router-view>
</template>
<script lang="ts">
export default {
}

</script>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { reactive, toRefs } from 'vue'
import { Sunny, Moon } from "@element-plus/icons-vue";
import { useDark, useToggle } from "@vueuse/core";
import axios from 'axios';
import { useRouter } from 'vue-router';
import { ElConfigProvider } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

// 从 localStorage 获取或设置默认主题色
const themeColor = ref(localStorage.getItem('themeColor') || '#5F95FF');

// 监听 themeColor 的变化
watch(themeColor, (newColor) => {
  // 动态修改 Element UI 的 --el-color-primary 变量
  document.documentElement.style.setProperty('--el-color-primary', newColor);
  // 同时修改其他相关的颜色变量
  document.documentElement.style.setProperty('--el-color-primary-light-3', newColor);
  document.documentElement.style.setProperty('--el-color-primary-light-5', newColor);
  document.documentElement.style.setProperty('--el-color-primary-light-7', newColor);
  document.documentElement.style.setProperty('--el-color-primary-light-8', newColor);
  document.documentElement.style.setProperty('--el-color-primary-light-9', newColor);
});

// 保存颜色到 localStorage
const saveTheme = () => {
  localStorage.setItem('themeColor', themeColor.value);
};

function logColor(val) {
    console.log('颜色已更新:', val)
    // document.documentElement 是全局变量时
    const el = document.documentElement
    // const el = document.getElementById('xxx')

    // 获取 css 变量
    getComputedStyle(el).getPropertyValue(`--el-color-primary`)

    // 设置 css 变量
    el.style.setProperty('--el-color-primary', val)
    themeColor.value = val;
    saveTheme()
}

// 页面加载时，应用保存的颜色
document.documentElement.style.setProperty('--el-color-primary', themeColor.value);

const router = useRouter();

const handleLogout = async () => {
            localStorage.removeItem('user-token');
            delete axios.defaults.headers.common['Authorization'];
            router.push('/login');
            console.log("logout success.")


};

const toDashboard = () => {
    router.push('/dashboard');
}

const toPipeline = () => {
    router.push('/pipeline');
}

const isDark = useDark();

const toggleDark = useToggle(isDark);

const activeIndex = ref('1')
const handleSelect = (key: string, keyPath: string[]) => {
    console.log(key, keyPath)
}


const state = reactive({
    circleUrl:
        'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
    squareUrl:
        'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png',
    sizeList: ['small', '', 'large'] as const,
})

const { circleUrl, squareUrl, sizeList } = toRefs(state)


const color = ref('rgba(255, 69, 0, 0.68)')
const predefineColors = ref([
    '#5F95FF',
    '#ff8c00',
    '#ffd700',
    '#90ee90',
    '#00ced1',
    '#1e90ff',
    '#c71585',
    'rgba(255, 69, 0, 0.68)',
    'rgb(255, 120, 0)',
    'hsv(51, 100, 98)',
    'hsva(120, 40, 94, 0.5)',
    'hsl(181, 100%, 37%)',
    'hsla(209, 100%, 56%, 0.73)',
    '#c7158577',
])

</script>

<style scoped>
.el-menu--horizontal>.el-menu-item:nth-child(1) {
    margin-right: auto;
}

.demo-basic {
    text-align: center;
}

.demo-basic .sub-title {
    margin-bottom: 10px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
}

.demo-basic .demo-basic--circle,
.demo-basic .demo-basic--square {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.demo-basic .block:not(:last-child) {
    border-right: 1px solid var(--el-border-color);
}

.demo-basic .block {
    flex: 1;
}

.demo-basic .el-col:not(:last-child) {
    border-right: 1px solid var(--el-border-color);
}

@media screen and (max-width: 992px) {
    .demo-basic .el-col:not(:last-child) {
        border-right: none;
    }
}
</style>


<!-- 

<template>
  <div id="app">
    <header class="app-header">
      <nav class="app-nav">
      </nav>
    </header>

    <main class="app-main">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
// 这个文件通常不需要太多逻辑，除非你需要管理全局状态或监听路由变化
</script>

<style>
/* 全局样式 */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  background-color: #f4f5f7;
  color: #333;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 15px 30px;
}

.app-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  text-decoration: none;
  color: #555;
  font-weight: bold;
}

.router-link-active {
  color: #409eff; /* Element Plus 的主色调 */
}

.app-main {
  flex-grow: 1;
  padding: 20px;
}
</style> -->