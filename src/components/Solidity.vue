<script lang="ts">
import Header from './Header.vue';
import Tree from './Tree.vue';
import FlowChart from './FlowChart.vue';
import SolidityEditor from './SolidityEditor.vue';
import SolidityStatus from './SolidityStatus.vue';
import { update } from 'lodash';
import emitter from './EventBus';
import { onMounted } from 'vue';
import { ref } from 'vue';
import { nextTick } from 'vue';

export default {
    name: 'App',
    components: {
        Header,
        Tree,
        FlowChart,
    },
};
</script>


<script lang="ts" setup>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const solidity_editor = ref();
const solidity_status = ref();

const handleResize = (index: number, sizes: number[]) => {
    emitter.emit('update_soldity_height', sizes[0]);
    emitter.emit('update_soldity_status_height', sizes[1]);
}

const winHandleResize = () => {
    emitter.emit('update_soldity_height', solidity_editor.value.$refs.panelEl.offsetHeight);
    emitter.emit('update_soldity_status_height', solidity_status.value.$refs.panelEl.offsetHeight);
}

onMounted(() => {
    window.addEventListener('resize', winHandleResize);
    // // 初始化时触发一次调整
    // nextTick(() => {
    //     winHandleResize();
    // });
    setTimeout(() => {
        winHandleResize();
    }, 100);
});

</script>

<style>
.splitpanes--vertical>.splitpanes__splitter {
    min-width: 6px;
    cursor: col-resize;
}

.splitpanes--vertical>.splitpanes__splitter:before {
    margin-left: -2px;
}

.splitpanes--vertical>.splitpanes__splitter:after {
    transform: translateY(-50%);
    width: 1px;
    height: 50px;
    content: "";
    position: absolute;
    top: 40%;
    /* left: 0; */
    background-color: #00000026;
    border: 1px solid #ffffff;
    transition: background-color .3s;
}

.el-main {
    --el-main-padding: 0px;
    box-sizing: border-box;
    display: block;
    flex: 1;
    flex-basis: auto;
    overflow: auto;
    /* padding: var(--el-main-padding); */
    padding-top: 10px;
}

/* .demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
} */

.el-tabs--right .el-tabs__content,
.el-tabs--left .el-tabs__content {
    height: 100%;
}
</style>

<template>
    <div class="common-layout">
        <el-container>
            <el-container style="margin-top: 0px;">
                <el-main style="padding: 0px;">
                    <splitpanes horizontal :push-other-panes="true" style="height: 90vh;">
                        <pane>
                            <splitpanes vertical :push-other-panes="true">
                                <pane size="25">
                                    <Tree />
                                </pane>
                                <pane size="75">
                                    <div style="height: 87.5vh; box-shadow: var(--el-border-color-light) 0px 0px 10px">
                                        <el-splitter layout="vertical" @resize="handleResize" style="height: 100%;">
                                            <el-splitter-panel size="81%" ref="solidity_editor">
                                                <SolidityEditor />
                                            </el-splitter-panel>
                                            <el-splitter-panel ref="solidity_status">
                                                <SolidityStatus />
                                            </el-splitter-panel>
                                        </el-splitter>
                                    </div>
                                </pane>
                            </splitpanes>
                        </pane>
                    </splitpanes>
                </el-main>
               
            </el-container>
        </el-container>
    </div>

</template>



<style lang="css" scoped>
.demo-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}
</style>