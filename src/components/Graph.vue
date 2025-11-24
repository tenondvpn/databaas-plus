<template>
    <div v-if="!show_history_graph">
        <el-tooltip class="box-item" effect="dark" content="基于配置参数创建新的任务！">
            <el-button class="!ml-0" plain
                @click="show_task_vue = true; update_task = false; clicked_task_info = {}; taskType = 1;" size=""
                style="margin-top: 4px; margin-left: 4px; z-index:1051;position: fixed;" :icon="Plus" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="创建shell任务！">
            <el-button class="!ml-0" plain
                @click="show_task_vue = true; update_task = false; clicked_task_info = {}; taskType = 5;" size=""
                style="margin-top: 4px; margin-left: 54px; z-index:1051;position: fixed;" :icon="DArrowRight" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="创建确权溯源数据库-SQL任务！">
            <el-button class="!ml-0" plain
                @click="show_task_vue = true; update_task = false; clicked_task_info = {}; taskType = 7;"
                style="width: 46px;margin-top: 4px; margin-left: 104px; z-index:1051;position: fixed;">
                <sqlIcon src="/images/sql.png" />
            </el-button>
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="查询修改流程详情！">
            <el-button class="!ml-0" plain @click="show_pipeline_info" size=""
                style="margin-top: 4px; margin-left: 154px; z-index:1051;position: fixed;" :icon="View" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="执行流程！">
            <el-button class="!ml-0" plain @click="run_tasks = true" size=""
                style="margin-top: 4px; margin-left: 204px; z-index:1051;position: fixed;" :icon="CaretRight" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="删除流程！">
            <el-button class="!ml-0" plain @click="DeletePipeline" size=""
                style="margin-top: 4px; margin-left: 254px; z-index:1051;position: fixed;" :icon="DeleteFilled" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="查看流程执行状态列表！">
            <el-button class="!ml-0" plain @click="show_task_status = true" size=""
                style="margin-top: 4px; margin-left: 304px; z-index:1051;position: fixed;" :icon="DataAnalysis" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="重新自动布局,生成新的流程图！">
            <el-button class="!ml-0" plain @click="relayout" size=""
                style="margin-top: 4px; margin-left: 354px; z-index:1051;position: fixed;" :icon="PictureFilled" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="导出图片！">
            <el-button class="!ml-0" plain @click="export_graph = true" size=""
                style="margin-top: 4px; margin-left: 404px; z-index:1051;position: fixed;" :icon="Download" />
        </el-tooltip>
        <el-tooltip v-if="!isOnline" class="box-item" effect="dark" content="上线流程，按照执行周期自动执行！">
            <el-button class="!ml-0" plain @click="callOnline" size=""
                style="margin-top: 4px; margin-left: 454px; z-index:1051;position: fixed;" :icon="VideoPause" />
        </el-tooltip>
        <el-tooltip v-else class="box-item" effect="dark" content="流程当前已上线，点击下线流程，停止自动执行！">
            <el-button type="success" class="!ml-0" plain @click="callOffline" size=""
                style="margin-top: 4px; margin-left: 454px; z-index:1051;position: fixed;" :icon="VideoPlay" />
        </el-tooltip>
        <!-- <el-tooltip class="box-item" effect="dark" content="通过AI自动生成用户需要的流程">
            <el-button class="!ml-0" plain @click="ai_generate = true" size=""
                style="margin-top: 4px; margin-left: 504px; z-index:1051;position: fixed;" :icon="aiIcon" />
        </el-tooltip> -->
        <!-- <el-tooltip v-if="graph_locked" class="box-item" effect="dark" content="解锁，使画布可拖拽！">
            <el-button class="!ml-0" plain @click="show_task_vue = true" size=""
                style="margin-top: 4px; margin-left: 404px; z-index:1051;position: fixed;" :icon="Lock" />
        </el-tooltip>
        <el-tooltip v-else class="box-item" effect="dark" content="固定画布，使画布不可拖拽！">
            <el-button class="!ml-0" plain @click="show_task_vue = true" size=""
                style="margin-top: 4px; margin-left: 404px; z-index:1051;position: fixed;" :icon="Unlock" />
        </el-tooltip> -->
    </div>
    <div>
    <el-scrollbar :style="`height: ${dynamicGraphHeight}px`">
        <div id="container" :class="{ containerDark: isDark, containerLight: !isDark }"
            :style='{ "min-width": "5000px", "min-height": "5000px", "margin-top": "0px" }'>
            <div id="stencil">
                <div id="graph-container" class="x6-graph" tabindex="-1"
                    style="width: 5000px; height: 5000px; z-index: 1000;">
                </div>
            </div>
        </div>
        </el-scrollbar>
    </div>
    <el-popover :visible="popoverVisible" :width="250" trigger="manual" popper-class="context-menu-popover">
        <template #reference>
            <div style="display: none;"></div>
        </template>

        <el-menu default-active="2" class="el-menu-vertical-demo" style="border: 0px">
            <el-menu-item index="2">
                <el-icon><icon-menu /></el-icon>
                <span>修改任务</span>
            </el-menu-item>
            <el-menu-item index="1" @click="RemoveNode">
                <el-icon>
                    <Delete />
                </el-icon>
                <span>删除任务</span>
            </el-menu-item>
        </el-menu>
    </el-popover>
    <el-drawer v-model="show_task_vue" :direction="drawer_direction" size="50%" :destroy-on-close="true">
        <template #header>
            <h4 v-if="!update_task" style="width: 100px">创建任务</h4>
            <h4 v-else>修改任务</h4>
        </template>
        <template #default>
            <CreateNode :pipeline_id="pipeline_id" :task_info="clicked_task_info" :task_type="taskType", :update_task="update_task" />
        </template>
    </el-drawer>
    <el-drawer v-model="run_tasks" :direction="drawer_direction" size="50%" :destroy-on-close="true">
        <template #header>
            <h4 tyle="width: 100px">执行任务</h4>
        </template>
        <template #default>
            <RunPipeline :all_tasks="allTasks" />
        </template>
    </el-drawer>
    <el-drawer class="custom-drawer" v-model="show_task_status" :direction="drawer_direction" size="100%" body-class="my-card-body"
        :destroy-on-close="true">
        <template #header>
            <h4 style="width: 60px;">执行状态</h4>
            <el-tooltip class="box-item" effect="dark" content="手动刷新数据列表！" style="text-align: left;"
                placement="top-start">
                <el-button @click="userRefreshData" style="margin-right: 20px;" type="default" size="default"
                    :icon="Refresh" circle />
            </el-tooltip>
            <el-tooltip class="box-item" effect="dark" content="自动刷新数据列表！" style="text-align: left;"
                placement="top-start">
                <el-switch style="margin-right: 20px;height: 40px;" size="large" v-model="auto_refresh_task"
                    :active-action-icon="Select" :inactive-action-icon="CloseBold" />
            </el-tooltip>

            <el-button-group style="margin-right:20px;">
                <el-button type="primary" :disabled="!choosed_task" @click="batchRun">批量重跑</el-button>
                <el-button type="primary" :disabled="!choosed_task" @click="batchStop">批量停止</el-button>
            </el-button-group>
            <el-pagination v-model:current-page="currentPage2" v-model:page-size="pageSize2"
                :page-sizes="[10, 50, 100, 200]" background layout="sizes, prev, pager, next"
                :total="currentTotalSize" />
        </template>
        <template #default>
            <TaskStatusList :table_margin_top="0" :auto_refresh="auto_refresh_task" :pipeline_name="pipeline_name"
                :task_name="task_name" :page_size="pageSize2" :is_graph_task_list="true" />
        </template>
    </el-drawer>
    <el-drawer v-model="export_graph" :direction="drawer_direction" size="30%" :destroy-on-close="true">
        <template #header>
            <h4>导出图片</h4>
        </template>
        <template #default>
            <ExportGraph :background="export_background" :node_fill="export_node_fill"
                :font_color="export_font_color" />
        </template>
    </el-drawer>
    <el-drawer v-model="ai_generate" :direction="drawer_direction" size="30%" :destroy-on-close="true">
        <template #header>
            <h4>AI自动生成流程图
            </h4>
        </template>
        <template #default>
            <AiGenerate />
        </template>
    </el-drawer>
