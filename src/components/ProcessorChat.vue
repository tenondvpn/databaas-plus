<template>
    <div v-if="!choosed_processor">
        <HomeView :is_processor="true" :project_path="project_path_str" />
    </div>

    <div :style="{ marginTop: dynamicMargin + 'px' }">
        <ProcessorDetail :processor_info="processor_info" />
    </div>
</template>

<script lang="ts">
import ProcessorDetail from './ProcessorDetail.vue';
import HomeView from './HomeView.vue';

export default {
    name: 'App',
    components: {
        ProcessorDetail,
        HomeView,
    },
};


</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, defineProps } from 'vue';
import emitter from './EventBus';

const project_path_str = ref('我的项目')
const choosed_processor = ref(false)
const choosed_processor_id = ref('')
const dynamicMargin = ref(10000)
const processor_info = ref()
const props = defineProps({
    processor_info: Map,
});

onMounted(() => {
    if (props.processor_info && props.processor_info.proc_detail) {
        choosed_processor.value = true
        dynamicMargin.value = 0;
        processor_info.value = props.processor_info
    }
});

// 正确接收事件
emitter.on('upate_processor_to_show_detail', (payload) => {
    update_processor(payload)
});


emitter.on('delete_processor_success', (payload) => {
    console.log("delete_processor_success: ", payload, choosed_processor_id.value)
    if (payload == choosed_processor_id.value) {
        choosed_processor.value = false;
        dynamicMargin.value = 10000;
    }
});

emitter.on("create_processor_success", (payload) => {
    choosed_processor.value = true;
    dynamicMargin.value = 0;
    choosed_processor_id.value = payload["id"]
    console.log("create processor: ", choosed_processor_id.value, payload)
    update_processor(payload)
});

const update_processor = (data) => {
    if (data["tag"] == "-1") {
        choosed_processor.value = false;
        dynamicMargin.value = 10000;
        project_path_str.value = data["project_path"]
        choosed_processor_id.value = ''
        console.log("update_processor: ", choosed_processor_id.value, data)
        return;
    }

    processor_info.value = data
    console.log("update_processor: ", choosed_processor_id.value, data)
    choosed_processor.value = true;
    dynamicMargin.value = 0;
    project_path_str.value = data["project_path"]
    choosed_processor_id.value = data.proc_detail.processor.project_id + "_" + data.proc_detail.processor.id
}


</script>
