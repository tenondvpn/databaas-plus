<template>
  <el-tabs type="border-card" class="demo-tabs">
    <el-tab-pane>
      <template #label>
        <span class="custom-tabs-label">
          <el-icon><calendar /></el-icon>
          <span>模板任务详情</span>
        </span>
      </template>
      <ProcessorInfo :processor_info="processor_info"/>
    </el-tab-pane>
    <el-tab-pane >
        <template #label>
        <span class="custom-tabs-label">
          <el-icon><calendar /></el-icon>
          <span>版本管理</span>
        </span>
      </template>
      <ProcessorVersions :processor_info="processor_info"/>
    </el-tab-pane>
    <el-tab-pane >
         <template #label>
        <span class="custom-tabs-label">
          <el-icon><calendar /></el-icon>
          <span>引用信息</span>
        </span>
      </template>
      <ProcessorQuote :processor_info="processor_info"/>
    </el-tab-pane>
  </el-tabs>
</template>

<script lang="ts">
import ProcessorInfo from './ProcessorInfo.vue';
import ProcessorVersions from './ProcessorVersions.vue';
import ProcessorQuote from './ProcessorQuote.vue';
import emitter from './EventBus';

export default {
    name: 'App',
    components: {
        ProcessorInfo,
        ProcessorVersions,
    },
};
</script>

<script lang="ts" setup>
import { ref, defineProps, onMounted, onBeforeUnmount } from 'vue'
import { Calendar } from '@element-plus/icons-vue'

const processor_info = ref()
const props = defineProps({
    processor_info: Map,
});

onMounted(() => {
  emitterOn();
})

onBeforeUnmount(() => {
  emitterOff();
})

const emitterOn = () => {
  // emitter.on('upate_processor_to_show_detail', (proc_info) => {
  //       console.log("00003 upate_processor_to_show_detail coming.")
  //     processor_info.value = proc_info
  // })
}

const emitterOff = () => {
  // emitter.off('upate_processor_to_show_detail', null);
}


</script>

<style>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}
.demo-tabs .custom-tabs-label .el-icon {
  vertical-align: middle;
}
.demo-tabs .custom-tabs-label span {
  vertical-align: middle;
  margin-left: 4px;
}
</style>
