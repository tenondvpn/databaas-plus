<template>
    <el-input class="esponsive-input" v-model="query" placeholder="Please enter keyword" @input="onQueryChanged"
        :prefix-icon="Search" />

    <div :class="{ appContainerDark: isDark, appContainerLight: !isDark }" style="min-height: 77.2vh;">
        <div class="tree-container" ref="treeContainerRef">
            <el-tree-v2 ref="treeRef" :data="data" :props="props" :height="treeHeight" :filter-method="filterMethod"
                :expand-on-click-node="false" @node-expand="handleNodeExpand" @node-click="handleNodeClick"
                :highlight-current="true" node-key="id">

                <template #default="{ node }">
                    <div v-if="node.data.valid" class="custom-tree-node">
                        <div v-if="node.data.is_project" style="margin-top: 0px;">
                            <el-icon v-if="!node.expanded" :size="18" style="padding:4px"
                                color="var(--el-color-primary)">
                                <Fold />
                            </el-icon>
                            <el-icon v-else :size="18" style="padding:4px" color="var(--el-color-info)">
                                <Expand />
                            </el-icon>
                            <el-link style="margin-bottom: 10px;">{{ node.label }}</el-link>
                        </div>
                        <div v-else style="margin-top: 0px;">
                            <el-icon :size="16" style="padding:4px" color="var(--el-color-primary)">
                                <SqlIcon v-if="node.data.type == 5" src="/images/shell.png" />
                                <SqlIcon v-else-if="node.data.type == 6" src="/images/docker.png" />
                                <SqlIcon v-else-if="node.data.type == 7" src="/images/ck.png" />
                                <SqlIcon v-else src="/images/python.png" />
                            </el-icon>
                            <el-link style="margin-bottom: 10px;">{{ node.label }}</el-link>
                        </div>
                        <div v-if="node.data.is_project">
                            <span class="node-buttons">
                                <el-button-group class="ml-4">
                                    <el-tooltip class="box-item" effect="dark" content="点击新建文件夹！">
                                        <el-button type="info" size="small" :icon="Folder"
                                            @click="callCreateProject(node)" />
                                    </el-tooltip>
                                    <el-tooltip class="box-item" effect="dark" content="点击新建插件！">
                                        <el-button type="success" size="small" :icon="Plus"
                                            @click="updateProcessorClicked(node)" />
                                    </el-tooltip>
                                    <el-tooltip v-if="node.label != '我创建的'" class="box-item" effect="dark"
                                        content="编辑分类">
                                        <el-button type="primary" size="small" :icon="Edit"
                                            @click="callUpdateProject(node)" />
                                    </el-tooltip>
                                    <el-tooltip v-if="node.label != '我创建的'" class="box-item" effect="dark"
                                        content="删除分类">
                                        <el-button type="warning" size="small" :icon="Delete"
                                            @click="deleteProject(node)" />
                                    </el-tooltip>
                                </el-button-group>
                            </span>
                        </div>
                        <div v-else>
                            <span class="node-buttons">
                                <el-button-group class="ml-4">
                                    <el-tooltip class="box-item" effect="dark" content="点击编辑插件信息！">
                                        <el-button type="primary" @click="updateProcessorClicked(node)" size="small"
                                            :icon="Edit" />
                                    </el-tooltip>
                                    <el-tooltip class="box-item" effect="dark" content="点击删除插件！">
                                        <el-button type="warning" size="small" :icon="Delete"
                                            @click="clickDeleteProcessor(node)" />
                                    </el-tooltip>
                                </el-button-group>
                            </span>
                        </div>
                    </div>
                </template>
            </el-tree-v2>
        </div>
    </div>

    <el-drawer v-model="createProcessor" :direction="drawer_direction" size="55%" :destroy-on-close="true">
        <template #header>
            <h4>{{ openProcessorModelTitle }}</h4>
        </template>
        <template #default>
            <CreateProcessor :processor_info="selectedProcessor" />
        </template>
    </el-drawer>

    <el-drawer v-model="createProject" :direction="drawer_direction" size="50%" :destroy-on-close="true">
        <template #header>
            <h4>创建项目文件夹</h4>
        </template>
        <template #default>
            <CreateFolder :current_folder_info="selectedProject" />
        </template>
    </el-drawer>

    <el-drawer v-model="updateProject" :direction="drawer_direction" size="50%" :destroy-on-close="true">
        <template #header>
            <h4>修改项目文件夹</h4>
        </template>
        <template #default>
            <UpdateFolder :current_folder_info="selectedProject" />
        </template>
    </el-drawer>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, h } from 'vue';
