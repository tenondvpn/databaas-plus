<template>
    <el-form :model="form" label-width="auto" style="max-width: 600px">
        <el-form-item label="执行时间">
            <el-input v-model="form.runtime" style="width:91%" />
            <el-popover placement="right" :width="520" trigger="hover">
                <template #reference>
                    <el-button plain style="margin-left: 12px;" :icon="QuestionFilled" circle />
                </template>
                <el-alert type="info" show-icon :closable="false" :style="`border: 1px solid --el-color-primary;`">
                    <p>重跑时间举例，每次最多24个重跑时间,例如:</p>
                    <el-row>
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 20px; text-align: left;color: var(--el-color-primary);">
                                天级</p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">20250910</p>
                        </el-col>
                    </el-row>
                    <el-row style="margin-top: 0px;">
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 20px; text-align: left;color: var(--el-color-primary);">
                                天级批量</p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">20250901,20250910</p>
                        </el-col>
                    </el-row>
                    <el-row style="margin-top: 0px;">
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 20px; text-align: left; color: var(--el-color-primary);">
                                小时级</p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">202509101100</p>
                        </el-col>
                    </el-row>
                    <el-row style="margin-top: 0px;">
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 20px; text-align: left;color: var(--el-color-primary);">
                                天级区间</p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">20250901-20250910</p>
                        </el-col>
                    </el-row>
                    <el-row style="margin-top: 0px;">
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 20px; text-align: left;color: var(--el-color-primary);">
                                小时级区间</p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">2025091000-2025091010</p>
                        </el-col>
                    </el-row>
                </el-alert>
            </el-popover>
        </el-form-item>

        <el-form-item label="并发数">
            <el-input-number v-model="form.Concurrency" :min="1" :max="128" @change="handleChange" style="width:91%" />
            <el-popover placement="right" :width="520" trigger="hover">
                <template #reference>
                    <el-button plain style="margin-left: 12px;" :icon="QuestionFilled" circle />
                </template>
                <el-alert type="info" show-icon :closable="false" :style="`border: 1px solid --el-color-primary;`">
                    <p>并发数（不能超过10）：</p>
                    <el-row style="margin-top: 0px;width: 100%;">
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 0px; text-align: left;color: var(--el-color-primary);">
                                等于0：
                            </p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">随机并发执行</p>
                        </el-col>
                    </el-row>
                    <el-row style="margin-top: 0px;width: 300px;">
                        <el-col :span="8">
                            <p
                                style="margin-top: 0px; margin-right: 0px; text-align: left;color: var(--el-color-primary);">
                                大于0：
                            </p>
                        </el-col>
                        <el-col :span="16">
                            <p style="margin-top: 0px;">依次按照执行时间串行执行</p>
                        </el-col>
                    </el-row>
                </el-alert>
            </el-popover>
        </el-form-item>


        <el-form-item label="执行的任务">
            <el-checkbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAllChange" style="color: var(--el-color-primary);">
                选择所有任务
            </el-checkbox>
        <el-divider border-style="dashed" />
            <el-checkbox-group v-model="form.tasks" @change="handleCheckedCitiesChange">
                <el-checkbox v-for="task in allTasks" :key="task.id" :value="task.id" :label="task.name"> </el-checkbox>
            </el-checkbox-group>
        </el-form-item>
        <el-divider border-style="dashed" />
        <el-form-item>
            <el-button plain type="primary" @click="runTasks" :icon="VideoPlay">
                立即执行
            </el-button>
        </el-form-item>
    </el-form>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { defineProps } from 'vue';
import {
    VideoPlay,
    QuestionFilled,
} from '@element-plus/icons-vue'
import type { CheckboxValueType } from 'element-plus'
import axios from 'axios';
import { ElMessage } from 'element-plus';
import qs from 'qs';
import emitter from './EventBus';

const props = defineProps({
    all_tasks: Map,
});

const allTasks = ref({})
const allTasksId = ref([])

const handleChange = (value: number | undefined) => {
    console.log(value)
}

function formatTime(format = 'YYYY-MM-DD') {
  const date = new Date();
  const map = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, matched => map[matched]);
}

// do not use same name with ref
const form = reactive({
    runtime: '',
    Concurrency: 1,
    tasks: [],
})

onMounted(() => {
    allTasks.value = props.all_tasks!['task_list']
    for (const item of props.all_tasks!['task_list']) {
        allTasksId.value.push(item.id)
    }

    form.tasks = allTasksId.value
    isIndeterminate.value = false
    checkAll.value = true
    form.runtime = formatTime("YYYYMMDDHHmm")
});

const runTasks = () => {
    axios
        .post('/pipeline/run_tasks/', qs.stringify({
            'task_id_list': form.tasks.toString(),
            'run_time': form.runtime,
            'ordered_num': 0
        }))
        .then(response => {
            ElMessage.success("重跑流程成功！")
            emitter.emit('success_run_tasks', "")
        })
        .catch(error => {
            ElMessage.success("重跑流程失败：" + error)
        })
}


const checkAll = ref(false)
const isIndeterminate = ref(true)

const handleCheckAllChange = (val: CheckboxValueType) => {
    form.tasks = val ? allTasksId.value : []
    isIndeterminate.value = false
}

const handleCheckedCitiesChange = (value: CheckboxValueType[]) => {
    const checkedCount = value.length
    checkAll.value = checkedCount === allTasks.value.length
    isIndeterminate.value = checkedCount > 0 && checkedCount < allTasks.value.length
}

</script>