</template>

<script lang="ts">
import CreateNode from './CreateNode.vue';
import RunPipeline from './RunPipeline.vue';
import TaskStatusList from './TaskStatusList.vue';
import ExportGraph from './ExportGraph.vue'
import AiGenerate from './AiGenerate.vue'
import { ElMessageBox } from 'element-plus';
import { Action } from 'element-plus';
import { ElMessage } from 'element-plus';
import SqlIcon from './sqlIcon.vue';
import aiIcon from './aiIcon.vue';

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
import { Graph, Shape } from '@antv/x6'
import { Stencil } from '@antv/x6-plugin-stencil'
import { Transform } from '@antv/x6-plugin-transform'
import { Selection } from '@antv/x6-plugin-selection'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { History } from '@antv/x6-plugin-history'
import insertCss from 'insert-css'
import { DagreLayout } from '@antv/layout'
import { Download, Plus } from '@element-plus/icons-vue'

import type { ComponentSize } from 'element-plus'
import {
    DeleteFilled,
    Delete,
    CaretRight,
    View,
    DataAnalysis,
    PictureFilled,
    VideoPause,
    VideoPlay,
    DArrowRight,
    Select,
    CloseBold,
    Menu as IconMenu,
} from '@element-plus/icons-vue'
import { useDark, useToggle } from "@vueuse/core";
import emitter from './EventBus';
import axios from 'axios';
import qs from 'qs';
import { onUnmounted } from 'vue';
import type { DrawerProps } from 'element-plus'
import sqlIcon from './sqlIcon.vue';
import { Refresh } from '@element-plus/icons-vue'
import { Export } from '@antv/x6-plugin-export';
import { DataUri } from '@antv/x6'
import { useEventListener } from '@vueuse/core'

const auto_refresh_task = ref(false)

const show_task_vue = ref(false)
const drawer_direction = ref<DrawerProps['direction']>('rtl')
const popoverVisible = ref(false);
const menu_click_node = ref(null);
const graph_locked = ref(false);
const isDark = useDark();
const pipeline_id = ref('');
const pipeline_name = ref('');
const task_name = ref('');
const nodeKey = ref('');
const graph_changed = ref(false)
const clicked_task_info = ref({})
const update_task = ref(false)
const taskType = ref(1)
const run_tasks = ref(false)
const allTasks = ref({})
const show_task_status = ref(false)
const choosed_task = ref(false)
const pageSize2 = ref(50)
const currentPage2 = ref(1)
const currentTotalSize = ref(0)
const show_history_graph = ref(false)
const graph_min_height = ref(87.4)
const graph_node_height = ref(60)
const graph_level_height = ref(24)
const graph_space_width = ref(60)
const graph_node_width = ref(200)
const graph_node_status_rect = ref('0, 460, 69, 0')
const export_graph = ref(false)
const export_background = 'rgba(0, 0, 0, 1)'
const export_node_fill = 'rgba(31, 147, 255, 0.73)'
const export_font_color = 'rgba(255, 255, 255, 0.73)'
const isOnline = ref(false)
const ai_generate = ref(false)
const ai_timer = ref(null)
const ai_count = ref(0)
const ai_nodes = ref([])
const ai_edges = ref([])
const dynamicGraphHeight = ref(1000)