import { Plus, Edit, Delete, Search, Folder, Tools, Fold, Expand } from '@element-plus/icons-vue'
import type { TreeNodeData } from 'element-plus'
import { useDark } from "@vueuse/core";
import axios from 'axios';
import qs from 'qs';

import emitter from './EventBus.ts';
import { DrawerProps } from 'element-plus';
import CreateProcessor from './CreateProcessor.vue'
import CreateFolder from './CreateFolder.vue'
import UpdateFolder from './UpdateFolder.vue'
import { ElMessageBox } from 'element-plus';
import { ElMessage } from 'element-plus';
import SqlIcon from './sqlIcon.vue';

const createProcessor = ref(false)
const drawer_direction = ref<DrawerProps['direction']>('rtl')
const treeContainerRef = ref(null);
const treeHeight = ref(0);
let resizeObserver = null;
const query = ref('')
const treeRef = ref()
const project_path = ref('我的项目')
const project_id = ref('1')
const openProcessorModelTitle = ref("创建流程")
const pipeline_detail = ref({})
const selectedProcessorValue = {
    "status": 1,
    "msg": "",
    "processor": {
        "id": 0,
        "name": "",
        "type": 1,
        "template": "",
        "update_time": "",
        "description": "",
        "config": "",
        "input_config": "",
        "output_config": "",
        "owner_id": 1,
        "private": 1,
        "tag": "blockchain",
        "tpl_files": "",
        "user_list": "",
        "userid_list": ""
    },
    "type_str": "",
    "private_str": "",
    "is_owner": 0,
    "config_str": "",
    "input_config": "",
    "output_config": "",
    "is_super": true,
    "owner_name": "",
    "page_title": "",
    "pipeline_model": 1,
    "page_index": 0
}
const selectedProcessor = ref(structuredClone(selectedProcessorValue))
const selectedProject = ref({})
const createProject = ref(false)
const updateProject = ref(false)

const isDark = useDark();

emitter.on('create_folder', (data) => {
    axios
        .post('/processor/add_new_project/', qs.stringify({
            'project_name': data.name,
            'description': '',
            'parent_id': data.cur_id,
            'type': 1,
        })).then(response => {
            if (response.data.status != 0) {
                ElMessage({
                    type: 'error',
                    message: '创建项目文件夹失败：' + response.data.msg,
                })
            } else {
                createProject.value = false

                data["id"] = response.data.id
                data["text"] = data.name
                data["is_project"] = true
                data["pipe_id"] = 0
                var pid = data["cur_id"]
                if (pid == 0) {
                    pid = -1
                }
                if (data['type'] == 0) {
                    // 子目录
                    appendNode(data["selected_id"], data)
                } else {
                    // 平级目录
                    appendNode(pid, data)
                }
                ElMessage({
                    type: 'success',
                    message: '创建项目文件夹成功！',
                })
            }
        })
        .catch(error => {
            ElMessage({
                type: 'error',
                message: '创建项目文件夹失败：' + error,
            })
        })
})

