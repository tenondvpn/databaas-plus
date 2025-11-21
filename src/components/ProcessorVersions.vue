<template>
    <el-scrollbar style="height:  79vh">
        <el-badge class="item" style="float: left; margin-top: 10px;" :value="procType" type="primary">
            <el-text style="font-size: 24px;">{{ procName }}</el-text>
        </el-badge>

        <el-button-group class="ml-4" style="float: right;margin-top: 20px;">
            <el-button plain type="primary" :icon="zipIcon"
                @click="show_upload_file = true; procVersion = ''">本地zip</el-button>
            <el-button plain type="primary" :icon="InfoFilled" @click="show_upload_info = true">上传命令</el-button>
            <el-button plain type="primary" :icon="gitIcon" @click="show_upload_git = true">GIT链接</el-button>
        </el-button-group>
        <el-divider style="float: right;" />

        <el-table border :data="tableData" min-height="200" height="100%" style="width: 100%">
            <el-table-column label="上传人" width="110" header-align="center" align="center">
                <template #default="scope">
                    <el-tag type="default">{{ scope.row.upload_user_name }}</el-tag>
                </template>
            </el-table-column>

            <el-table-column label="版本号" width="120" header-align="center" align="center">
                <template #default="scope">
                    <el-tag type="primary">{{ scope.row.version }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="upload_time" width="180" label="创建时间" header-align="center" align="center" />
            <el-table-column prop="update_time" width="180" label="更新时间" header-align="center" align="left" />
            <el-table-column width="80" label="类型" header-align="center" align="center">
                <template #default="scope">
                    <el-tag type="warning">{{ scope.row.type }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" header-align="center" align="left">
                <template #default="scope">
                    <el-text v-if="scope.row.type != 'git'" type="default">{{ scope.row.description }}</el-text>
                    <el-link v-else type="primary" :href="scope.row.git_url" target="_blank"
                        underline>点击跳转github</el-link>
                </template>
            </el-table-column>
            <el-table-column align="center" label="操作">
                <template #default="scope">
                    <el-button-group class="ml-4">
                        <el-tooltip class="box-item" effect="dark" content="点击查看插件详情！">
                            <el-button v-if="scope.row.type == 'zip'" plain type="primary" size="small"
                                @click="detail(scope.row)" :icon="InfoFilled">
                            </el-button>
                        </el-tooltip>
                        <el-tooltip class="box-item" effect="dark" content="点击重新上传插件版本！">
                            <el-button plain type="primary" size="small" @click="handleEdit(scope.row)" :icon="Edit">
                            </el-button>
                        </el-tooltip>
                        <el-tooltip class="box-item" effect="dark" content="点击删除插件！">
                            <el-button plain size="small" type="danger" @click="handleDelete(scope.row)" :icon="Delete">
                            </el-button>
                        </el-tooltip>
                    </el-button-group>
                </template>
            </el-table-column>
            <template #empty>
                <div class="flex items-center justify-center h-100%">
                    <el-empty />
                </div>
            </template>
        </el-table>
    </el-scrollbar>
    <el-drawer v-model="show_upload_info" direction="rtl" size="60%" :destroy-on-close="true">
        <template #header>
            <h4>上传命令
            </h4>
        </template>
        <template #default>
            <UploadInfo :proc_name="procName" />
        </template>
    </el-drawer>
    <el-drawer v-model="show_upload_file" direction="rtl" size="50%" :destroy-on-close="true">
        <template #header>
            <h4>上传ZIP文件夹
            </h4>
        </template>
        <template #default>
            <UploadFile :proc_name="procName" :proc_id="procId" :now_versions="nowVersionList" :desc="procDesc"
                :proc_verion="procVersion" />
        </template>
    </el-drawer>
    <el-drawer v-model="show_upload_git" direction="rtl" size="50%" :destroy-on-close="true">
        <template #header>
            <h5>使用github地址库
            </h5>
        </template>
        <template #default>
            <UploadGit :proc_name="procName" :proc_id="procId" :now_versions="nowVersionList" :desc="procDesc"
                :git_url="procUrl" :proc_verion="procVersion" />
        </template>
    </el-drawer>

    <el-drawer v-model="show_detail" :direction="drawer_direction" size="80%" :destroy-on-close="true"
        :append-to-body="true">
        <template #header>
            <h4 style="width: 100px"></h4>
        </template>
        <template #default>
            <Package :processor_id="procId" :upload_id="uploadId" />
        </template>
    </el-drawer>


</template>

<script setup lang="ts">

import axios from 'axios'
import qs from 'qs'
import { ref, onMounted, h } from 'vue'
import emitter from './EventBus'
import { Edit, Delete, InfoFilled } from '@element-plus/icons-vue'
import gitIcon from './gitIcon.vue'
import zipIcon from './zipIcon.vue'
import UploadInfo from './UploadInfo.vue'
import UploadFile from './UploadFile.vue'
import UploadGit from './UploadGit.vue'
import Package from "./package.vue"
import { ElMessageBox } from 'element-plus'
import { ElMessage } from 'element-plus'
import { DrawerProps } from 'element-plus'

const procDetail = ref({})
const procId = ref()
const procName = ref('')
const procDesc = ref('')
const procVersion = ref('')
const procUrl = ref('')
const uploadId = ref()
const procType = ref('python')
const show_upload_info = ref(false)
const show_upload_file = ref(false)
const show_upload_git = ref(false)
const show_detail = ref(false)
var tableData = ref([])
const nowVersionList = ref<Set<String>>()
const drawer_direction = ref<DrawerProps['direction']>('rtl')

emitter.on('success_upload_processor', (data) => {
    show_upload_file.value = false
    show_upload_git.value = false
    loadAllData()
})

const detail = (row) => {
    show_detail.value = true
    uploadId.value = row.id
    console.log("get detail: ", procId.value, uploadId.value)
}

const handleEdit = (row) => {
    procDesc.value = row.description
    procUrl.value = row.git_url
    procVersion.value = row.version
    if (row.type == 'zip') {
        show_upload_file.value = true
    }

    if (row.type == 'auto') {
        show_upload_info.value = true
    }

    if (row.type == 'git') {
        show_upload_git.value = true
    }
}

const handleDelete = (row) => {
    console.log("row:", row)
    ElMessageBox({
        title: '删除版本',
        message: h('p', null, [
            h('span', null, '确定要删除插件版本吗? '),
        ]),
        showCancelButton: true,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
                instance.confirmButtonLoading = true
                instance.confirmButtonText = '正在删除...'
                ''
                axios
                    .post('/processor/delete_proc_version/', qs.stringify({
                        'proc_id': procId.value,
                        'id': row.id,
                    }))
                    .then(response => {
                        if (response.data.status != 0) {
                            ElMessage({
                                type: 'danger',
                                message: "删除插件版本失败：" + response.data.msg,
                            })

                            done()
                            instance.confirmButtonLoading = false
                            return
                        }
                        loadAllData()
                        ElMessage({
                            type: 'success',
                            message: "删除插件版本成功！",
                        })
                        done()
                        instance.confirmButtonLoading = false
                    })
                    .catch(error => {
                        done()
                        ElMessage({
                            type: 'danger',
                            message: "删除插件版本失败：" + error,
                        })
                    })
            } else {
                done()
            }
        },
    }).then((action) => {
    })
}

const props = defineProps({
    processor_info: Map,
});

const loadAllData = () => {
    axios
        .post('/processor/view_history/' + procDetail.value.processor.id + "/", qs.stringify({
        }))
        .then(response => {
            if (response.status != 200 || response.data.status != 0) {
            } else {
                tableData.value = []
                nowVersionList.value = new Set<String>()
                for (const history of response.data.history_list) {
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