const emitterOn = () => {
    // 正确接收事件
    emitter.on('update_graph', (payload) => {
        update_graph(payload)
    });

    emitter.on('success_create_task', (payload) => {
        add_new_task(payload)
        show_task_vue.value = false
    });

    emitter.on('delete_task_success', (task_id) => {
        delete_node(task_id)
        show_task_vue.value = false
    });

    emitter.on('update_task_success', (task_info) => {
        var node = graph.getCellById(task_info.id);
        node.attr('title/text', task_info.name).attr('text/text', task_info.description);
        show_task_vue.value = false

        const inEdges = graph.getIncomingEdges('' + task_info.id);
        console.log("now node edges: ", inEdges)
        if (inEdges) {
            for (const edge of inEdges) {
                console.log("now reove node edges: ", edge)
                graph.removeEdge(edge.id);
            }
        }
        add_new_task(task_info)
    });

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

    emitter.on('success_run_tasks', (data) => {
        run_tasks.value = false;
        show_task_status.value = true
    })

    emitter.on('export_graph', (data) => {
        export_graph.value = false
        if (data.format == "PNG") {
            graph.toPNG((dataUrl) => {
                const link = document.createElement('a')
                link.download = pipeline_name + ".png"
                link.href = dataUrl
                document.body.appendChild(link)
                link.click()
                link.remove()
            }, {
                backgroundColor: data['color_background'],
                padding: 20,
                quality: 1,
                stylesheet: '.x6-node rect { fill: ' + data['color_node'] + '; } .x6-node text { fill: ' + data['color_font'] + '; font-size: 14px; }'
            })
        } else if (data.format == "JPEG") {
            graph.toJPEG((dataUrl) => {
                const link = document.createElement('a')
                link.download = pipeline_name + ".jpeg"
                link.href = dataUrl
                document.body.appendChild(link)
                link.click()
                link.remove()
            }, {
                backgroundColor: data['color_background'],
                padding: 20,
                quality: 1,
                stylesheet: '.x6-node rect { fill: ' + data['color_node'] + '; } .x6-node text { fill: ' + data['color_font'] + '; font-size: 14px; }'
            })
        } else {
            graph.toSVG((dataUri: string) => {
                DataUri.downloadDataUri(DataUri.svgToDataUrl(dataUri), pipeline_name + '.svg')
            }, {
                stylesheet: '.x6-node rect { fill: ' + data['color_node'] + '; } .x6-node text { fill: ' + data['color_font'] + '; font-size: 14px; }'
            })
        }

    })

    emitter.on('ai_generate', (data) => {
        ai_timer.value = setInterval(() => {
            ai_count.value++
            ElMessage({ type: "success", message: "add new node: " + ai_count.value })
            AiAddNode(ai_count.value)
            if (ai_count.value >= 15) {
                clearInterval(ai_timer.value)
                ai_count.value = 0;
                ai_nodes.value = []
                ai_edges.value = []
            }
        }, 1000)
    })
}

const emitterOff = () => {
    emitter.off('update_graph', null);
    emitter.off('success_create_task', null);
    emitter.off('delete_task_success', null);
    emitter.off('update_task_success', null);
    emitter.off('success_load_task_table_data', null);
    emitter.off('table_selected_changed', null);
    emitter.off('success_run_tasks', null);
    emitter.off('export_graph', null);
    emitter.off('ai_generate', null);
}

onUnmounted(() => {
    emitterOff();
    if (graph.value) {
        graph.value.off('node:contextmenu');
        graph.value.off('blank:contextmenu');
    }
    document.removeEventListener('click', handleDocumentClick);
});

const callOnline = () => {
    ElMessageBox({
        title: '上线流程',
        message: h('p', null, [
            h('span', null, '确定要上线流程名？'),
        ]),
        showCancelButton: true,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
                axios
                    .post('/pipeline/on_line/', qs.stringify({
                        "pipe_id": pipeline_id.value,
                        "reason": 0,
                        "on_line": 1
                    }))
                    .then(response => {
                        done()
                        if (response.data.status != 0) {
                            ElMessage({
                                type: 'warning',
                                message: "上线失败：" + response.data.msg,
                            })
                        } else {
                            isOnline.value = true
                            ElMessage({
                                type: 'warning',
                                message: "上线成功！"
                            })
                        }
                    })
                    .catch(error => {
                        ElMessage({
                                type: 'warning',
                                message: "上线失败：" + error,
                            })
                    })
            } else {
                done()
            }
        },
    }).then((action) => {
    })
}

const callOffline = () => {
    ElMessageBox({
        title: '下线流程',
        message: h('p', null, [
            h('span', null, '确定要下线流程名？'),
        ]),
        showCancelButton: true,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
                axios
                    .post('/pipeline/on_line/', qs.stringify({
                        "pipe_id": pipeline_id.value,
                        "reason": 0,
                        "on_line": 0
                    }))
                    .then(response => {
                        done()
                        if (response.data.status != 0) {
                            ElMessage({
                                type: 'warning',
                                message: "下线失败：" + response.data.msg,
                            })
                        } else {
                            isOnline.value = false
                            ElMessage({
                                type: 'warning',
                                message: "下线成功！"
                            })
                        }
                    })
                    .catch(error => {
                        ElMessage({
                                type: 'warning',
                                message: "下线失败：" + error,
                            })
                    })
            } else {
                done()
            }
        },
    }).then((action) => {
    })
}

const show_pipeline_info = () => {
    emitter.emit("click_show_pipeline", nodeKey.value)
}

