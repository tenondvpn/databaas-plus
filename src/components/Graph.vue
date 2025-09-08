<template>
    <div>
        <el-tooltip class="box-item" effect="dark" content="创建新的任务！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 4px; z-index:1051;position: fixed;" :icon="Plus" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="查询修改流程详情！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 54px; z-index:1051;position: fixed;" :icon="View" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="执行流程！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 104px; z-index:1051;position: fixed;" :icon="CaretRight" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="删除流程！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 154px; z-index:1051;position: fixed;" :icon="DeleteFilled" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="查看流程执行状态列表！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 204px; z-index:1051;position: fixed;" :icon="DataAnalysis" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="重新自动布局,生成新的流程图！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 254px; z-index:1051;position: fixed;" :icon="PictureFilled" />
        </el-tooltip>
        <el-tooltip v-if="graph_locked" class="box-item" effect="dark" content="解锁，使画布可拖拽！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 304px; z-index:1051;position: fixed;" :icon="Lock" />
        </el-tooltip>
        <el-tooltip v-else class="box-item" effect="dark" content="固定画布，使画布不可拖拽！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 304px; z-index:1051;position: fixed;" :icon="Unlock" />
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="切换到主页！">
            <el-button class="!ml-0" plain @click="drawer2 = true" size=""
                style="margin-top: 4px; margin-left: 354px; z-index:1051;position: fixed;" :icon="HomeFilled" />
        </el-tooltip>
        <div id="container" :class="{ containerDark: isDark, containerLight: !isDark }"
            style="min-width: 100%; min-height: 87vh; margin-top: 0px;">
            <div id="stencil">
                <div id="graph-container" class="x6-graph" tabindex="-1"
                    style="width: 10000px; height: 100vh; z-index: 1000;">
                </div>
            </div>
        </div>

        <el-dialog v-model="customDraggingVisible" class="custom-dragging-style" title="" width="500" draggable>
            <span>添加新的任务</span>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="customDraggingVisible = false">取消</el-button>
                    <el-button type="primary" @click="reset_graph">
                        创建
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
    <el-popover :visible="popoverVisible" :width="250" trigger="manual" popper-class="context-menu-popover">
        <template #reference>
            <div style="display: none;"></div>
        </template>

        <el-menu default-active="2" class="el-menu-vertical-demo" style="border: 0px">
            <el-menu-item index="1" @click="RemoveNode">
                <el-icon>
                    <Delete />
                </el-icon>
                <span>删除节点</span>
            </el-menu-item>
            <el-menu-item index="2">
                <el-icon><icon-menu /></el-icon>
                <span>Navigator Two</span>
            </el-menu-item>
            <el-menu-item index="3" disabled>
                <el-icon>
                    <document />
                </el-icon>
                <span>Navigator Three</span>
            </el-menu-item>
            <el-menu-item index="4">
                <el-icon>
                    <setting />
                </el-icon>
                <span>Navigator Four</span>
            </el-menu-item>
        </el-menu>
    </el-popover>
    <el-drawer v-model="drawer2" :direction="drawer_direction" size="50%">
        <template #header>
            <h4>创建任务</h4>
        </template>
        <template #default>
            <CreateNode :pipeline_id="pipeline_id" />
        </template>
    </el-drawer>
</template>

<script lang="ts">
import CreateNode from './CreateNode.vue';

export default {
    name: 'App',
    components: {
        CreateNode,
    },
};


</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
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
import { Plus } from '@element-plus/icons-vue'
import type { SegmentedProps } from 'element-plus'

import {
    Picture,
    List,
    WarningFilled,
    DeleteFilled,
    Delete,
    VideoPlay,
    Edit,
    Document,
    Setting,
    CaretRight,
    View,
    DataAnalysis,
    PictureFilled,
    Lock,
    HomeFilled,
    Unlock,
    Menu as IconMenu,
} from '@element-plus/icons-vue'
import { layout } from 'dagre';
import { useDark, useToggle } from "@vueuse/core";
import { getCurrentInstance } from 'vue';

