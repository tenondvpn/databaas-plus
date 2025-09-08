<template>
    <div class="x6-container" ref="containerRef">
    </div>

    <el-popover :visible="popoverVisible" :width="150" trigger="manual" popper-class="context-menu-popover">
        <template #reference>
            <div style="display: none;"></div>
        </template>

        <div class="menu-list">
            <div class="menu-item" @click="handleAction('add')">新增节点</div>
            <div class="menu-item" @click="handleAction('delete')">删除节点</div>
        </div>
    </el-popover>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Graph } from '@antv/x6';
import { ElMessage } from 'element-plus';

const containerRef = ref(null);
const graph = ref(null);
const popoverVisible = ref(false);
const selectedCell = ref(null);

onMounted(() => {
    // 初始化 X6 画布
    graph.value = new Graph({
        container: containerRef.value,
        grid: true,
    });

    const node1 = graph.value.addNode({ x: 100, y: 100, width: 80, height: 40, label: '节点A' });
    const node2 = graph.value.addNode({ x: 300, y: 100, width: 80, height: 40, label: '节点B' });
    graph.value.addEdge({ source: node1, target: node2 });

    // 监听 X6 节点的右键事件
    graph.value.on('node:contextmenu', ({ e, node }) => {
        e.preventDefault();
        selectedCell.value = node;

        // 关键步骤: 将鼠标坐标设置到 body 上的 CSS 变量
        document.documentElement.style.setProperty('--popover-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--popover-y', `${e.clientY}px`);
        const popperEl = document.querySelector('.context-menu-popover');
        popperEl.style.setProperty('top', `${e.clientX}px`);
        popperEl.style.setProperty('left', `${e.clientY}px`);

        popoverVisible.value = true;
    });

    graph.value.on('blank:contextmenu', ({ e }) => {
        e.preventDefault();
        popoverVisible.value = false;
    });

    document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
    if (graph.value) {
        graph.value.off('node:contextmenu');
        graph.value.off('blank:contextmenu');
    }
    document.removeEventListener('click', handleDocumentClick);
});

// 全局点击事件处理函数
const handleDocumentClick = (e) => {
    const popperEl = document.querySelector('.context-menu-popover');
    if (popperEl && !popperEl.contains(e.target) && popoverVisible.value) {
        popoverVisible.value = false;
    }
};

const handleAction = (action) => {
    if (!selectedCell.value) return;

    if (action === 'delete') {
        graph.value.removeCell(selectedCell.value);
        ElMessage.success('节点已删除');
    }

    popoverVisible.value = false;
};
</script>

<style scoped>
.x6-container {
    width: 100%;
    height: 500px;
    border: 1px solid #ccc;
}

.menu-list {
    padding: 0;
}

.menu-item {
    padding: 8px 12px;
    cursor: pointer;
    white-space: nowrap;
}

.menu-item:hover {
    background-color: #f5f5f5;
}
</style>

<style>
/* 关键样式: 在非作用域样式中，使用变量和 !important 覆盖默认行为 */
.context-menu-popover {
    position: fixed !important;
    left: var(--popover-x) !important;
    top: var(--popover-y) !important;
    transform: none !important;
}
</style>