// 全局点击事件处理函数
const handleDocumentClick = (e) => {
    const popperEl = document.querySelector('.context-menu-popover');
    if (popperEl && !popperEl.contains(e.target) && popoverVisible.value) {
        popoverVisible.value = false;
    }
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const AiAddNode = (index) => {
    var task_info = {
        "id": index + "",
        "name": "AI自动节点——" + index,
        "prev_task_ids": '',
        "proc_type": 1,
        "description": "测试通过AI自动生成节点，当前节点索引值：" + index
    }

    ai_nodes.value.push(task_info)
    if (index > 1) {
        var min_idx = index - 8
        if (min_idx < 1) {
            min_idx = 1
        }
        ai_edges.value.push(["" + getRandomInt(min_idx, index-1), "" + index])
    }

    console.log("add new ai task: ", task_info)
    const graph_data: Model.FromJSONData = {
        nodes: [],
        edges: [],
    }

    for (let i = 0; i < ai_nodes.value.length; i++) {
        var image_path = '/images/python.png'
        if (ai_nodes.value[i]["proc_type"] == 5) {
            image_path = '/images/shell.png'
        }

        if (ai_nodes.value[i]["proc_type"] == 7) {
            image_path = '/images/ck.png'
        }

        var stroke_color = `var(--el-color-success)`
        graph_data.nodes!.push({
            id: "" + ai_nodes.value[i]["id"],
            shape: 'custom-rect',
            attrs: {
                body: {
                    stroke: stroke_color,
                    rx: 0,
                    ry: 0,
                },
                image: {
                    'xlink:href': image_path,
                    width: 16,
                    height: 16,
                    x: 12,
                    y: 5,
                },
                title: {
                    text: ai_nodes.value[i]["name"],
                    refX: 40,
                    refY: 5,
                    fill: 'rgba(255,255,255,1)',
                    textWrap: {
                        width: graph_node_width.value - 50, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
                        height: graph_node_height.value + 50, // 文本的最大高度
                        ellipsis: true, // 超过高度时显示省略号
                    },
                    fontSize: 12,
                    'text-anchor': 'start',
                },
                text: {
                    text: ai_nodes.value[i]["description"],
                    refX: 40,
                    refY: 38,
                    fontSize: 12,
                    textWrap: {
                        width: 130, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
                        height: 60, // 文本的最大高度
                        ellipsis: true, // 超过高度时显示省略号
                    },
                    // 其他文本样式
                    fill: '#000',
                    fontFamily: 'Arial',
                    fill: 'rgba(255,255,255,1)',
                    'text-anchor': 'start',
                },
            },
        })
    }

    ai_edges.value.forEach((edge: [string, string]) => {
        graph_data.edges!.push({
            source: { cell: edge[0], port: 'port-bottom' },
            target: { cell: edge[1], port: 'port-top' },
            attrs: {
                line: {
                    stroke: '#A2B1C3',
                    strokeWidth: 2,
                    targetMarker: {
                        name: 'block',
                        width: 12,
                        height: 8,
                    },
                },
            },

            router: { name: 'manhattan' },
            connector: {
                name: 'rounded',
                args: {
                    radius: 8,
                },
            },
            anchor: 'center',
            connectionPoint: 'anchor',
            allowBlank: false,
            snap: {
                radius: 20,
            },
        })
    })


    const dagreLayout = new DagreLayout({
        type: 'dagre',
        rankdir: 'TB',      // 布局方向：TB(上到下)、BT(下到上)、LR(左到右)、RL(右到左)
        align: 'DR',        // 对齐方式：UL(上左)、UR(上右)、DL(下左)、DR(下右)
        ranksep: graph_level_height.value,        // 层间距(px)
        nodesep: graph_space_width.value,        // 节点间距(px)
        controlPoints: true, // 是否保留边的控制点
        sortByCombo: true,  // 是否按combo排序
    })

    console.log(graph_data)
    const data_json = dagreLayout.layout(graph_data);
    graph.fromJSON(data_json)
}

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

const getTimestamp = () => {
    return Math.floor(new Date().getTime() / 1000)
}

var prev_save_graph_tm_ms = getTimestamp()

const RemoveNode = () => {
    delete_node(menu_click_node.value?.id)
    popoverVisible.value = false;
    DirectSaveGraph();
}

const DeletePipeline = () => {
    emitter.emit("graph_call_delete_pipeline", nodeKey.value)
}

var graph = null;
var ggraph = ref(graph);
var second_timer = null;
const initGraph = () => {
    // 为了协助代码演示
    preWork()
    // #region 初始化画布
    graph = new Graph({
        container: document.getElementById('graph-container')!,
        grid: true,
        panning: true,
        resizing: true,
        scroller: {
            enabled: true,
            pageVisible: true,
            pageBreak: true,
            pannable: true,
        },
            events: {
                // 禁用默认 Delete 行为
                'delete': false  // 或 null
            },
        mousewheel: {
            enabled: true,
            // zoomAtMousePosition: true,
            modifiers: ['ctrl', 'meta'],
            minScale: 0.5,
            maxScale: 3,
        },
        connecting: {
            router: 'manhattan',
            connector: {
                name: 'rounded',
                args: {
                    radius: 8,
                },
            },
            anchor: 'center',
            connectionPoint: 'anchor',
            allowBlank: false,
            snap: {
                radius: 20,
            },

            createEdge() {
                return new Shape.Edge({
                    attrs: {
                        line: {
                            stroke: '#A2B1C3',
                            strokeWidth: 2,
                            targetMarker: {
                                name: 'block',
                                width: 12,
                                height: 8,
                            },
                        },
                    },
                    zIndex: 0,
                })
            },
            validateConnection({ targetMagnet }) {
                return !!targetMagnet
            },
        },
        highlighting: {
            magnetAdsorbed: {
                name: 'stroke',
                args: {
                    attrs: {
                        fill: '#5F95FF',
                        stroke: '#5F95FF',
                    },
                },
            },
        },
    })
    // #endregion

    // #region 使用模板任务
    graph
        .use(
            new Transform({
                resizing: true,
                rotating: true,
            }),
        )
        .use(
            new Selection({
                rubberband: true,
                showNodeSelectionBox: true,
            }),
        )
        .use(new Snapline())
        .use(new Keyboard())
        .use(new Clipboard())
        .use(new History())
    // #endregion

    // #region 初始化 stencil
    const stencil = new Stencil({
        title: '',
        target: graph,
        stencilGraphWidth: 200,
        stencilGraphHeight: 180,
        collapsable: false,
        groups: [
            {
                title: '基础流程图',
                name: 'group1',
                // },
                // {
                //     title: '系统设计图',
                //     name: 'group2',
                //     graphHeight: 250,
                //     layoutOptions: {
                //         rowHeight: 70,
                //     },
            },
        ],
        layoutOptions: {
            columns: 1,
            columnWidth: 80,
            rowHeight: 55,
        },
    })

    graph.unbindKey('delete')
graph.unbindKey('backspace')  // 顺便把 Backspace 也干掉

    // document.getElementById('stencil')!.appendChild(stencil.container)
    // #endregion

    // #region 快捷键与事件
    graph.bindKey(['meta+c', 'ctrl+c'], () => {
        const cells = graph.getSelectedCells()
        if (cells.length) {
            graph.copy(cells)
        }
        return true
    })
    graph.bindKey(['meta+x', 'ctrl+x'], () => {
        const cells = graph.getSelectedCells()
        if (cells.length) {
            graph.cut(cells)
        }
        return false
    })

    // graph.bindKey(['delete', 'backspace'], (e) => {
    //     // 阻止 X6 默认的删除行为
    //     e.preventDefault?.()   // 重要！必须阻止默认
    //     // 或者直接 return false（旧写法）
    //     // return false

    //     const selectedCells = graph.getSelectedCells()
    //     if (selectedCells.length === 0) return

    //     // 你的自定义逻辑
    //     if (confirm(`确定删除这 ${selectedCells.length} 个元素吗？`)) {
    //         graph.removeCells(selectedCells)
    //         console.log('已自定义删除:', selectedCells.map(c => c.id))
    //     }
    // })

    // 2. 监听节点按键（仅节点删除）
    graph.bindKey(['delete', 'backspace'], (e) => {
        const cells = graph.getSelectedCells()
        if (!cells.length) {
            return
        }

        const selected = graph.getSelectedCells()[0]  // 假设选中一个节点
        e.preventDefault?.()
        ElMessageBox.confirm("确定要删除任务吗？", "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "info",
        })
        .then(() => {
            var params = {
                "Task[id]": selected.id
            }

            axios
                .post('/pipeline/delete_task/' + pipeline_id.value + '/', qs.stringify(params))
                .then(response => {
                    if (response.status != 200 || response.data.status != 0) {
                        ElMessage.warning("删除任务失败：" + response.data.info)
                    } else {
                        console.log(response.data)
                        delete_node(selected.id)
                        show_task_vue.value = false
                        ElMessage.success("删除任务成功！")
                    }
                })
                .catch(error => {
                    ElMessage.error("创建任务失败：" + error)
                    console.log(error)
                })
        })
        .catch((error) => {});
    })

    graph.bindKey(['meta+v', 'ctrl+v'], () => {
        if (graph.isClipboardEmpty()) {
            return;
        }

        const selected = graph.getSelectedCells()[0]  // 假设选中一个节点
        ElMessageBox.confirm("确定要拷贝任务吗？", "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "info",
        })
        .then(() => {
           axios
                .post('/pipeline/copy_task/', qs.stringify({
                    "dest_pl_id": pipeline_id.value,
                    "task_id": selected.id
                }))
                .then(response => {
                    if (response.status != 200 || response.data.status != 0) {
                        ElMessage.warning("拷贝任务失败：" + response.data.msg)
                    } else {
                        var task_info = {
                            "id": response.data.data.id,
                            "name": response.data.data.name,
                            "proc_type": response.data.data.proc_type,
                            "description": response.data.data.description,
                            "prev_task_ids": ""
                        }
                        
                        add_new_task(task_info);
                        ElMessage.success("拷贝任务成功！")
                    }
                })
                .catch(error => {
                    ElMessage.error("创建任务失败：" + error)
                    console.log(error)
                })
        })
        .catch((error) => {});
    
        return true
    })

    // undo redo
    graph.bindKey(['meta+z', 'ctrl+z'], () => {
        if (graph.canUndo()) {
            graph.undo()
        }
        return false
    })
    graph.bindKey(['meta+shift+z', 'ctrl+shift+z'], () => {
        if (graph.canRedo()) {
            graph.redo()
        }
        return false
    })

    // select all
    graph.bindKey(['meta+a', 'ctrl+a'], () => {
        const nodes = graph.getNodes()
        if (nodes) {
            graph.select(nodes)
        }
    })

    // delete
    graph.bindKey('backspace', () => {
        const cells = graph.getSelectedCells()
        if (cells.length) {
            graph.removeCells(cells)
        }
    })

    // zoom
    graph.bindKey(['ctrl+1', 'meta+1'], () => {
        const zoom = graph.zoom()
        if (zoom < 1.5) {
            graph.zoom(0.1)
        }
    })
    graph.bindKey(['ctrl+2', 'meta+2'], () => {
        const zoom = graph.zoom()
        if (zoom > 0.5) {
            graph.zoom(-0.1)
        }
    })

    // 控制连接桩显示/隐藏
    const showPorts = (ports: NodeListOf<SVGElement>, show: boolean) => {
        for (let i = 0, len = ports.length; i < len; i += 1) {
            ports[i].style.visibility = show ? 'visible' : 'hidden'
        }
    }
    graph.on('node:mouseenter', () => {
        const container = document.getElementById('graph-container')!
        const ports = container.querySelectorAll(
            '.x6-port-body',
        ) as NodeListOf<SVGElement>
        showPorts(ports, true)
    })
    graph.on('node:mouseleave', () => {
        const container = document.getElementById('graph-container')!
        const ports = container.querySelectorAll(
            '.x6-port-body',
        ) as NodeListOf<SVGElement>
        showPorts(ports, false)
    })
    // #endregion

    // #region 初始化图形
    const ports = {
        groups: {
            top: {
                position: 'top',
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: '#5F95FF',
                        strokeWidth: 1,
                        fill: '#fff',
                        style: {
                            visibility: 'hidden',
                        },
                    },
                },
            },
            right: {
                position: 'right',
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: '#5F95FF',
                        strokeWidth: 1,
                        fill: '#fff',
                        style: {
                            visibility: 'hidden',
                        },
                    },
                },
            },
            bottom: {
                position: 'bottom',
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: '#5F95FF',
                        strokeWidth: 1,
                        fill: '#fff',
                        style: {
                            visibility: 'hidden',
                        },
                    },
                },
            },
            left: {
                position: 'left',
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: '#5F95FF',
                        strokeWidth: 1,
                        fill: '#fff',
                        style: {
                            visibility: 'hidden',
                        },
                    },
                },
            },
        },
        items: [
            {
                id: 'port-top',
                group: 'top',
            },
            {
                id: 'port-right',
                group: 'right',
            },
            {
                id: 'port-bottom',
                group: 'bottom',
            },
            {
                id: 'port-left',
                group: 'left',
            },
        ],
    }

    Graph.registerNode(
        'custom-rect',
        {
            inherit: 'rect',
            width: graph_node_width.value,
            height: graph_node_height.value,
            attrs: {
                body: {
                    stroke: `var(--el-color-warning)`,
                    strokeWidth: 9,
                    fill: `var(--el-color-primary)`,
                    refWidth: 1,
                    refHeight: 1,
                    strokeDasharray: graph_node_status_rect.value,
                },
                image: {
                    'xlink:href': '/images/python.png',
                    width: 16,
                    height: 16,
                    x: 12,
                    y: 12,
                    backgroundColor: 'rgba(255,255,255,1)',
                },
                image0: {
                    'xlink:href': '/images/python.png',
                    width: 16,
                    height: 32,
                    x: 12,
                    y: 32,
                    backgroundColor: 'rgba(255,255,255,1)',
                },
                title: {
                    text: 'Node',
                    refX: 40,
                    refY: 14,
                    fill: 'rgba(255,255,255,1)',
                    fontSize: 14,
                    'text-anchor': 'start',
                },
                text: {
                    text: 'this is content text',
                    refX: 40,
                    refY: 38,
                    textWrap: {
                        width: 150,
                    },
                    fontSize: 12,
                    fill: 'rgba(225,225,225,1)',
                    'text-anchor': 'start',
                },
            },
            markup: [
                {
                    tagName: 'rect',
                    selector: 'body',
                },
                {
                    tagName: 'image',
                    selector: 'image',
                },
                {
                    tagName: 'text',
                    selector: 'title',
                },
                {
                    tagName: 'text',
                    selector: 'text',
                },
            ],
            ports: { ...ports },
        },
        true,
    )

    // graph.on('node:contextmenu', ({ e, node }) => {
    //     e.preventDefault();
    //     selectedCell.value = node;

    //     // 关键步骤: 将鼠标坐标设置到 body 上的 CSS 变量
    //     document.documentElement.style.setProperty('--popover-x', `${e.clientX}px`);
    //     document.documentElement.style.setProperty('--popover-y', `${e.clientY}px`);
    //     const popperEl = document.querySelector('.context-menu-popover');
    //     popperEl.style.setProperty('top', `${e.clientX}px`);
    //     popperEl.style.setProperty('left', `${e.clientY}px`);

    //     popoverVisible.value = true;
    //     menu_click_node.value = node
    // });

    graph.on('blank:contextmenu', ({ e }) => {
        e.preventDefault();
        popoverVisible.value = false;
    });

    graph.on('blank:click', ({ e }) => {
        e.preventDefault();
        popoverVisible.value = false;
    });

    graph.on('edge:connected', ({ edge }) => {
        axios
            .post('/pipeline/link_task/', qs.stringify({
                "prev_task_id": edge.getSourceNode().id,
                "next_task_id": edge.getTargetNode().id
            }))
            .then(response => {
                console.log("connect edge success: %d, %d", edge.getSourceNode().id, edge.getTargetNode().id);
                DirectSaveGraph();
            })
            .catch(error => {
                graph.removeEdge(edge);
            })
    });

    graph.on('edge:click', ({ edge }) => {
        // 弹出确认框
        ElMessageBox.confirm(
            '确认要删除边解除依赖关系吗?',
            '删除依赖',
            {
                confirmButtonText: '确认',
                cancelButtonText: '取消',
                type: 'warning',
            }
        )
            .then(() => {
                axios
                    .post('/pipeline/unlink_task/', qs.stringify({
                        "Link[from]": edge.getSourceNode().id,
                        "Link[to]": edge.getTargetNode().id
                    }))
                    .then(response => {
                        graph.removeEdge(edge);
                        DirectSaveGraph();
                        ElMessage({
                            type: 'success',
                            message: '删除依赖成功！',
                        })
                    })
                    .catch(error => {
                        ElMessage({
                            type: 'error',
                            message: '删除依赖失败：' + error,
                        })
                    })

            })
            .catch(() => {

            })

    });

    graph.on('node:dblclick', ({ e, node }) => {
        update_task.value = true
        e.preventDefault();
        console.log("clicked: ", node.id)
        axios
            .get('/pipeline/get_task_detail/' + node.id + "/", {
                params: {
                }
            })
            .then(response => {
                clicked_task_info.value = response.data
                show_task_vue.value = true;
                taskType.value = response.data.processor.type
                console.log(response.data)
            })
            .catch(error => console.log(error))
    });


    graph.on('node:changed', handleChange);
    graph.on('edge:changed', handleChange);
    graph.use(new Export());
    ggraph.value = graph
    function handleChange() {
        graph_changed.value = true;
    }
}

