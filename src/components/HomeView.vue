<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import ScaleScreen from "./scale-screen";
import Headers from "./header.vue";
import Setting from "./setting.vue";
import { useSettingStore } from "../../stores/index";
import { storeToRefs } from "pinia";
import MessageContent from "./Plugins/MessageContent";
import Dashboard from "./views/Dashboard.vue";

const settingStore = useSettingStore();
const { isScale } = storeToRefs(settingStore);
const wrapperStyle = {};
</script>

<template>
    <scale-screen width="1920" height="1080" :delay="500" :fullScreen="false" :boxStyle="{
        background: '#03050C',
        overflow: isScale ? 'hidden' : 'auto',
    }" :wrapperStyle="wrapperStyle" :autoScale="isScale">
        <div class="content_wrap">
            <Headers />
            <Dashboard />
            <MessageContent />
        </div>
    </scale-screen>
    <Setting />
</template>
<style lang="scss" scoped>
.content_wrap {
    width: 100%;
    height: 100%;
    padding: 16px 16px 16px 16px;
    box-sizing: border-box;
    background-image: url("@/assets/img/pageBg.png");
    background-size: cover;
    background-position: center center;
}
</style>