emitter.on('update_folder', (node_data) => {
    axios
        .post('/pipeline/update_project/', qs.stringify({
            'project_name': node_data.name,
            'description': '',
            'id': node_data.cur_id,
        })).then(response => {
            if (response.data.status != 0) {
                ElMessage({
                    type: 'error',
                    message: '修改项目文件夹失败：' + response.data.msg,
                })
            } else {
                updateProject.value = false

                const node = treeRef.value.getNode(node_data.cur_id);
                if (node) {
                    console.log("upate project name: ", node, node.label)
                    node.label = node_data.name;
                    var tmp_node = findNode(node_data.cur_id, data.value)
                    tmp_node.label = node_data.name
                    console.log("upate project name: ", node, node.label)
                    data.value = [...data.value]
                }

                ElMessage({
                    type: 'success',
                    message: '修改项目文件夹成功！',
                })
            }
        })
        .catch(error => {
            ElMessage({
                type: 'error',
                message: '修改项目文件夹失败：' + error,
            })
        })
})

emitter.on("success_update_pipeline", (payload) => {
    createProcessor.value = false;
});

emitter.on('home_view_click_create_pipeline', (payload) => {
    selectedProcessor.value = structuredClone(selectedProcessorValue)
    selectedProcessor.value.project_id = payload
    console.log("selectedProcessor.value.project_id: ", selectedProcessor.value.project_id)
    createProcessor.value = true;
});

emitter.on("graph_call_delete_pipeline", (key) => {
    // var node = findNode(key, data.value);
    const node = treeRef.value.getNode(key)
    console.log(node)
    clickDeleteProcessor(node)
});

emitter.on('click_show_pipeline', (key) => {
    openProcessorModelTitle.value = "修改流程"
    axios
        .post('/pipeline/get_pipeline_detail/', qs.stringify({
            'pipe_id': key.split("_")[1],
        }))
        .then(response => {
            selectedProcessor.value = response.data
            if (response.data.email_to != "") {
                selectedProcessor.value.monitor_way |= 1
            }

            if (response.data.sms_to != "") {
                selectedProcessor.value.monitor_way |= 2
            }

            const str_id = "" + key;

            console.log(str_id, key, str_id.split("_").length)
            project_id.value = str_id
            createProcessor.value = true;
        })
        .catch(error => {
            console.log(error)
            emitter.emit('update_graph', "-1");
        })
})

emitter.on('create_processor_success', (data) => {
    console.log(data)
    var prco_data = data['proc_detail']['processor']
    appendNode(prco_data['project_id'], prco_data)
    createProcessor.value = false;
    handleNodeClick({ "id": prco_data["id"] }, null)
})

emitter.on('update_processor_success', (data) => {
    createProcessor.value = false;
    console.log('update_processor_success', data)
    handleNodeClick({ "id": data["id"] }, null)
})

emitter.on('click_upadate_processor', (data) => {
    var node_data = {
        "id": data.processor.project_id + "_" + data.processor.id,
        "label": data.processor.name,
        "key": data.processor.project_id + "_" + data.processor.id,
        "parent": data.parent
    }
    console.log("click_upadate_processor", data)
    updateProcessorClicked(node_data, null)
})

emitter.on('click_delete_processor', (data) => {
    console.log("click_delete_processor", data)
    var node_data = {
        "id": data.processor.project_id + "_" + data.processor.id,
        "label": data.processor.name,
        "key": data.processor.project_id + "_" + data.processor.id,
        'parent': {
            'key': data.processor.project_id
        }
    }
    clickDeleteProcessor(node_data)
})

emitter.on('home_view_click_create_processor', (data) => {
    var key = data.processor.project_id
    if (data.processor.id > 0) {
        key = data.processor.project_id + "_" + data.processor.id
    }

    var node_data = {
        "id": key,
        "label": data.processor.name,
        "key": key,
        'parent': {
            'key': data.processor.project_id
        }
    }
    updateProcessorClicked(node_data)
})

interface Tree {
    id: string
    label: string
    valid: boolean
    is_project: boolean
    type: number
    children?: Tree[]
}

const props = {
    id: 'id',
    label: 'label',
    is_project: 'is_project',
    children: 'children',
    type: 0,
    valid: 'valid',
}
const data = ref<Tree[]>([
])