const relayout = () => {
    axios
        .post('/pipeline/get_pipeline_detail/', qs.stringify({
            'pipe_id': pipeline_id.value
        }))
        .then(response => {
            var selectedPipeline = response.data
            if (response.data.email_to != "") {
                selectedPipeline.monitor_way |= 1
            }

            if (response.data.sms_to != "") {
                selectedPipeline.monitor_way |= 2
            }

            isOnline.value = response.data.enable == 1 ? true : false
            var pipline_data = response.data
            axios
                .post('/pipeline/get_tasks/', qs.stringify({
                    'pipeline_id': pipeline_id.value,
                }))
                .then(response => {
                    // 正确: 载荷类型与定义匹配
                    response.data['project_id'] = nodeKey.value.split("-")[0]
                    response.data['pipeline_detail'] = pipline_data
                    response.data['pipe_usr_graph'] = null
                    update_graph({ "tag": "0", "data": response.data });
                    DirectSaveGraph();
                })
                .catch(error => {
                    console.log(error)
                })
        })
        .catch(error => {
            console.log(error)
            emitter.emit('update_graph', "-1");
        })
}

const update_graph = (data) => {
    if (data["tag"] == "-1" || data["tag"] == "1") {
        return;
    }

    show_task_status.value = false
    data = data["data"]
    console.log("update graph: ", data)
    if (data["pipeline_detail"]) {
        pipeline_name.value = data["pipeline_detail"]["name"];
    }
            
    if (data.pipeline_detail) {
        isOnline.value = data.pipeline_detail.enable == 1 ? true : false
    }
    
    pipeline_id.value = data["pipe_id"];
    nodeKey.value = data["project_id"] + "-" + data["pipe_id"];
    console.log("pipeline_id.value: ", nodeKey.value, pipeline_id.value, data)

    allTasks.value = data
    const graph_data: Model.FromJSONData = {
        nodes: [],
        edges: [],
    }

    if (data["task_list"])
        for (let i = 0; i <= data["task_list"].length; i++) {
            if (data["task_list"][i] == null) {
                continue;
            }

            var image_path = '/images/python.png'
            if (data["task_list"][i]["proc_type"] == 5) {
                image_path = '/images/shell.png'
            }

            if (data["task_list"][i]["proc_type"] == 7) {
                image_path = '/images/ck.png'
            }

            var stroke_color = `var(--el-color-success)`
            if (data["task_list"][i]["status"] == 0 || data["task_list"][i]["status"] == 5) {
                stroke_color = `var(--el-color-warning)`
            } else if (data["task_list"][i]["status"] == 1) {
                stroke_color = '#6222C9'
            } else if (data["task_list"][i]["status"] == 2) {
                stroke_color = `var(--el-color-success)`
            } else {
                stroke_color = `var(--el-color-danger)`
            }
            graph_data.nodes!.push({
                id: "" + data["task_list"][i]["id"],
                shape: 'custom-rect',
                attrs: {
                    body: {
                        stroke: stroke_color,
                        rx: 0,
                        ry: 0,
                    },
                    image: {
                        'xlink:href': image_path,
                        width: 16,
                        height: 16,
                        x: 12,
                        y: 5,
                    },
                    title: {
                        text: data["task_list"][i]["name"],
                        refX: 40,
                        refY: 5,
                        fill: 'rgba(255,255,255,1)',
                        textWrap: {
                            width: graph_node_width.value - 50, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
                            height: graph_node_height.value + 50, // 文本的最大高度
                            ellipsis: true, // 超过高度时显示省略号
                        },
                        fontSize: 12,
                        'text-anchor': 'start',
                    },
                    text: {
                        text: data["task_list"][i]["description"],
                        refX: 40,
                        refY: 38,
                        fontSize: 12,
                        textWrap: {
                            width: 130, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
                            height: 60, // 文本的最大高度
                            ellipsis: true, // 超过高度时显示省略号
                        },
                        // 其他文本样式
                        fill: '#000',
                        fontFamily: 'Arial',
                        fill: 'rgba(255,255,255,1)',
                        'text-anchor': 'start',
                    },
                },
            })
        }

    if (data["edges"])
        data["edges"].forEach((edge: [string, string]) => {
            graph_data.edges!.push({
                source: { cell: edge[0], port: 'port-bottom' },
                target: { cell: edge[1], port: 'port-top' },
                attrs: {
                    line: {
                        stroke: '#A2B1C3',
                        strokeWidth: 2,
                        targetMarker: {
                            name: 'block',
                            width: 12,
                            height: 8,
                        },
                    },
                },

                router: { name: 'manhattan' },
                connector: {
                    name: 'rounded',
                    args: {
                        radius: 8,
                    },
                },
                anchor: 'center',
                connectionPoint: 'anchor',
                allowBlank: false,
                snap: {
                    radius: 20,
                },
            })
        })


    const dagreLayout = new DagreLayout({
        type: 'dagre',
        rankdir: 'TB',      // 布局方向：TB(上到下)、BT(下到上)、LR(左到右)、RL(右到左)
        align: 'DR',        // 对齐方式：UL(上左)、UR(上右)、DL(下左)、DR(下右)
        ranksep: graph_level_height.value,        // 层间距(px)
        nodesep: graph_space_width.value,        // 节点间距(px)
        controlPoints: true, // 是否保留边的控制点
        sortByCombo: true,  // 是否按combo排序
    })

    // if (data["pipe_usr_graph"] != null && data["pipe_usr_graph"].length > 0) {
    //     graph.fromJSON(JSON.parse(data["pipe_usr_graph"]));
    // } else {
        const data_json = dagreLayout.layout(graph_data);
        graph.fromJSON(data_json)
    // }
    console.log("valid graph 1");
    graph.centerContent();
    graph.center()

    if (pipeline_id.value) {
        var newUrl = window.location.origin + "/pipeline?id=" + pipeline_id.value
        history.pushState('', '', newUrl);
    }
}

