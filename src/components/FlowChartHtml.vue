<template>

    <div>
        <el-tooltip class="box-item" effect="dark" content="点击创建新的任务！">
            <el-button class="!ml-0" plain @click="customDraggingVisible = true" size="small" type="primary"
                style="margin-top: 4px; margin-left: 4px; z-index:1051;position: fixed;" :icon="Plus" />
        </el-tooltip>
        <el-affix :offset="80" class="fixed-right" style="z-index:1050;">
            <el-segmented v-model="value" :options="options" :direction="direction" :size="size">
                <template #default="scope">
                    <div :class="[
                        'flex',
                        'items-center',
                        'gap-2',
                        'flex-col',
                        direction === 'vertical' && 'p-2',
                    ]">
                        <el-icon size="20" type="primary">
                            <component :is="scope.item.icon" />
                        </el-icon>
                        <div><el-text class="mx-1" size="small">{{ scope.item.label }}</el-text></div>
                    </div>
                </template>
            </el-segmented>
        </el-affix>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
    Delete,
    VideoPlay,
    Edit,
} from '@element-plus/icons-vue'

import { useDark, useToggle } from "@vueuse/core";
const isDark = useDark();

const customDraggingVisible = ref(false)
const value = ref('pipeline')
const direction = ref<SegmentedProps['direction']>('vertical')
const size = ref<SegmentedProps['size']>('default')

const directionOptions = [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
]

const sizeOptions = ['large', 'default', 'small']