const callUpdateProject = (node) => {
    var path = node.label
    var parent_id = 0
    if (node.parent) {
        path = node.parent.label + "/" + path
        parent_id = node.parent.key
    }

    selectedProject.value = {
        "path": path,
        "id": node.data.id,
        "parent_id": parent_id,
    }
    updateProject.value = true
}

const deleteProject = (node) => {
    ElMessageBox({
        title: '删除项目文件夹',
        message: h('p', null, [
            h('span', null, '确定要删除项目文件夹吗? 项目文件夹名： '),
            h('i', { style: 'color: red' }, node.label),
        ]),
        showCancelButton: true,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
                instance.confirmButtonLoading = true
                instance.confirmButtonText = '正在删除...'
                axios
                    .post('/processor/delete_project/', qs.stringify({
                        'project_id': node.data.id,
                    }))
                    .then(response => {
                        if (response.data.status != 0) {
                            ElMessage({
                                type: 'danger',
                                message: "项目文件夹删除失败：" + response.data.msg,
                            })
                        } else {
                            ElMessage({
                                type: 'success',
                                message: "项目文件夹删除成功！",
                            })
                            handleDelete(node)
                        }

                        done()
                        instance.confirmButtonLoading = false
                    })
                    .catch(error => {
                        ElMessage({
                            type: 'danger',
                            message: "项目文件夹删除失败：" + error,
                        })
                    })
            } else {
                done()
            }
        },
    }).then((action) => {
    })
}

const callCreateProject = (node) => {
    var path = node.label
    var parent_id = 0
    if (node.parent) {
        path = node.parent.label + "/" + path
        parent_id = node.parent.key
    }

    selectedProject.value = {
        "path": path,
        "id": node.data.id,
        "parent_id": parent_id,
    }
    createProject.value = true
}

const handleNodeExpand = async (nodeData, nodeInstance) => {
    await axios
        .get('/processor/get_processor_tree_async/', {
            params: {
                "id": nodeData.id
            }
        })
        .then(response => {
            var parentNode = findNode(nodeData.id, data.value)
            if (parentNode) {
                parentNode.children = []
            }

            // var json_obj = JSON.parse(response)
            for (const item of response.data) {
                appendNode(nodeData.id, item);
            }
        })
        .catch(error => console.log(error))
}

const updateProcessorClicked = (nodeData) => {
    openProcessorModelTitle.value = "创建插件"
    selectedProcessor.value = structuredClone(selectedProcessorValue);
    console.log("ttttt:", nodeData.key)
    var str_key = "" + nodeData.key
    selectedProcessor.value.project_id = nodeData.key
    if (str_key.split("_").length != 2) {
        selectedProcessor.value.project_path = nodeData.label
        console.log('call create processor: ', selectedProcessor.value)
        createProcessor.value = true;
        project_path.value = nodeData.label
        var parent_node = nodeData.parent
        while (parent_node) {
            project_path.value = parent_node.label + "/" + project_path.value
            parent_node = parent_node.parent
        }

        console.log(project_path.value)
        return;
    }

    openProcessorModelTitle.value = "修改插件"
    axios
        .post('/processor/get_processor/', qs.stringify({
            'id': nodeData.key.split("_")[1],
        }))
        .then(response => {
            selectedProcessor.value = response.data
            selectedProcessor.value.project_path = nodeData.parent.label
            selectedProcessor.value.project_id = response.data.processor.id
            createProcessor.value = true;
            const str_id = "" + nodeData.key;

            console.log(str_id, nodeData, str_id.split("_").length)
            project_id.value = str_id
            var newUrl = window.location.origin + "/processor?id=" + response.data.processor.id
            history.pushState('', '', newUrl);
            console.log('history: ', newUrl)
        })
        .catch(error => {
            console.log(error)
            emitter.emit('update_graph', "-1");
        })

}