function preWork() {
    // 这里协助演示的代码，在实际项目中根据实际情况进行调整
    const container = document.getElementById('container')!
    const stencilContainer = document.createElement('div')
    stencilContainer.id = 'stencil'
    const graphContainer = document.createElement('div')
    graphContainer.id = 'graph-container'
    // container.appendChild(stencilContainer)
    container.appendChild(graphContainer)

    insertCss(`
        #stencil {
        width: 180px;
        height: 90px;
        position: relative;
        }
        #graph-container {
        width: calc(100% - 180px);
        height: 100%;
        }
        .x6-widget-stencil  {
        background-color: #fff0;
        }
        .x6-widget-stencil-title {
        background-color: #fff0;
        display:none;
        }
        .x6-widget-stencil-group-title {
        display:none;
        background-color: #fff0 !important;
        }
        .x6-widget-transform {
        margin: -1px 0 0 -1px;
        padding: 0px;
        border: 1px solid #239edd;
        }
        .x6-widget-transform > div {
        border: 1px solid #239edd;
        }
        .x6-widget-transform > div:hover {
        background-color: #3dafe4;
        }
        .x6-widget-transform-active-handle {
        background-color: #3dafe4;
        }
        .x6-widget-transform-resize {
        border-radius: 0;
        }
        .x6-widget-selection-inner {
        border: 1px solid #239edd;
        }
        .x6-widget-selection-box {
        opacity: 0;
        }
        .scrollerCss {
            overflow-x: hidden;
            overflow-y: auto;
        }
    `)
}

