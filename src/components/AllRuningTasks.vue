<template>
    <el-card v-model="show_task_status" :direction="drawer_direction" size="100%" :destroy-on-close="true">
        <template #header>
            <el-row justify="end">
                <el-col :span="6" style="float: left;">
                    <el-tooltip class="box-item" effect="dark" content="手动刷新数据列表！" style="text-align: left;"
                        placement="top-start">
                        <el-button @click="userRefreshData" style="margin-left: 20px;" type="default" size="default"
                            :icon="Refresh" circle />
                    </el-tooltip>
                    <el-tooltip class="box-item" effect="dark" content="自动刷新数据列表！" style="text-align: left;"
                        placement="top-start">
                        <el-switch style="margin-left: 20px;height: 40px;" size="large" v-model="auto_refresh_task"
                            :active-action-icon="Select" :inactive-action-icon="CloseBold" />
                    </el-tooltip>
                    <el-button-group style="margin-left:20px;">
                    <el-button type="primary" :disabled="!choosed_task" @click="batchRun">批量重跑</el-button>
                    <el-button type="primary" :disabled="!choosed_task" @click="batchStop">批量停止</el-button>
                    </el-button-group>

                </el-col>

                <el-col :span="18">


                        <el-pagination style="margin-left: 196px;float:right" v-model:current-page="currentPage2"
                            v-model:page-size="pageSize2" :page-sizes="[10, 50, 100, 200]" background
                            layout="sizes, prev, pager, next" :total="currentTotalSize" />

                </el-col>
            </el-row>

        </template>
        <template #default>
            <TaskStatusList :table_margin_top="-5" :auto_refresh="auto_refresh_task" :pipeline_name="pipeline_name" :task_name="task_name"
                :page_size="pageSize2" />
        </template>
    </el-card>
</template>


<script lang="ts">
import CreateNode from './CreateNode.vue';
import RunPipeline from './RunPipeline.vue';
import TaskStatusList from './TaskStatusList.vue';
import ExportGraph from './ExportGraph.vue'
import { ElMessageBox } from 'element-plus';
import { ElMessage } from 'element-plus';

export default {
    name: 'App',
    components: {
        CreateNode,
        RunPipeline,
        TaskStatusList,
        ExportGraph,
    },

};

</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, h } from 'vue';
import {
    Select,
    CloseBold,
} from '@element-plus/icons-vue'
import emitter from './EventBus';
import type { DrawerProps } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
const auto_refresh_task = ref(false)

const drawer_direction = ref<DrawerProps['direction']>('rtl')
const popoverVisible = ref(false);
const pipeline_name = ref('');
const task_name = ref('');
const show_task_status = ref(false)
const choosed_task = ref(false)
const pageSize2 = ref(10)
const currentPage2 = ref(1)
const currentTotalSize = ref(0)

const handleDocumentClick = (e) => {
    const popperEl = document.querySelector('.context-menu-popover');
    if (popperEl && !popperEl.contains(e.target) && popoverVisible.value) {
        popoverVisible.value = false;
    }
};

emitter.on('success_load_task_table_data', (tasks_info) => {
    currentTotalSize.value = tasks_info.recordsTotal
});

emitter.on('table_selected_changed', (checked_length) => {
    if (checked_length > 0) {
        choosed_task.value = true
    } else {
        choosed_task.value = false
    }
})

const batchRun = () => {
    emitter.emit('batch_run_table_tasks', '');
}

const batchStop = () => {
    emitter.emit('batch_stop_table_tasks', '');
}

watch(currentPage2, (newVal) => {
    emitter.emit('reload_task_table_data_with_page', newVal)
})

watch(pageSize2, (newVal) => {
    emitter.emit('reload_task_table_data_with_page_size', newVal)
})

watch(auto_refresh_task, (newVal) => {
    emitter.emit('auto_refresh_task_table_data', newVal)
})

const userRefreshData = () => {
    emitter.emit('user_refresh_table_data', '')
}

// Initialize on mount
onMounted(() => {
    show_task_status.value = true
    document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
    // clearInterval(second_timer);
});

</script>

<style scoped>
:global(.custom-dragging-style.is-dragging) {
    border: 2px dashed var(--el-color-primary);
    opacity: 0.65;
}

.affix-container {
    text-align: center;
    z-index: 1000;
    height: 400px;
    border-radius: 4px;
    background: var(--el-color-primary-light-9);
}

.fixed-right {
    position: fixed;
    right: 9px;
    top: -100px;
}

.containerDark {
    display: flex;
    border: 1px solid #4c4d4f;
}

.containerLight {
    display: flex;
    border: 1px solid #dddfe6;
}

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

/* 1. 自定义紫色按钮 */
:deep(.is-purple) {
    --el-button-bg-color: #7a36f8;
    --el-button-border-color: #7a36f8;
    --el-button-text-color: #fff;
    --el-button-hover-bg-color: #8c57fc;
    --el-button-hover-border-color: #8c57fc;
    --el-button-active-bg-color: #6a2ad1;
    --el-button-active-border-color: #6a2ad1;
}

/* 2. 自定义粉色按钮 */
:deep(.is-pink) {
    --el-button-bg-color: #ff69b4;
    --el-button-border-color: #ff69b4;
    --el-button-text-color: #fff;
    --el-button-hover-bg-color: #ff85c2;
    --el-button-hover-border-color: #ff85c2;
    --el-button-active-bg-color: #e55ba0;
    --el-button-active-border-color: #e55ba0;
}

::v-deep .my-icon-kucun {
    background: '/images/shell.png';
    font-size: 12px;
    background-size: cover;
}


.custom-icon {
    width: 20px;
    height: 20px;
    vertical-align: -0.125em;
    /* 对齐文本 */
}


.custom-drawer :deep(.el-drawer__header) {
    margin-bottom: 0 !important;
    /* 移除默认32px间距 */
    padding: 16px;
    /* 自定义内边距 */
    border-bottom: 1px solid #eee;
    /* 添加底部边框 */
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

.el-drawer__header {
    margin-bottom: 0px !important;
    border-bottom: 1px solid var(--el-color-info);
}
</style>