const handleDelete = (node) => {
    var parentNode = null;
    if (node.parent) {
        console.log("now delete node: ", node.parent.key)
        parentNode = findNode(node.parent.key, data.value)
    }

    if (parentNode) {
        // 从父节点的 children 数组中移除该节点
        const index = parentNode.children.findIndex(child => child.id === node.key);
        console.log("found parent now delete node: ", index)
        if (index !== -1) {
            parentNode.children.splice(index, 1);
        }
    } else {
        // 如果没有父节点，说明是根节点
        // 根节点的删除逻辑
        const index = data.value.findIndex(item => item.id === node.key);
        console.log("not found parent now delete node: ", index)
        if (index !== -1) {
            data.value.splice(index, 1);
        }
    }

    data.value = [...data.value]
    console.log("delete key: ", node.key)
    var node_key = "" + node.key
    if (node_key.split('_').length == 2) {
        emitter.emit('success_delete_pipeline', node_key)
    }
};

const clickDeleteProcessor = (nodeData) => {
    ElMessageBox({
        title: '删除插件',
        message: h('p', null, [
            h('span', null, '确定要删除插件吗? 插件名： '),
            h('i', { style: 'color: blue' }, nodeData.label),
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
                    .post('/processor/delete/' + nodeData.key.split('_')[1] + '/', {
                    })
                    .then(response => {
                        console.log('success delete pipeline.', nodeData.key)
                        emitter.emit('delete_processor_success', nodeData.key)
                        handleDelete(nodeData)
                        done()
                        instance.confirmButtonLoading = false
                    })
                    .catch(error => {
                        done()
                        ElMessage({
                            type: 'danger',
                            message: "插件删除失败：" + error,
                        })
                    })
            } else {
                done()
            }
        },
    }).then((action) => {
        ElMessage({
            type: 'success',
            message: "插件删除成功！",
        })
    })
}

emitter.on("share_processor_success", (data) => {
    handleDelete({
        "key": data["old_project_id"] + "_" + data["id"],
        "parent": {
            "key": data["old_project_id"]
        }
    })

    appendNode(data["project_id"], {
        "id": data["old_project_id"] + "_" + data["id"],
        "text": data["name"],
        "is_project": false,
        "type": data["type"]
    })
})

const handleNodeClick = (nodeData, nodeInstance) => {
    const str_id = "" + nodeData.id;
    selectedProcessor.value = structuredClone(selectedProcessorValue)
    console.log(str_id, str_id.split("_")[1], str_id.split("_").length)
    project_id.value = str_id
    if (nodeInstance && nodeInstance.parent) {
        project_path.value = ""
        var parent_node = nodeInstance.parent
        while (parent_node) {
            project_path.value = "/" + parent_node.label + project_path.value
            parent_node = parent_node.parent
        }
    }

    if (nodeData.parent) {
        project_path.value = nodeData.parent.label
    }

    if (str_id.split("_").length != 2) {
        project_path.value += "/" + nodeData.label
        emitter.emit('upate_processor_to_show_detail', { "tag": "-1", "project_path": project_path.value, 'project_id': nodeData.id });
        return;
    }

    axios
        .post('/processor/get_processor/', qs.stringify({
            'id': nodeData.id.split("_")[1],
        }))
        .then(response => {
            if (response.data.status != 0) {
                ElMessage({
                    type: 'danger',
                    message: "获取插件详情失败：" + response.data.msg,
                })
                return;
            }

            var newUrl = window.location.origin + "/processor?id=" + response.data.processor.id
            history.pushState('', '', newUrl);
            console.log('history: ', newUrl)

            emitter.emit('upate_processor_to_show_detail', { "tag": "0", "project_path": project_path.value, 'proc_detail': response.data });
            console.log('upate_processor_to_show_detail get tasks 1', project_path.value, response.data)
        })
        .catch(error => {
            ElMessage({
                type: 'danger',
                message: "获取插件详情失败：" + error,
            })
        })
}