function delete_node(id) {
    graph.removeNode(id);
}

function add_new_task(task_info) {
    console.log("add new task: ", task_info)
    var image_path = '/images/python.png'
    if (task_info["proc_type"] == 5) {
        image_path = '/images/shell.png'
    }

    if (task_info["proc_type"] == 6) {
        image_path = '/images/docker.png'
    }

    if (task_info["proc_type"] == 7) {
        image_path = '/images/ck.png'
    }

    var stroke_color = `var(--el-color-success)`
    graph.addNode({
        id: "" + task_info.id,
        shape: 'custom-rect',
        attrs: {
            body: {
                stroke: stroke_color,
                rx: 0,
                ry: 0,
            },
            image: {
                'xlink:href': image_path,
                width: 16,
                height: 16,
                x: 12,
                y: 5,
            },
            title: {
                text: task_info.name,
                refX: 40,
                refY: 5,
                fill: 'rgba(255,255,255,1)',
                textWrap: {
                    width: graph_node_width.value - 50, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
                    height: graph_node_height.value + 50, // 文本的最大高度
                    ellipsis: true, // 超过高度时显示省略号
                },
                fontSize: 12,
                'text-anchor': 'start',
            },
            text: {
                text: task_info.description,
                refX: 40,
                refY: 38,
                fontSize: 12,
                textWrap: {
                    width: 130, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
                    height: 60, // 文本的最大高度
                    ellipsis: true, // 超过高度时显示省略号
                },
                // 其他文本样式
                fill: '#000',
                fontFamily: 'Arial',
                fill: 'rgba(255,255,255,1)',
                'text-anchor': 'start',
            },
        },
    })

    var prev_task_ids = task_info.prev_task_ids.split(',')
    console.log("get prev task ids: ", prev_task_ids)
    for (const prev_id of prev_task_ids) {
        if (prev_id == "") {
            continue
        }

        graph.addEdge({
            source: { cell: "" + prev_id, port: 'port-bottom' },
            target: { cell: "" + task_info.id, port: 'port-top' },
            attrs: {
                line: {
                    stroke: '#A2B1C3',
                    strokeWidth: 2,
                    targetMarker: {
                        name: 'block',
                        width: 12,
                        height: 8,
                    },
                },
            },

            router: { name: 'manhattan' },
            connector: {
                name: 'rounded',
                args: {
                    radius: 8,
                },
            },
            anchor: 'center',
            connectionPoint: 'anchor',
            allowBlank: false,
            snap: {
                radius: 20,
            },
        })
    }

}