import emitter from './EventBus';
import axios from 'axios';
import qs from 'qs';

import { onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { ElMessageBox } from 'element-plus'

import type { DrawerProps } from 'element-plus'


const drawer2 = ref(false)
const drawer_direction = ref<DrawerProps['direction']>('rtl')

const containerRef = ref(null);
const popoverVisible = ref(false);
const selectedCell = ref(null);
const menu_click_node = ref(null);
const new_segmented_changed = ref('');
const old_segmented_changed = ref('');
const graph_locked = ref(false);

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

// 正确接收事件
emitter.on('update_graph', (payload) => {
    update_graph(payload)
});

const isDark = useDark();

const customDraggingVisible = ref(false)
const value = ref('pipeline')
const direction = ref<SegmentedProps['direction']>('vertical')
const size = ref<SegmentedProps['size']>('default')
const pipeline_id = ref(-1);
const pipeline_usr_graph = ref();

const getTimestamp = () => {
    return Math.floor(new Date().getTime() / 1000)
}

var prev_save_graph_tm_ms = getTimestamp()
const graph_changed = ref(false)

const RemoveNode = () => {
    delete_node(menu_click_node.value?.id)
    popoverVisible.value = false;
    DirectSaveGraph();
}

const options = [
    {
        label: '添加任务',
        value: 'add_task',
        icon: Picture,
    },
    {
        label: '修改流程',
        value: 'edit',
        icon: Edit,
    },
    {
        label: '执行流程',
        value: 'run',
        icon: VideoPlay,
    },
    {
        label: '流程详情',
        value: 'info',
        icon: WarningFilled,
    },
    {
        label: '执行状态',
        value: 'history',
        icon: List,
    },
    {
        label: '删除流程',
        value: 'delete',
        icon: Delete,
    },
]

const segmentedChange = (value) => {
    ElMessage.success(`切换到: ${value}`);
    new_segmented_changed.value = value
    // if (value == "add_task") {
    //     drawer2.value = true;
    // }
    // ElMessage.success(`切换到: ${value}`);
};



var graph = null;
var second_timer = null;
const initGraph = () => {
    // 为了协助代码演示
    preWork()

    // #region 初始化画布
    graph = new Graph({
        container: document.getElementById('graph-container')!,
        grid: true,
        panning: true,
        mousewheel: {
            enabled: true,
            zoomAtMousePosition: true,
            modifiers: 'ctrl',
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

    // #region 使用插件
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
    // document.getElementById('stencil')!.appendChild(stencil.container)
    // #endregion

    // #region 快捷键与事件
    graph.bindKey(['meta+c', 'ctrl+c'], () => {
        const cells = graph.getSelectedCells()
        if (cells.length) {
            graph.copy(cells)
        }
        return false
    })
    graph.bindKey(['meta+x', 'ctrl+x'], () => {
        const cells = graph.getSelectedCells()
        if (cells.length) {
            graph.cut(cells)
        }
        return false
    })
    graph.bindKey(['meta+v', 'ctrl+v'], () => {
        if (!graph.isClipboardEmpty()) {
            const cells = graph.paste({ offset: 32 })
            graph.cleanSelection()
            graph.select(cells)
        }
        return false
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

            width: 200,
            height: 60,
            attrs: {
                body: {
                    stroke: `var(--el-color-primary)`,
                    strokeWidth: 1,
                    fill: `var(--el-color-primary)`,
                    refWidth: 1,
                    refHeight: 1,
                },
                image: {
                    'xlink:href': '/images/python.png',
                    width: 16,
                    height: 16,
                    x: 12,
                    y: 12,
                    backgroundColor: 'rgba(255,255,255,1)',
                },
                title: {
                    text: 'Node',
                    textWrap: {
                        width: 140,
                    },
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

    graph.on('node:contextmenu', ({ e, node }) => {
        e.preventDefault();
        selectedCell.value = node;

        // 关键步骤: 将鼠标坐标设置到 body 上的 CSS 变量
        document.documentElement.style.setProperty('--popover-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--popover-y', `${e.clientY}px`);
        const popperEl = document.querySelector('.context-menu-popover');
        popperEl.style.setProperty('top', `${e.clientX}px`);
        popperEl.style.setProperty('left', `${e.clientY}px`);

        popoverVisible.value = true;
        menu_click_node.value = node
    });

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
            .post('http://82.156.224.174:7001/pipeline/link_task/', qs.stringify({
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
        if (confirm(`确定要删除这条边吗？ ID: ${edge.id}`)) {
            // `edge` 是事件回调中返回的边实例
            axios
                .post('http://82.156.224.174:7001/pipeline/unlink_task/', qs.stringify({
                    "Link[from]": edge.getSourceNode().id,
                    "Link[to]": edge.getTargetNode().id
                }))
                .then(response => {
                    graph.removeEdge(edge);
                    DirectSaveGraph();
                })
                .catch(error => {
                })
        }
    });


    graph.on('node:changed', handleChange);
    graph.on('edge:changed', handleChange);

    function handleChange() {
        graph_changed.value = true;
    }
}

const update_graph = (data) => {
    if (data == "-1" || data == "1") {
        return;
    }

    pipeline_id.value = data["pipe_id"];
    console.log("pipeline_id.value: %d", pipeline_id.value)
    if (data["pipe_usr_graph"] != null && data["pipe_usr_graph"].length > 0) {
        pipeline_usr_graph.value = JSON.parse(data["pipe_usr_graph"]);
        graph.fromJSON(pipeline_usr_graph.value);
        console.log("valid graph 0");
        return;
    }

    const graph_data: Model.FromJSONData = {
        nodes: [],
        edges: [],
    }

    for (let i = 0; i <= data["task_list"].length; i++) {
        if (data["task_list"][i] == null) {
            continue;
        }

        graph_data.nodes!.push({
            id: "" + data["task_list"][i]["id"],
            shape: 'custom-rect',
            attrs: {
                body: {
                    rx: 6,
                    ry: 6,
                },
                image: {
                    'xlink:href': '/images/shell.png',
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
        ranksep: 22,        // 层间距(px)
        nodesep: 60,        // 节点间距(px)
        controlPoints: true, // 是否保留边的控制点
        sortByCombo: true,  // 是否按combo排序
    })
    const data_json = dagreLayout.layout(graph_data);
    graph.fromJSON(data_json)
    console.log("valid graph 1");
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
    `)
}

function delete_node(id) {
    graph.removeNode(id);
}

function reset_graph() {
    graph.addNode({
        x: 200,
        y: 160,
        shape: 'custom-rect',
        attrs: {
            body: {
                rx: 6,
                ry: 6,
            },
            image: {
                'xlink:href':
                    'https://gw.alipayobjects.com/zos/antfincdn/FLrTNDvlna/antv.png',
                width: 16,
                height: 16,
                x: 12,
                y: 5,
            },
            image0: {
                'xlink:href':
                    'https://gw.alipayobjects.com/zos/antfincdn/FLrTNDvlna/antv.png',
                width: 16,
                height: 16,
                x: 12,
                y: 25,
            },
            title: {
                text: 'Node',
                refX: 40,
                refY: 5,
                fill: 'rgba(255,255,255,1)',
                fontSize: 12,
                'text-anchor': 'start',
            },
            text: {
                text: 'this is content text this is content text this is content text this is content text',
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

    customDraggingVisible.value = false
}

const DirectSaveGraph = () => {
    var test_json = graph.toJSON();
    var str_json = JSON.stringify(test_json, null, 2);
    axios
        .post('http://82.156.224.174:7001/pipeline/update_pipline_graph/' + pipeline_id.value + "/", qs.stringify({
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
            .post('http://82.156.224.174:7001/pipeline/update_pipline_graph/' + pipeline_id.value + "/", qs.stringify({
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

// Initialize on mount
onMounted(() => {
    initGraph();
    second_timer = setInterval(() => {
        TimeToSaveGraph();
    }, 1000);


    document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
    clearInterval(second_timer);
});

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