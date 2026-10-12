<template>
    <div class="kv-page" :class="{ 'kv-page--data-expanded': dataExpanded }">
        <el-card shadow="never" class="kv-card kv-card--config" v-show="!dataExpanded">
            <template #header>
                <div class="kv-header">
                    <div class="kv-header-left">
                        <el-button link size="small" @click="configCollapsed = !configCollapsed">
                            <el-icon><ArrowDown v-if="!configCollapsed" /><ArrowRight v-else /></el-icon>
                        </el-button>
                        <span class="kv-title">去中心化数据库</span>
                    </div>
                    <div class="kv-header-actions">
                        <el-tag :type="contractReady ? 'success' : 'info'" effect="dark" size="small">
                            {{ contractReady ? `已连接 · ${totalKeys} 条` : '未连接' }}
                        </el-tag>
                    </div>
                </div>
            </template>

            <el-form v-show="!configCollapsed" :model="form" label-width="110px" label-position="left" class="kv-form">
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="合约地址">
                            <el-input v-model="form.contractAddress" placeholder="40 位十六进制，可带 0x 前缀"
                                clearable @change="persist" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="节点地址">
                            <el-input v-model="form.nodeUrl" placeholder="留空则走 /api/shardN/ 代理" clearable
                                @change="persist" />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="分片 ID">
                            <el-select v-model="form.shardId" style="width: 100%" @change="persist">
                                <el-option v-for="s in shards" :key="s" :label="`分片 ${s}`" :value="s" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="写入私钥">
                            <el-input v-model="form.privateKey" type="password" show-password
                                placeholder="用于签名写入交易，仅存本地浏览器" @change="persist" />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="gas 垫付">
                            <el-input-number v-model="form.prepay" :min="0" :step="1000000" :controls="false"
                                style="width: 100%" @change="persist" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="记录平台请求">
                            <el-switch v-model="form.enabled" active-text="开启后每次请求写入合约"
                                @change="persist" />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-form-item>
                    <el-button type="primary" :loading="testing" @click="testConnection">测试连接</el-button>
                    <el-button type="success" :loading="prefunding" :disabled="!form.contractAddress || !form.privateKey"
                        @click="doPrefund">垫付 gas</el-button>
                    <el-button :disabled="!contractReady" :loading="loading" @click="refresh">刷新数据</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card shadow="never" class="kv-card kv-card--data">
            <template #header>
                <div class="kv-header">
                    <div class="kv-header-left">
                        <el-button link size="small" @click="dataCollapsed = !dataCollapsed">
                            <el-icon><ArrowDown v-if="!dataCollapsed" /><ArrowRight v-else /></el-icon>
                        </el-button>
                        <span class="kv-title">合约数据</span>
                    </div>
                    <div class="kv-header-actions">
                        <el-input v-model="searchText" placeholder="过滤当前页的 key / value" size="small"
                            clearable style="width: 240px" />
                        <el-button link size="small" :title="dataExpanded ? '退出全屏' : '全屏查看'"
                            @click="toggleDataExpanded">
                            <el-icon><FullScreen v-if="!dataExpanded" /><Aim v-else /></el-icon>
                        </el-button>
                    </div>
                </div>
            </template>

            <div v-show="!dataCollapsed" class="kv-table-wrap">
                <el-table :data="filteredRows" v-loading="loading" border stripe class="kv-table"
                    :height="tableHeight" size="small" empty-text="暂无数据">
                    <el-table-column type="index" label="#" width="60" fixed
                        :index="(i) => (page - 1) * pageSize + i + 1" />
                    <el-table-column prop="key" label="Key" min-width="240" show-overflow-tooltip />
                    <el-table-column label="Value" min-width="420">
                        <template #default="{ row }">
                            <div class="kv-value-cell">
                                <el-button link type="primary" size="small" @click="openValue(row)">
                                    查看/展开
                                </el-button>
                                <span class="kv-value-preview">{{ preview(row.value) }}</span>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div v-show="!dataCollapsed" class="kv-pager">
                <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="totalKeys"
                    :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
                    @current-change="loadPage" @size-change="onSizeChange" />
            </div>
        </el-card>

        <el-card shadow="never" class="kv-card kv-card--writes" v-show="!dataExpanded">
            <template #header>
                <div class="kv-header">
                    <div class="kv-header-left">
                        <el-button link size="small" @click="writesCollapsed = !writesCollapsed">
                            <el-icon><ArrowDown v-if="!writesCollapsed" /><ArrowRight v-else /></el-icon>
                        </el-button>
                        <span class="kv-title">最近的写入</span>
                    </div>
                    <span class="kv-hint">本页只记录当前浏览器会话内的写入结果</span>
                </div>
            </template>
            <el-table v-show="!writesCollapsed" :data="writes" border size="small" height="220"
                empty-text="本次会话暂无写入">
                <el-table-column prop="key" label="Key" width="220" />
                <el-table-column label="结果" width="100">
                    <template #default="{ row }">
                        <el-tag :type="row.ok ? 'success' : 'danger'" size="small">
                            {{ row.ok ? '成功' : '失败' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="size" label="字节" width="90" />
                <el-table-column prop="msg" label="信息" min-width="240" show-overflow-tooltip />
            </el-table>
        </el-card>

        <el-dialog v-model="valueVisible" :title="activeRow?.key ?? 'Value'" width="70%">
            <el-input :model-value="prettyValue" type="textarea" :rows="18" readonly />
            <template #footer>
                <el-button @click="copyValue">复制</el-button>
                <el-button type="primary" @click="valueVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { ArrowDown, ArrowRight, FullScreen, Aim } from '@element-plus/icons-vue'
import {
    getPaginated,
    prefundGas,
    probeContract,
    shardBaseUrl,
} from '../services/kvDatabase'
import {
    CONFIG_CHANGED,
    loadConfig,
    recentWrites,
    saveConfig,
} from '../services/kvLogger'
import { getKeypair } from '../services/signing'

// 共识分片。2 号是 root 国会网络，不做交易共识，因此不在此列。
const shards = [3, 4, 5, 6]

const form = ref({
    contractAddress: '',
    nodeUrl: '',
    shardId: 3,
    privateKey: '',
    prepay: 3000000,
    enabled: false,
})

const rows = ref([])
const page = ref(1)
const pageSize = ref(20)
const totalKeys = ref(0)
const loading = ref(false)
const testing = ref(false)
const prefunding = ref(false)
const contractReady = ref(false)
const searchText = ref('')
const valueVisible = ref(false)
const activeRow = ref<any>(null)
const writes = ref<any[]>([])

// 三张卡片各自可收缩；「合约数据」还可全屏。全屏时其余卡片整体让位，
// 只留表格与分页占满菜单以下的全部高度。
// 配置卡（标题「去中心化数据库」）默认收起，进页面先看到数据而不是表单。
const configCollapsed = ref(true)
const dataCollapsed = ref(false)
const writesCollapsed = ref(false)
const dataExpanded = ref(false)

/**
 * 表格高度。
 *
 * el-table 只接受确定的数值或百分号，`calc()` 字符串不走它的高度计算，给百分比
 * 则要求父层有确定高度 —— 而这里父层高度是 flex 算出来的。所以直接按视口高度
 * 自己算一个整数：全屏时减去菜单和表头/分页条，非全屏时保持原来的固定值。
 */
const MENU_H = 44
const viewportH = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const tableHeight = computed(() => dataExpanded.value
    ? Math.max(200, viewportH.value - MENU_H - 190)
    : 420)

function onResize() {
    viewportH.value = window.innerHeight
}

const baseUrl = computed(() => shardBaseUrl(form.value.shardId, form.value.nodeUrl))

function toggleDataExpanded() {
    dataExpanded.value = !dataExpanded.value
    // 全屏是悬浮层，底层不应跟着滚；退出时再把滚动交还页面
    document.body.style.overflow = dataExpanded.value ? 'hidden' : ''
}

const filteredRows = computed(() => {
    const q = searchText.value.trim().toLowerCase()
    if (!q) return rows.value
    return rows.value.filter(r =>
        String(r.key).toLowerCase().includes(q) || String(r.value).toLowerCase().includes(q),
    )
})

const prettyValue = computed(() => {
    if (!activeRow.value) return ''
    const v = activeRow.value.value
    try {
        return JSON.stringify(JSON.parse(v), null, 2)
    } catch (_) {
        return v
    }
})

function preview(value) {
    const text = String(value ?? '')
    return text.length > 160 ? text.slice(0, 160) + '…' : text
}

function openValue(row) {
    activeRow.value = row
    valueVisible.value = true
}

async function copyValue() {
    try {
        await navigator.clipboard.writeText(prettyValue.value)
        ElMessage.success('已复制')
    } catch (_) {
        ElMessage.warning('复制失败，请手动选择文本')
    }
}

function persist() {
    saveConfig({
        contractAddress: form.value.contractAddress.trim(),
        nodeUrl: form.value.nodeUrl.trim(),
        shardId: form.value.shardId,
        privateKey: form.value.privateKey.trim(),
        prepay: form.value.prepay,
        enabled: form.value.enabled,
    })
}

async function testConnection() {
    if (!form.value.contractAddress) {
        ElMessage.warning('请先填写合约地址')
        return
    }
    persist()
    testing.value = true
    try {
        const res = await syncConnection()
        if (res.ok) {
            ElMessage.success(`连接成功，合约内共 ${res.total} 条数据`)
            await loadPage()
        } else {
            ElNotification({ title: '连接失败', message: res.msg, type: 'error', position: 'top-left' })
        }
    } finally {
        testing.value = false
    }
}

async function doPrefund() {
    if (!form.value.privateKey) {
        ElMessage.warning('垫付 gas 需要私钥')
        return
    }
    persist()
    prefunding.value = true
    try {
        const res = await prefundGas(
            baseUrl.value, form.value.privateKey, form.value.shardId,
            form.value.contractAddress, form.value.prepay,
        )
        if (res.ok) {
            ElMessage.success('垫付已落块，可以开始写入')
        } else {
            ElNotification({ title: '垫付失败', message: res.msg, type: 'error', position: 'top-left' })
        }
    } finally {
        prefunding.value = false
    }
}

async function loadPage() {
    if (!form.value.contractAddress) return
    loading.value = true
    try {
        const offset = (page.value - 1) * pageSize.value
        const res = await getPaginated(baseUrl.value, form.value.contractAddress, offset, pageSize.value)
        if (res.ok) {
            rows.value = res.entries
        } else {
            rows.value = []
            ElNotification({ title: '查询失败', message: res.msg, type: 'error', position: 'top-left' })
        }
    } finally {
        loading.value = false
    }
}

function onSizeChange() {
    page.value = 1
    loadPage()
}

/**
 * 探一次合约并把连接状态同步到界面。
 *
 * 连接状态不能只由「测试连接」按钮维护：刷新页面/切菜单回来时也要能恢复，
 * 否则配置还在、数据也读得出来，界面却显示未连接、按钮全灰。
 */
async function syncConnection() {
    const res = await probeContract(baseUrl.value, form.value.contractAddress)
    contractReady.value = !!res.ok
    if (res.ok) totalKeys.value = res.total ?? 0
    return res
}

// 分片 ID 或节点地址一改，baseUrl 就变了，之前那次探测的结论随即失效，
// 所以要重新探一次。私钥、开关不影响读接口，不必跟着重探。
let lastProbeTarget = ''
function probeTarget() {
    return `${form.value.shardId}|${form.value.nodeUrl}|${form.value.contractAddress}`
}

async function refresh() {
    await syncConnection()
    lastProbeTarget = probeTarget()
    await loadPage()
    writes.value = recentWrites()
}

function syncFromConfig() {
    const cfg = loadConfig()
    form.value = {
        contractAddress: cfg.contractAddress ?? '',
        nodeUrl: cfg.nodeUrl ?? '',
        shardId: cfg.shardId ?? 3,
        privateKey: cfg.privateKey ?? '',
        prepay: cfg.prepay ?? 3000000,
        enabled: !!cfg.enabled,
    }
}

const onConfigChanged = async () => {
    writes.value = recentWrites()
    // 分片/节点/合约地址被改过（可能来自另一个页面或本页表单）时，
    // 现有的连接状态已经不作数，重新探测。
    if (form.value.contractAddress && probeTarget() !== lastProbeTarget) {
        await syncConnection()
        lastProbeTarget = probeTarget()
    }
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && dataExpanded.value) {
        dataExpanded.value = false
        document.body.style.overflow = ''
    }
}

onMounted(async () => {
    syncFromConfig()
    writes.value = recentWrites()
    window.addEventListener(CONFIG_CHANGED, onConfigChanged)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', onResize)
    if (form.value.contractAddress) {
        await refresh()
    }
})

onBeforeUnmount(() => {
    window.removeEventListener(CONFIG_CHANGED, onConfigChanged)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onResize)
    document.body.style.overflow = ''
})
</script>

