<template>
    <el-input class="esponsive-input" v-model="query" placeholder="Please enter keyword" @input="onQueryChanged"
        :prefix-icon="Search" />

    <div :class="{ appContainerDark: isDark, appContainerLight: !isDark }" style="min-height: 77.2vh;">
        <div class="tree-container" ref="treeContainerRef">
            <el-tree-v2 ref="treeRef" :data="data" :props="props" :height="treeHeight" :filter-method="filterMethod"
                :expand-on-click-node="false" @node-expand="handleNodeExpand" @node-click="handleNodeClick"
                node-key="id">

                <template #default="{ node }">
                    <div v-if="node.data.valid" class="custom-tree-node">
                        <div v-if="node.data.is_project" style="margin-top: 0px;">
                            <h4>{{ node.label }}</h4>
                        </div>
                        <div v-else style="margin-top: 0px;">
                            <el-icon :size="18" style="padding:4px" color="var(--el-color-primary)">
                                <TrendCharts />
                            </el-icon>
                            <el-link style="margin-bottom: 10px;">{{ node.label }}</el-link>
                        </div>
                        <div v-if="node.data.is_project">
                            <span class="node-buttons">
                                <el-button-group class="ml-4">
                                    <el-tooltip class="box-item" effect="dark" content="点击新建文件夹！">
                                        <el-button type="info" size="small" :icon="Folder" />
                                    </el-tooltip>
                                    <el-tooltip class="box-item" effect="dark" content="点击新建流程！">
                                        <el-button type="success" size="small" :icon="Plus"
                                            @click="appendNode(node.data.id, null)" />
                                    </el-tooltip>
                                    <el-tooltip class="box-item" effect="dark" content="编辑分类">
                                        <el-button type="primary" size="small" :icon="Edit" />
                                    </el-tooltip>
                                    <el-tooltip class="box-item" effect="dark" content="删除分类">
                                        <el-button type="warning" size="small" :icon="Delete" />
                                    </el-tooltip>
                                </el-button-group>
                            </span>
                        </div>
                        <div v-else>
                            <span class="node-buttons">
                                <el-button-group class="ml-4">
                                    <el-tooltip class="box-item" effect="dark" content="点击编辑流程信息！">
                                        <el-button type="primary" size="small" :icon="Edit" />
                                    </el-tooltip>
                                    <el-tooltip class="box-item" effect="dark" content="点击删除流程！">
                                        <el-button type="warning" size="small" :icon="Delete" />
                                    </el-tooltip>
                                </el-button-group>
                            </span>
                        </div>
                    </div>
                </template>
            </el-tree-v2>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Plus, Edit, Delete, Search, Folder, TrendCharts } from '@element-plus/icons-vue'
import { useCssVar } from '@vueuse/core'
import type { TreeNodeData, TreeV2Instance } from 'element-plus'
import { useDark, useToggle } from "@vueuse/core";
import axios from 'axios';
import { Label } from '@antv/g6';
import { isLeaf } from 'element-plus/es/utils/index.mjs';
import { resolve } from '@antv/x6/lib/registry/node-anchor/util';
import qs from 'qs';

import emitter from './EventBus.ts';



const isDark = useDark();

interface Tree {
    id: string
    label: string
    valid: boolean
    is_project: boolean
    children?: Tree[]
}

const props = {
    id: 'id',
    label: 'label',
    is_project: 'is_project',
    children: 'children',
    valid: 'valid',
}
const data = ref<Tree[]>([
])

const handleNodeExpand = (nodeData, nodeInstance) => {
    axios
        .get('http://82.156.224.174:7001/pipeline/get_project_tree_async/', {
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

const handleNodeClick = (nodeData, nodeInstance) => {
    const str_id = "" + nodeData.id;
    console.log(str_id, str_id.split("-")[1], str_id.split("-").length)
    if (str_id.split("-").length != 2) {
        emitter.emit('update_graph', "-1");
        emitter.emit('show_update_graph', "-1");
        return;
    }

    // axios
    //     .post('http://82.156.224.174:7001/pipeline/get_pipeline_detail/', qs.stringify({
    //         'pipe_id': nodeData.id.split("-")[1],
    //     }))
    //     .then(response => {
    //     })
    //     .catch(error => {
    //         console.log(error)
    //         emitter.emit('update_graph', "-1");
    //     })

    console.log("11111:", str_id, str_id.split("-")[1], str_id.split("-").length)
    axios
        .post('http://82.156.224.174:7001/pipeline/get_tasks/', qs.stringify({
            'pipeline_id': str_id.split("-")[1],
        }))
        .then(response => {
            // 正确: 载荷类型与定义匹配
            emitter.emit('show_update_graph', "1");
            emitter.emit('update_graph', response.data);
        })
        .catch(error => {
            console.log(error)
            emitter.emit('update_graph', "-1");
            emitter.emit('show_update_graph', "-1");
        })
}

const GetProjectsAndPipelines = () => {
    // axios.interceptors.request.use(config => {
    //     const token = localStorage.getItem('access_token')
    //     if (token) {
    //         config.headers.Authorization = `Bearer ${token}`
    //     }
    //     return config
    // })
    axios
        .get('http://82.156.224.174:7001/pipeline/get_project_tree_async/', {
            params: {
            }
        })
        .then(response => {
            console.log(response)
            // var json_obj = JSON.parse(response)
            for (const item of response.data) {
                appendNode(-1, item);
            }
        })
        .catch(error => console.log(error))
}

const treeContainerRef = ref(null);
const treeHeight = ref(0);

let resizeObserver = null;

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

    GetProjectsAndPipelines();
});

onBeforeUnmount(() => {
    if (resizeObserver && treeContainerRef.value) {
        resizeObserver.unobserve(treeContainerRef.value);
    }
});


const query = ref('')
const treeRef = ref()
const onQueryChanged = (query: string) => {
    treeRef.value!.filter(query)
}
const filterMethod = (query: string, node: TreeNodeData) =>
    node.label!.includes(query)


let id = 1000

const findNode = (id, nodes) => {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.id === id) {
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
    //     console.log(item["id"])
    // console.log(item["text"])
    // console.log(item["state"])
    // console.log(item["is_project"])
    if (item == null) {
        item = { "id": id++, "text": "test", is_project: false }
    }

    const newChild = {
        id: item["id"],
        label: item["text"],
        is_project: item["is_project"],
        children: [],
        valid: true,
    }

    if (item["is_project"]) {
        newChild.children.push({
            id: -1,
            valid: false,
            label: "",
            is_project: false,
            children: [],
        })
    }

    var parentNode = null;
    if (parentId == -1) {
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
            // const node = treeRef.value.getNode(parentNode.id)
            // treeRef.value.expandNode(node);
            data.value = [...data.value]
        }
    }

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