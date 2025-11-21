<template>
    <el-scrollbar style="height: 79vh">
        <el-badge class="item" style="float: left; margin-top: 10px;" :value="procType" type="primary">
            <el-text style="font-size: 24px;">{{ procName }}</el-text>
        </el-badge>

        <el-divider style="float: right;" />

        <el-table border :data="tableData" min-height="400" height="100%" style="width: 100%">
            <el-table-column label="流程名称" header-align="center" align="center">
                <template #default="scope">
                    <el-link type="primary" @click="showPipeline(scope.row)">{{ scope.row.pipeline_name }}</el-link>
                </template>
            </el-table-column>

            <el-table-column label="任务名称" header-align="center" align="center">
                <template #default="scope">
                    <el-link type="primary" @click="showTask(scope.row)">{{ scope.row.task_name }}</el-link>
                </template>
            </el-table-column>
            <el-table-column prop="last_run_time" label="执行时间" header-align="center" align="center">
                <template #default="scope">
                    <el-tag type="default">{{ scope.row.last_run_time }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="owner_name" label="负责人" header-align="center" align="center">
                <template #default="scope">
                    <el-tag type="warning">{{ scope.row.owner_name }}</el-tag>
                </template>
            </el-table-column>
            <template #empty>
                <div class="flex items-center justify-center h-100%">
                    <el-empty />
                </div>
            </template>
        </el-table>
    </el-scrollbar>
    <el-drawer v-model="createPipeline" :direction="drawer_direction" size="50%" :destroy-on-close="true"
        :append-to-body="true">
        <template #header>
            <h4>更新流程信息</h4>
        </template>
        <template #default>
            <CreatePipelineVue :pipeline_info="pipeline_info" />
        </template>
    </el-drawer>

    <el-drawer v-model="show_task_vue" :direction="drawer_direction" size="50%" :destroy-on-close="true"
        :append-to-body="true">
        <template #header>
            <h4 style="width: 100px">更新任务配置</h4>
        </template>
        <template #default>
            <CreateNode :pipeline_id="pipeline_id" :task_info="clicked_task_info" :task_type="taskType" />
        </template>
    </el-drawer>
</template>

<script setup lang="ts">

import axios from 'axios'
import qs from 'qs'
import { ref, onMounted, h } from 'vue'
import emitter from './EventBus'
import { DrawerProps } from 'element-plus'
import CreatePipelineVue from './CreatePipeline.vue'
import CreateNode from './CreateNode.vue'

const procDetail = ref({})
const procId = ref()
const procName = ref('')
const procType = ref('python')
const show_upload_file = ref(false)
const show_upload_git = ref(false)
var tableData = ref([])
const nowVersionList = ref<Set<String>>()
const drawer_direction = ref<DrawerProps['direction']>('rtl')
const createPipeline = ref(false)
const show_task_vue = ref(false)
const pipeline_id = ref(0)
const pipeline_info = ref()
const clicked_task_info = ref()
const taskType = ref()

emitter.on('success_upload_processor', (data) => {
    show_upload_file.value = false
    show_upload_git.value = false
    loadAllData()
})

const props = defineProps({
    processor_info: Map,
});

const showPipeline = (row) => {
    axios
        .post('/pipeline/get_pipeline_detail/', qs.stringify({
            'pipe_id': row.pipeline_id,
        }))
        .then(response => {
            pipeline_info.value = response.data
            if (response.data.email_to != "") {
                pipeline_info.value.monitor_way |= 1
            }

            if (response.data.sms_to != "") {
                pipeline_info.value.monitor_way |= 2
            }

            createPipeline.value = true;
        })
        .catch(error => {
            console.log(error)
            emitter.emit('update_graph', "-1");
        })
}

const showTask = (row) => {
        axios
        .get('/pipeline/get_task_detail/' + row.task_id + "/", {
            params: {
            }
        })
        .then(response => {
            pipeline_id.value = row.pipeline_id
            clicked_task_info.value = response.data
            show_task_vue.value = true;
            taskType.value = response.data.processor.type
            console.log(response.data)
        })
        .catch(error => console.log(error))
}

const loadAllData = () => {
    axios
        .post('processor/view_quote/' + procDetail.value.processor.id + "/", qs.stringify({
        }))
        .then(response => {
            if (response.status != 200 || response.data.status != 0) {
            } else {
                tableData.value = []
                nowVersionList.value = new Set<String>()
                for (const history of response.data.quote_list) {
                    var type_name = '';
                    var type = history.type;
                    if (type == 0) {
                        type_name = 'zip';
                    } else if (type == 1) {
                        type_name = 'git';
                    } else if (type == 2) {
                        type_name = 'docker';
                    } else {
                        type_name = 'zip';
                    }
                    history.type = type_name
                    tableData.value.push(history)
                    nowVersionList.value?.add(history.version)
                }

                console.log("get init versions: ", nowVersionList.value)
            }
        })
        .catch(error => {
            console.log(error)
        })
}

onMounted(() => {
    if (props.processor_info) {
        procDetail.value = props.processor_info
        update_processor(procDetail.value)
    }
});

const update_processor = (proc_info) => {
    if (!proc_info || !proc_info.proc_detail || !proc_info.proc_detail.processor) {
        return;
    }

    if (proc_info.proc_detail.processor.type == 5) {
        procType.value = 'shell'
    } else if (proc_info.proc_detail.processor.type == 6) {
        procType.value = 'docker'
    } else if (proc_info.proc_detail.processor.type == 7) {
        procType.value = 'ClickhouseSQL'
    }

    console.log("version list processor info coming: ", proc_info)
    procDetail.value = proc_info.proc_detail
    procName.value = proc_info.proc_detail.processor.name
    procId.value = proc_info.proc_detail.processor.id
    loadAllData()
}

emitter.on('upate_processor_to_show_detail', (proc_info) => {
    update_processor(proc_info)
})

</script>

<style scoped></style>