<style scoped>
/* 视口减去顶部菜单后的整块区域，滚动只发生在 .kv-page 内部。
   根节点用 .kv-page 而非 el-main，避免与 Pipeline.vue 里的全局 .el-main 规则串味。 */
.kv-page {
    position: relative;
    height: calc(100vh - 44px);
    height: calc(100dvh - 44px);
    padding: 12px 16px;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.kv-page--data-expanded {
    overflow: hidden;
    padding: 0;
}

.kv-card {
    background: var(--el-bg-color);
    flex-shrink: 0;
}

/* 全屏：表格卡片脱离常规流，铺满菜单以下的整个区域 */
.kv-card--data {
    transition: box-shadow 0.2s;
}

.kv-page--data-expanded .kv-card--data {
    position: fixed;
    top: 44px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    margin: 0;
    border-radius: 0;
    display: flex;
    flex-direction: column;
}

.kv-page--data-expanded .kv-card--data :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.kv-table-wrap {
    flex: 1;
    min-height: 0;
}

.kv-table {
    width: 100%;
}

.kv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.kv-header-left {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
}

.kv-title {
    font-size: 15px;
    font-weight: 600;
}

.kv-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.kv-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.kv-form {
    margin-bottom: -10px;
}

.kv-value-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.kv-value-preview {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.kv-pager {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
}
</style>