const DirectSaveGraph = () => {
    var test_json = graph.toJSON();
    var str_json = JSON.stringify(test_json, null, 2);
    axios
        .post('/pipeline/update_pipline_graph/' + pipeline_id.value + "/", qs.stringify({
            'graph': str_json,
        }))
        .then(response => {
            console.log("save pipeline: %d", pipeline_id.value);
        })
        .catch(error => console.log(error))
    prev_save_graph_tm_ms = getTimestamp();
}

const TimeToSaveGraph = () => {
    var now_tm_ms = getTimestamp();
    if (graph_changed.value && (prev_save_graph_tm_ms + 3 < now_tm_ms)) {
        var test_json = graph.toJSON();
        var str_json = JSON.stringify(test_json, null, 2);
        axios
            .post('/pipeline/update_pipline_graph/' + pipeline_id.value + "/", qs.stringify({
                'graph': str_json,
            }))
            .then(response => {
                console.log("save pipeline: %d", pipeline_id.value);
            })
            .catch(error => console.log(error))
        graph_changed.value = false;
        prev_save_graph_tm_ms = now_tm_ms;
    }
}

const props = defineProps({
    task_info: Map,
});

const initLoadHistoryGraph = async (task_info) => {
    await axios
        .post('/pipeline/get_pipeline_detail/', qs.stringify({
            'pipe_id': task_info.pl_id,
        }))
        .then(response => {
            var pipeline_info;
            pipeline_info = response.data
            if (response.data.email_to != "") {
                pipeline_info.monitor_way |= 1
            }

            if (response.data.sms_to != "") {
                pipeline_info.monitor_way |= 2
            }

            axios
                .post('/pipeline/get_graph/', qs.stringify({
                    'pipe_id': task_info.pl_id,
                    'run_time': task_info.run_time,
                }))
                .then(response => {
                    var graph_data = {
                        "task_list": [],
                        "edges": [],
                        "project_id": pipeline_info.project_id,
                        "pipe_id": task_info.pl_id,
                        'pipeline_detail': pipeline_info
                    }

                    for (const task of response.data.res) {
                        var managers = ""
                        for (const mgr of task.manager_list) {
                            managers += mgr[0] + ","
                        }

                        if (managers != "") {
                            managers = managers.substring(0, managers.length - 1)
                        }

                        graph_data["task_list"].push({
                            "id": task.task_id,
                            "proc_type": task.proc_type,
                            "name": "流程名：" + task.pl_name + "\n任务名：" + task.task_name + "\n负责人：" + managers + "\n\n任务描述：" + task.task_desc,
                            "description": '',
                        })

                        var edge_prev_ids = task.prev_task_ids.split(',')
                        for (const prev_id of edge_prev_ids) {
                            if (prev_id != "") {
                                graph_data["edges"].push([prev_id, '' + task.task_id])
                            }
                        }

                        var edge_next_ids = task.next_task_ids.split(',')
                        for (const next_id of edge_next_ids) {
                            if (next_id != "") {
                                graph_data["edges"].push(['' + task.task_id, next_id])
                            }
                        }
                    }

                    emitter.emit("update_graph", { "tag": "0", "project_path": pipeline_info.project_name, "data": graph_data });
                    console.log('update_graph get tasks 1', pipeline_info.project_name, graph_data)
                })
                .catch(error => {
                    console.log(error)
                    emitter.emit('update_graph', "-1");
                })
        })
        .catch(error => {
            console.log(error)
            emitter.emit('update_graph', "-1");
        })
}

useEventListener(window, 'resize', () => {
    dynamicGraphHeight.value = window.innerHeight - 60
})

// Initialize on mount
onMounted(() => {
    dynamicGraphHeight.value = window.innerHeight - 60
    emitterOn();
    const params = new URLSearchParams(window.location.search);
    const value = params.get('id');
    console.log("get pipeline id from url: ", value)

    graph_min_height.value = 190
    if (props.task_info) {
        show_history_graph.value = true;
        graph_min_height.value = 90
        graph_node_height.value = 90
        graph_node_width.value = 260
        graph_level_height.value = 32
        graph_space_width.value = 80
        graph_node_status_rect.value = '0, 610, 229, 0'

        initGraph();
        initLoadHistoryGraph(props.task_info);
    } else {
        initGraph();
        if (value) {
        emitter.emit('show_graph_called', '0-' + value)

        }
        second_timer = setInterval(() => {
            TimeToSaveGraph();
        }, 1000);
    }

    document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
    // clearInterval(second_timer);
});



const currentPage4 = ref(5)
const pageSize4 = ref(100)
const size = ref<ComponentSize>('default')
const background = ref(false)
const disabled = ref(false)

const handleSizeChange = (val: number) => {
    console.log(`${val} items per page`)
}
const handleCurrentChange = (val: number) => {
    console.log(`current page: ${val}`)
}

</script>

<style scoped>
.custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;
    background-color: var(--el-color-primary);
}

.toolbar {
    margin-bottom: 10px;
}

.toolbar button {
    margin-right: 10px;
    padding: 8px 16px;
    cursor: pointer;
}

.my-btn {
    position: relative;
    display: inline-block;
    padding: 10px 20px;
    color: #03e9f4;
    font-size: 16px;
    text-decoration: none;
    text-transform: uppercase;
    overflow: hidden;
    transition: .3s;
    margin-top: 40px;
    letter-spacing: 3px
}

.my-btn:hover {
    background: #03e9f4;
    color: #fff;
    border-radius: 5px;
    box-shadow: 0 0 5px #03e9f4,
        0 0 25px #03e9f4,
        0 0 50px #03e9f4,
        0 0 100px #03e9f4;
}

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
.my-card-body {
  padding: 0px!important;
}
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