<template>
  <el-carousel height="87vh" direction="vertical" :autoplay="false">
    <el-carousel-item>
        <FlowChart />
    </el-carousel-item>
  </el-carousel>
</template>

<script lang="ts">
import FlowChart from './FlowChart.vue';

export default {
    name: 'App',
    components: {
        FlowChart,
    },
};
</script>

<script lang="ts" setup>
import { ref } from 'vue'

import type { TabsInstance } from 'element-plus'
const tabPosition = ref<TabsInstance['tabPosition']>('right')
</script>


<style scoped>
.el-carousel__item h3 {
  color: #475669;
  opacity: 0.75;
  line-height: 200px;
  margin: 0;
  text-align: center;
}

.el-carousel__item:nth-child(2n) {
  background-color: #99a9bf;
}

.el-carousel__item:nth-child(2n + 1) {
  background-color: #d3dce6;
}
</style>
