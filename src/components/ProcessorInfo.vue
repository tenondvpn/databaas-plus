<template>
    <el-scrollbar style="height: 90vh">
        <el-badge class="item" style="float: left;" :value="procType" type="primary">
            <el-text style="font-size: 24px;">{{ procName }}</el-text>

        </el-badge>
        <el-button-group class="ml-4" style="float: right;margin-top: 0px;margin-top: 10px;">
                <el-button plain type="primary" @click="clickDeleteProcessor" :icon="Delete">删除插件</el-button>
                <el-button plain type="primary" @click="clickUpdateProcessor" :icon="Edit">修改插件</el-button>
                </el-button-group>
        <el-divider style="float: right;" />

        <el-descriptions label-width=150 class="margin-top" :column="2" size="large" border>
            <template #extra>
        
            </template>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <el-icon :style="iconStyle">
                            <user />
                        </el-icon>
                        创建者
                    </div>
                </template>
                <el-tag size="large" type="info">
                    {{ procOwnerName }}
                </el-tag>
            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <el-icon :style="iconStyle">
                            <iphone />
                        </el-icon>
                        标签
                    </div>
                </template>
                <el-text line-clamp="20">
                    <el-tag v-for="tag in tags" size="large" type="primary" style="margin-left: 3px;">{{ tag }}</el-tag>
                </el-text>

            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <el-icon :style="iconStyle">
                            <location />
                        </el-icon>
                        属性
                    </div>
                </template>
                <div v-if="isPrivate == 1"><el-tag type="warning" style="margin-left: 3px;">私有</el-tag>
                    <el-tooltip class="box-item" effect="dark" content="点击开放共享插件，所有人可见可用！">
                        <el-button size="small" :icon="Share" circle style="border: 0px;" @click="shareProcessor" />
                    </el-tooltip>
                </div>
                <div v-else><el-tag type="warning" style="margin-left: 3px;">已开放</el-tag>
                    <el-tooltip class="box-item" effect="dark" content="点击回收共享插件，其他人不可用！">
                        <el-button size="small" :icon="SwitchButton" circle style="border: 0px;"
                            @click="shareProcessor" />
                    </el-tooltip>
                </div>
            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <el-icon :style="iconStyle">
                            <tickets />
                        </el-icon>
                        更新时间
                    </div>
                </template>
                <el-text size="">{{ updateTime }}</el-text>
            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <el-icon :style="iconStyle">
                            <office-building />
                        </el-icon>
                        使用人
                    </div>
                </template>
                <el-tag v-for="user in userList" size="" type="success" style="margin-left: 3px;">{{ user }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <el-icon :style="iconStyle">
                            <office-building />
                        </el-icon>
                        描述
                    </div>
                </template>
                <el-text type="" size="">{{ description }}</el-text>

            </el-descriptions-item>

        </el-descriptions>

        <el-divider />


        <el-table border :data="tableData" min-height="200" height="100%" style="width: 100%">
            <el-table-column prop="name" label="参数名" width="280" header-align="center" align="left" />
            <el-table-column prop="default" label="参数默认值" width="280" header-align="center" align="left" />
            <el-table-column prop="desc" label="参数说明" header-align="center" align="left" />
            <template #empty>
                <div class="flex items-center justify-center h-100%">
                    <el-empty />
                </div>
            </template>
        </el-table>
    </el-scrollbar>
    <el-drawer v-model="share_processor" :direction="drawer_direction" size="50%" :destroy-on-close="true">
        <template #header>
            <h4 v-if="isPrivate == 1">发布插件</h4>
            <h4 v-else>取消共享</h4>
        </template>
        <template #default>
            <ShareProcessor :processor_id="processor_id" :old_project_id="project_id" :name="procName"
                :type="procTypeId" :is_private="isPrivate" />
        </template>
    </el-drawer>
</template>

<script setup lang="ts">

import { computed, ref, onMounted, h } from 'vue'
import {
    Iphone,
    Location,
    OfficeBuilding,
    Tickets,
    User,
    Share,
    SwitchButton,
    Edit, Delete
} from '@element-plus/icons-vue'
import emitter from './EventBus'
import ShareProcessor from './ShareProcessor.vue'
import { ElMessageBox } from 'element-plus'
import axios from 'axios'
import qs from 'qs'
import { ElMessage } from 'element-plus'

const procDetail = ref({})
const procName = ref('')
const procOwnerName = ref('')
const userList = ref('')
const tags = ref('')
const isPrivate = ref(1)
const updateTime = ref('')
const description = ref('')
const procType = ref('python')
const procTypeId = ref(1)
var tableData = ref([])
const share_processor = ref(false)
const processor_id = ref(-1)
const project_id = ref(-1)

const props = defineProps({
    processor_info: Map,
});

onMounted(() => {
    update_processor(props.processor_info)
});

emitter.on("share_processor_success", (data) => {
    if (isPrivate.value == 1) {
        isPrivate.value = 0
    } else {
        isPrivate.value = 1
    }

    share_processor.value = false
    project_id.value = data["project_id"]
})

const clickUpdateProcessor = () => {
    console.log('clickUpdateProcessor', procDetail.value)
    emitter.emit("click_upadate_processor", procDetail.value)
}

const clickDeleteProcessor = () => {
    emitter.emit("click_delete_processor", procDetail.value)
}

const shareProcessor = () => {
    share_processor.value = true
}

const toPrivate = () => {
    ElMessageBox({
        title: '取消共享',
        message: h('p', null, [
            h('span', null, '确定要取消插件共享吗?  '),
        ]),
        showCancelButton: true,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
                instance.confirmButtonLoading = true
                instance.confirmButtonText = '正在取消...'
                ''
                axios
                    .post('/processor/public_processor/', qs.stringify({
                        "id": processor_id.value,
                    }))
                    .then(response => {
                        if (response.status != 200 || response.data.status != 0) {
                            ElMessage.warning("取消共享插件失败：" + response.data.msg)
                        } else {
                            done()
                            console.log(response.data)
                            isPrivate.value = 1
                            ElMessage.success("取消共享插件成功！")
                        }
                    })
                    .catch(error => {
                        ElMessage.error("取消共享插件失败：" + error)
                        console.log(error)
                    })
            } else {
                done()
            }
        },
    }).then((action) => {
    })
}

