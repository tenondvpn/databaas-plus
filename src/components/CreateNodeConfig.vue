<template>
    <el-form ref="formRef" :model="dynamicForm" :rules="rules" label-width="0px" class="dynamic-form-container">
        <el-form-item style="margin-top: 10px;" v-for="(item, index) in dynamicForm.items" :key="index"
            :prop="'items.' + index + '.value'" :rules="{
                required: false,
                message: '',
                trigger: 'blur',
            }">

            <el-row :gutter="37">
                <el-col :span="6" style="padding: 0px; width: 297px; padding-left: 18px;">
                    <el-input v-model="item.key" aria-label="参数名" placeholder="参数名" />
                </el-col>
                <el-col :span="1" style="padding: 0px;margin-left:10px;margin-right:-4px"> :
                </el-col>
                <el-col :span="16" style="padding: 0px;">
                    <el-input v-model="item.value" aria-label="参数值" placeholder="参数值" />
                </el-col>
            </el-row>
            <el-button size="small" type="primary" style="margin-left: 20px;" :icon="Minus" circle @click.prevent="removeItem(item)" class="remove-btn" />
        </el-form-item>

        <el-form-item  text-align="center">
            <el-button type="primary" @click="addItem" style="margin-top: 20px;">
                <el-icon>
                    <Plus />
                </el-icon>
                新增参数
            </el-button>
        </el-form-item>
    </el-form>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { Minus, Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const formRef = ref(null);

// 核心数据模型：一个包含动态表单项的数组
const dynamicForm = reactive({
    items: [
        // { pipeline: '' }, // 每个对象代表一个动态项的数据
        // { task: '' }, // 每个对象代表一个动态项的数据
    ],
});

// 表单校验规则（可选）
const rules = reactive({
    // 这里可以定义其他静态表单项的规则
});

// 移除表单项
const removeItem = (item) => {
    const index = dynamicForm.items.indexOf(item);
    if (index !== -1) {
        dynamicForm.items.splice(index, 1);
    }
};

// 增加表单项
const addItem = () => {
    dynamicForm.items.push({
        pipeline: '',
        task: '',
    });
};

const GetConfigs = () => {
    return dynamicForm.items
}

const ResetForm = () => {
    dynamicForm.items = []
}

defineExpose({
    GetConfigs,
    ResetForm,
});

</script>

<style scoped>
.dynamic-form-container {
    max-width: 600px;
    /* margin: 50px auto; */
}

.input-item {
    width: 80%;
    margin-right: 10px;
}

.remove-btn {
    vertical-align: top;
}
</style>