const GetProjectsAndProcessors = async () => {
    // axios.interceptors.request.use(config => {
    //     const token = localStorage.getItem('access_token')
    //     if (token) {
    //         config.headers.Authorization = `Bearer ${token}`
    //     }
    //     return config
    // })
    await axios
        .get('/processor/get_processor_tree_async/', {
            params: {
            }
        })
        .then(response => {
            console.log(response)
            // var json_obj = JSON.parse(response)
            for (const item of response.data) {
                appendNode(-2, item);
            }

            // handleNodeExpand({"id": -1}, null)

        })
        .catch(error => console.log(error))
    treeRef.value.expandNode(treeRef.value.getNode(-1))
    const params = new URLSearchParams(window.location.search);
    const value = params.get('id');
    if (value) {
        handleNodeClick({ "id": '-1_' + value }, null)

    }
}

onMounted(() => {
    if (treeContainerRef.value) {
        treeHeight.value = treeContainerRef.value.clientHeight;
    }

    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (entry.target === treeContainerRef.value) {
                treeHeight.value = entry.contentRect.height;
            }
        }
    });

    if (treeContainerRef.value) {
        resizeObserver.observe(treeContainerRef.value);
    }

    GetProjectsAndProcessors();
});

onBeforeUnmount(() => {
    if (resizeObserver && treeContainerRef.value) {
        resizeObserver.unobserve(treeContainerRef.value);
    }
});


const onQueryChanged = (query: string) => {
    treeRef.value!.filter(query)
}
const filterMethod = (query: string, node: TreeNodeData) =>
    node.label!.includes(query)

const findNode = (id, nodes) => {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (("" + node.id) === ("" + id)) {
            return node
        }
        if (node.children) {
            const found = findNode(id, node.children)
            if (found) {
                return found
            }
        }
    }
    return null
}

// 新增节点的方法
const appendNode = (parentId, item) => {
    if (item == null) {
        return;
    }

    const newChild = {
        id: item["id"],
        label: item["text"],
        is_project: item["is_project"],
        children: [],
        valid: true,
        type: item['type'],
    }

    if (item["is_project"]) {
        newChild.children.push({
            id: -1,
            valid: false,
            label: "",
            is_project: false,
            type: 0,
            children: [],
        })
    }

    var parentNode = null;
    if (parentId == -2) {
        data.value.push(newChild)
        data.value = [...data.value]
    } else {
        parentNode = findNode(parentId, data.value)
        if (parentNode) {
            if (!parentNode.children) {
                parentNode.children = []
            }

            if (parentNode.children.length == 1 && parentNode.children[0].id == -1) {
                parentNode.children = []
            }

            parentNode.children.push(newChild)
            data.value = [...data.value]
            if (treeRef.value) {
                treeRef.value.setCurrentKey(newChild.id);
            }
        }
    }

    emitter.emit('update_graph', { "tag": "0", 'project_id': parentId, "project_path": project_path.value, "data": newChild });
}

</script>

<style>
.appContainerDark {
    height: 500px;
    /* 假设一个父容器的高度 */
    padding: 20px;
    border: 1px solid #4c4d4f;
}

.appContainerLight {
    height: 500px;
    /* 假设一个父容器的高度 */
    padding: 20px;
    border: 1px solid #dddfe6;
}

.tree-container {
    width: 100%;
    height: 100%;
}

.prefix {
    color: var(--el-color-primary);
    margin-right: 10px;
}

.prefix.is-leaf {
    color: var(--el-color-success);
}

.custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;
}

.node-buttons {
    /* 默认隐藏按钮 */
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
}

/* 关键：当鼠标悬停在整个节点容器上时，显示按钮 */
.custom-tree-node:hover .node-buttons {
    opacity: 1;
}

.responsive-input {
    width: 240px;
}

@media (max-width: 768px) {
    .input-container {
        flex-direction: column;
        gap: 1rem;
    }

    .responsive-input {
        width: 100%;
    }
}
</style>