const options = [
    {
        label: '流程图',
        value: 'pipeline',
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


var graph = null;
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
                group: 'top',
            },
            {
                group: 'right',
            },
            {
                group: 'bottom',
            },
            {
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
                    stroke: '#5F95FF',
                    strokeWidth: 1,
                    fill: '#409eff',
                    refWidth: 1,
                    refHeight: 1,
                },
                image: {
                    'xlink:href':
                        'https://gw.alipayobjects.com/zos/antfincdn/FLrTNDvlna/antv.png',
                    width: 16,
                    height: 16,
                    x: 12,
                    y: 12,
                },
                title: {
                    text: 'Node',
                    refX: 40,
                    refY: 14,
                    fill: 'rgba(255,255,255,1)',
                    fontSize: 12,
                    'text-anchor': 'start',
                },
                text: {
                    text: 'this is content text',
                    refX: 40,
                    refY: 38,
                    fontSize: 12,
                    fill: 'rgba(255,255,255,1)',
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

    Graph.registerNode(
        'custom-polygon',
        {
            inherit: 'polygon',
            width: 66,
            height: 36,
            attrs: {
                body: {
                    strokeWidth: 1,
                    stroke: '#5F95FF',
                    fill: '#EFF4FF',
                },
                text: {
                    fontSize: 12,
                    fill: '#262626',
                },
            },
            ports: {
                ...ports,
                items: [
                    {
                        group: 'top',
                    },
                    {
                        group: 'bottom',
                    },
                ],
            },
        },
        true,
    )

    Graph.registerNode(
        'custom-circle',
        {
            inherit: 'circle',
            width: 45,
            height: 45,
            attrs: {
                body: {
                    strokeWidth: 1,
                    stroke: '#5F95FF',
                    fill: '#EFF4FF',
                },
                text: {
                    fontSize: 12,
                    fill: '#262626',
                },
            },
            ports: { ...ports },
        },
        true,
    )

    // Graph.registerNode(
    //   'html', 
    //   true,
    // )
    Graph.registerNode(
        'custom-image',
        {
            inherit: 'rect',
            width: 52,
            height: 52,
            markup: [
                {
                    tagName: 'rect',
                    selector: 'body',
                },
                {
                    tagName: 'image',
                },
                {
                    tagName: 'text',
                    selector: 'label',
                },
            ],
            attrs: {
                body: {
                    stroke: '#5F95FF',
                    fill: '#5F95FF',
                },
                image: {
                    width: 26,
                    height: 26,
                    refX: 13,
                    refY: 16,
                },
                label: {
                    refX: 3,
                    refY: 2,
                    textAnchor: 'left',
                    textVerticalAnchor: 'top',
                    fontSize: 12,
                    fill: '#fff',
                },
            },
            ports: { ...ports },
        },
        true,
    )

    graph.on('node:contextmenu', ({ e, node }) => {
        alert("ok");
    });

    graph.on('blank:click', () => {
    });

    graph.on('edge:connected', ({ edge }) => {
        const edgeData = edge.toJSON();
        // graph.removeEdge(edge);
        // const newEdge = graph.addEdge({
        //     ...edgeData, // 拷贝旧边的所有数据
        //     id: 'new-edge-id', // 重新指定新的 ID
        // });

        // console.log('一条新边被添加了！');
        // console.log('边的 ID:', newEdge.id);
        // console.log('边的源节点:', newEdge.getSourceNode().id);
        // console.log('边的目标节点:', newEdge.getTargetNode().id);
        // alert(`新边已从 ${newEdge.getSourceNode().id} 连接到 ${newEdge.getTargetNode().id}}`);
    });

    graph.on('edge:click', ({ edge }) => {
        // 弹出确认框
        if (confirm(`确定要删除这条边吗？ ID: ${edge.id}`)) {
            // `edge` 是事件回调中返回的边实例
            graph.removeEdge(edge);
            console.log(`边 ${edge.id} 已被删除。`);
        }
    });

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
      .my-btn{
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
  `)
}

function delete_node(id) {
    graph.removeNode(id);
}

function reset_graph() {
    // graph.addNode({
    //     x: 280,
    //     y: 120,
    //     width: 120,
    //     height: 45,
    //     shape: 'html',
    //     html() {
    //         const wrap = document.createElement('div')
    //         wrap.innerHTML = `
    //   <a href="#" class="my-btn">
    //     Submit
    //   </a>`
    //         return wrap
    //     },
    // })

    const source = graph.addNode({
        x: 40,
        y: 40,
        width: 100,
        height: 40,
        shape: 'html',
        html() {
            const wrap = document.createElement('div')
            wrap.style.width = '100%'
            wrap.style.height = '100%'
            wrap.style.background = '#f0f0f0'
            wrap.style.display = 'flex'
            wrap.style.justifyContent = 'center'
            wrap.style.alignItems = 'center'

            wrap.innerText = 'Hello'
            wrap.style.zIndex = 100000
            return wrap
        },
    })

    // const wrap = document.createElement('div')
    // wrap.style.width = '100%'
    // wrap.style.height = '100%'
    // wrap.style.background = '#f0f0f0'
    // wrap.style.display = 'flex'
    // wrap.style.justifyContent = 'center'
    // wrap.style.alignItems = 'center'
    // wrap.innerText = 'World'

    // const target = graph.addNode({
    //     x: 180,
    //     y: 160,
    //     width: 100,
    //     height: 40,
    //     shape: 'html',
    //     html: wrap,
    // })

    // const node = graph.addNode({
    //     x: 80,
    //     y: 80,
    //     width: 160,
    //     height: 60,
    //     shape: 'html',
    //     data: {
    //         time: new Date().toString(),
    //     },
    //     html: {
    //         render(node: Cell) {
    //             const data = node.getData() as any
    //             return (
    //                 `<div>
    //       <span>${data.time}</span>
    //     </div>`
    //             )
    //         },
    //         shouldComponentUpdate(node: Cell) {
    //             // 控制节点重新渲染
    //             return node.hasChanged('data')
    //         },
    //     },
    // })

    // graph.addNode({
    //     x: 200,
    //     y: 160,
    //     shape: 'custom-rect',
    //     attrs: {
    //         body: {
    //             rx: 6,
    //             ry: 6,
    //         },
    //         image: {
    //             'xlink:href':
    //                 'https://gw.alipayobjects.com/zos/antfincdn/FLrTNDvlna/antv.png',
    //             width: 16,
    //             height: 16,
    //             x: 12,
    //             y: 5,
    //         },
    //         title: {
    //             text: 'Node',
    //             refX: 40,
    //             refY: 5,
    //             fill: 'rgba(255,255,255,1)',
    //             fontSize: 12,
    //             'text-anchor': 'start',
    //         },
    //         text: {
    //             text: 'this is content text this is content text this is content text this is content text',
    //             refX: 40,
    //             refY: 38,
    //             fontSize: 12,
    //             textWrap: {
    //                 width: 130, // 文本的有效宽度，通常比节点的宽度小一些，留出边距
    //                 height: 60, // 文本的最大高度
    //                 ellipsis: true, // 超过高度时显示省略号
    //             },
    //             // 其他文本样式
    //             fill: '#000',
    //             fontFamily: 'Arial',
    //             fill: 'rgba(255,255,255,1)',
    //             'text-anchor': 'start',
    //         },
    //     },
    // })

    customDraggingVisible.value = false
    // var test_json = graph.toJSON();
    // graph.fromJSON(test_json)
}

// Initialize on mount
onMounted(() => {
    initGraph();
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
</style>