const update_processor = (proc_info) => {
    if (!proc_info || !proc_info.proc_detail || !proc_info.proc_detail.processor) {
        return;
    }

    processor_id.value = proc_info.proc_detail.processor.id
    project_id.value = proc_info.proc_detail.processor.project_id
    procDetail.value = proc_info.proc_detail
    procDetail.value.parent = {
        "label": proc_info["project_path"],
        "key": project_id.value
    }
    procName.value = proc_info.proc_detail.processor.name
    procOwnerName.value = proc_info.proc_detail.owner_name
    userList.value = []
    if (proc_info.proc_detail.processor.user_list != '') {
        userList.value = proc_info.proc_detail.processor.user_list.split(',')
    }

    tags.value = []
    if (proc_info.proc_detail.processor.tag != '') {
        tags.value = proc_info.proc_detail.processor.tag.split(',')
    }

    isPrivate.value = proc_info.proc_detail.processor.private
    updateTime.value = proc_info.proc_detail.processor.update_time
    description.value = proc_info.proc_detail.processor.description
    procTypeId.value = proc_info.proc_detail.processor.type
    if (proc_info.proc_detail.processor.type == 5) {
        procType.value = 'shell'
    } else if (proc_info.proc_detail.processor.type == 6) {
        procType.value = 'docker'
    } else if (proc_info.proc_detail.processor.type == 7) {
        procType.value = 'ClickhouseSQL'
    }

    tableData.value = []
    if (proc_info.proc_detail.config_str) {
        var configs = proc_info.proc_detail.config_str.split('\n')
        for (const config of configs) {
            var items = config.split('=')
            if (items[0].trim() == "") {
                continue
            }
            console.log(items)
            var right_items = items[1].split('H0')
            tableData.value.push({
                name: items[0],
                default: right_items[0],
                desc: right_items[1],
            })
        }
    }
    console.log("processor info coming: ", procDetail.value)
}
emitter.on('upate_processor_to_show_detail', (proc_info) => {
    update_processor(proc_info)
})

const iconStyle = computed(() => {
    const marginMap = {
        large: '8px',
        default: '6px',
        small: '4px',
    }
    return {
        marginRight: marginMap['large'] || marginMap.default,
    }
})

</script>

<style scoped>
.item {
    margin-top: 0px;
    margin-right: 40px;
}

.custom-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

.el-descriptions {
    margin-top: 20px;
}

.cell-item {
    display: flex;
    align-items: center;
}

.margin-top {
    margin-top: 20px;
}
</style>
