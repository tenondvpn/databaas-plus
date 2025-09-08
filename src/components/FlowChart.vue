<template>
    <!-- <div v-if="choosed_pipeline"> -->
        <Graph />
    <!-- </div> -->

    <!-- <div v-if="!choosed_pipeline">
        <HomeView />
    </div> -->

</template>

<script lang="ts">
import Graph from './Graph.vue';
import HomeView from './HomeView.vue';

export default {
    name: 'App',
    components: {
        Graph,
        HomeView,
    },
};


</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import emitter from './EventBus';

// 正确接收事件
emitter.on('show_update_graph', (payload) => {
    update_graph(payload)
});

const choosed_pipeline = ref(false)

const update_graph = (data) => {
    if (data == "-1") {
        // choosed_pipeline.value = false;
        return;
    }

    choosed_pipeline.value = true;
    
}


</script>
