<template>
    <div class="demo-color-block">
        <el-text type="primary" size="Large">导出图片背景色：</el-text>
        <el-color-picker v-model="color_background" show-alpha :predefine="predefineColors" />
    </div>

    <div class="demo-color-block">
        <el-text type="primary" size="Large">导出节点背景色：</el-text>
        <el-color-picker v-model="color_node" show-alpha :predefine="predefineColors" />
    </div>

    <div class="demo-color-block">
        <el-text type="primary" size="Large">导出的字体颜色：</el-text>
        <el-color-picker v-model="color_fount" show-alpha :predefine="predefineColors" />
    </div>

    <div style="margin-top: 20px">
        <el-text type="primary" size="Large">导出的图片格式：</el-text>
        <el-radio-group v-model="radio2">
            <el-radio-button label="SVG" value="SVG" />
            <el-radio-button label="PNG" value="PNG" />
            <el-radio-button label="JPEG" value="JPEG" />
        </el-radio-group>
    </div>

    <el-divider style="margin-top: 180px;" />

    <el-button :icon="Download" type="primary" @click="ExportGraph">导出</el-button>
</template>

<style>
.demo-color-block {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
}

.demo-color-block .demonstration {
    margin-right: 16px;
}
</style>


<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { Download } from '@element-plus/icons-vue'
import emitter from './EventBus'
import { useDark, useToggle } from "@vueuse/core";
const isDark = useDark();

const color_background = ref('rgba(0, 0, 0, 0.68)')
const color_node = ref('rgba(31, 147, 255, 0.73)')
const color_fount = ref('rgb(255, 255, 255)')
const radio2 = ref('PNG')

onMounted(() => {
    if (isDark.value) {
        color_background.value = 'rgba(0, 0, 0, 0.68)'
    } else {
        color_background.value = 'rgba(255, 255, 255)'
    }

    color_node.value = getComputedStyle(document.documentElement)
      .getPropertyValue('--el-color-primary').trim()
    console.log("color_node: ", color_node.value)
});

const predefineColors = ref([
    '#ff4500',
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

const ExportGraph = () => {
    emitter.emit('export_graph', {
        color_background: color_background.value,
        color_node: color_node.value,
        color_fount: color_fount.value,
        format: radio2.value
    })
}
</script>
