<template>
    <div class="editor-container" :class="{ 'fullscreen': isFullscreen }">
        <div class="editor-wrapper" ref="editorContainer">
            <div ref="editorElement" class="code-editor"></div>
        </div>
    </div>

    <el-dialog v-model="dialogFormVisible" :title=dialogTitle width="500">
        <el-form ref="formRef" :model="form" style="margin-top: 10px;" label-width="0px" class="dynamic-form-container">
            <el-form-item v-if="not_constructer">
                <el-row :gutter="37">
                    <el-col :span="7" style="padding: 0px; width: 307px; padding-left: 18px;">
                        <el-text class="mx-1" type="info">选择函数</el-text>
                    </el-col>
                    <el-col :span="15" style="padding: 0px;">
                        <el-select v-model="form.function" placeholder="选择函数" @change="changeFunction">
                            <el-option v-for="item in otherFunctions" :key="item.name" :label="item.name"
                                :value="item.name" />
                        </el-select>
                    </el-col>
                </el-row>
            </el-form-item>
            <el-form-item v-if="!not_constructer">
                <el-row :gutter="37">
                    <el-col :span="7" style="padding: 0px; width: 200px; padding-left: 18px;">
                        <el-text class="mx-1" type="info">预置GAS</el-text>
                    </el-col>
                    <el-col :span="15" style="padding: 0px;">
                        <el-input-number v-model="gas_prepayment" :step="1000000" />
                    </el-col>
                </el-row>
            </el-form-item>
            <el-form-item>
                <el-row :gutter="37">
                    <el-col :span="7" style="padding: 0px; width: 200px; padding-left: 18px;">
                        <el-text class="mx-1" type="info">金额</el-text>
                    </el-col>
                    <el-col :span="15" style="padding: 0px;">
                        <el-input-number v-model="transfer_amount" :step="1000000" />
                    </el-col>
                </el-row>
            </el-form-item>
            <el-form-item style="margin-top: 10px;" v-for="(item, index) in form.args" :key="index"
                :prop="'items.' + index + '.value'" :rules="{
                    required: false,
                    message: '',
                    trigger: 'blur',
                }">

                <el-row :gutter="37">
                    <el-col :span="4" style="padding: 0px; width: 297px; padding-left: 18px;">
                        <el-text class="mx-1" type="primary">{{ item.type }}</el-text>
                    </el-col>
                    <el-col :span="6" style="padding: 0px; width: 297px; padding-left: 18px;">
                        <el-input v-model="item.key" aria-label="参数名" placeholder="参数名" />
                    </el-col>
                    <el-col :span="1" style="padding: 0px;margin-left:10px;margin-right:-4px"> :
                    </el-col>
                    <el-col :span="12" style="padding: 0px;">
                        <el-input v-model="item.value" aria-label="参数值" placeholder="参数值" />
                    </el-col>
                </el-row>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="dialogFormVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmDialog" :loading="run_loading">
                    执行
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, reactive } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { history, historyKeymap } from "@codemirror/commands"
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion } from '@codemirror/autocomplete'
import { solidity } from '@replit/codemirror-lang-solidity';
import { lineNumbers } from "@codemirror/view";
import emitter from './EventBus'
import axios from 'axios'
import qs from 'qs'
import { ElMessage } from 'element-plus'

const theme = ref('dark')
const isFullscreen = ref(false)
const currentLine = ref(1)
const currentColumn = ref(1)
const compileResult = ref(null)
const editorContainer = ref(null)
const editorElement = ref(null)
const preivateKey = ref('cefc2c33064ea7691aee3e5e4f7842935d26f3ad790d81cf015e79b78958e848')
var editorView = ref()
const constructor = ref(null)
const otherFunctions = ref([])
const dialogFormVisible = ref(false)
const formLabelWidth = '140px'
const not_constructer = ref(false)
const dialogTitle = ref('填写构造函数参数')
const contractAddress = ref('')
const gas_prepayment = ref(0)
const transfer_amount = ref(0)
const run_loading = ref(false)
const abiJson = ref(null)

const form = reactive({
    args: [],
    function: '',
})

emitter.on('update_soldity_height', (height: number | string) => {
    run_loading.value = false
    const numericHeight = Number(height); // convert to number
    var adjustedHeight = numericHeight - 10; // 减去 tabs 高度
    if (adjustedHeight < 0) {
        adjustedHeight = 0;
    }
    if (editorContainer.value) {
        editorContainer.value.style.height = adjustedHeight + 'px';
    }
});

emitter.on('set_solidity_private_key', (key: string) => {
    run_loading.value = false
    preivateKey.value = key;
});

emitter.on('compile_solidity_code', (code: string) => {
    run_loading.value = false
    axios
        .post('/pipeline/compile_solidity/', qs.stringify({
            'source_code': codeValue.value,
        }))
        .then(response => {
            emitter.emit('compile_solidity_code_res', response.data);
            if (response.data.status != 0) {
                console.log("Compilation error:", response.data.msg);
                return;
            }

            console.log(response.data.abi)
            console.log(response.data.bytecode)
        })
        .catch(error => {
            console.log(error)
        })
});

function confirmDialog() {
    run_loading.value = true
    if (not_constructer.value) {
        callFunction()
    } else {
        deploySolidity()
    }
}

function callFunction() {
    var types = []
    var values = []
    for (let arg of form.args) {
        if (arg.value.trim().length == 0) {
            ElMessage({
                type: 'warning',
                message: '请填写参数：' + arg.key,
            })

            run_loading.value = false
            return
        }
        types.push(arg.type)
        values.push(arg.value)
    }

    var abiFunction = abiJson.value.find((item) => item.type === 'function' && item.name === form.function);
    if (abiFunction) {
        if (abiFunction.inputs.length != types.length) {
            ElMessage({
                type: 'error',
                message: '函数调用失败，函数参数数量不匹配！',
            })
            run_loading.value = false
            return;
        }
        
        types = []
        for (let input of abiFunction.inputs) {
            types.push(input.type);
        }
    }

    axios
        .post('/pipeline/call_function_solidity/', qs.stringify({
            'address': contractAddress.value,
            'function_name': form.function,
            'function_types': types.join(','),
            'function_args': values.join(','),
            'private_key': preivateKey.value,
            'amount': transfer_amount.value,
        }))
        .then(response => {
            run_loading.value = false
            emitter.emit('call_function_solidity_code_res', response.data);
            if (response.data.status != 0) {
                ElMessage({
                    type: 'error',
                    message: '函数调用失败：' + response.data.msg,
                })
                return;
            }

            ElMessage({
                type: 'success',
                message: '函数调用成功，返回值：' + response.data.return_value,
            })
            dialogFormVisible.value = false
        })
        .catch(error => {
            run_loading.value = false
            ElMessage({
                type: 'error',
                message: '函数调用失败：' + error,
            })
        })
}

function deploySolidity() {
    dialogTitle.value = '填写构造函数参数'
    not_constructer.value = false
    var types = []
    var values = []
    for (let arg of form.args) {
        if (arg.value.trim().length == 0) {
            ElMessage({
                type: 'warning',
                message: '请填写参数：' + arg.key,
            })
            run_loading.value = false
            return
        }
        types.push(arg.type)
        values.push(arg.value)
    }

    axios
        .post('/pipeline/compile_solidity/', qs.stringify({
            'source_code': codeValue.value,
        }))
        .then(response => {
            emitter.emit('compile_solidity_code_res', response.data);
            if (response.data.status != 0) {
                ElMessage({
                    type: 'error',
                    message: '合约部署失败，编译错误：' + response.data.msg,
                })
                run_loading.value = false
                return;
            }

            abiJson.value = JSON.parse(response.data.abi);
            var abiConstructor = abiJson.value.find((item) => item.type === 'constructor');
            if (abiConstructor) {
                if (abiConstructor.inputs.length != types.length) {
                    ElMessage({
                        type: 'error',
                        message: '合约部署失败，构造函数参数数量不匹配！',
                    })
                    run_loading.value = false
                    return;
                }
                
                types = []
                for (let input of abiConstructor.inputs) {
                    types.push(input.type);
                }
            }

            axios
                .post('/pipeline/deploy_solidity/', qs.stringify({
                    'bytecode': response.data.bytecode,
                    'private_key': preivateKey.value,
                    'code_type': 0,
                    'function_types': types.join(','),
                    'function_args': values.join(','),
                    'amount': transfer_amount.value,
                    'gas_prepayment': gas_prepayment.value,
                }))
                .then(response => {
                    emitter.emit('deploy_solidity_code_res', response.data);
                    if (response.data.status != 0) {
                        ElMessage({
                            type: 'error',
                            message: '合约部署失败：' + response.data.msg,
                        })
                        return;
                    }

                    ElMessage({
                        type: 'success',
                        message: '合约部署成功，合约地址：' + response.data.id,
                    })
                    dialogFormVisible.value = false
                    contractAddress.value = response.data.id;
                })
                .catch(error => {
                    ElMessage({
                        type: 'error',
                        message: '合约部署失败：' + error,
                    })
                })
        })
        .catch(error => {
            run_loading.value = false
            ElMessage({
                type: 'error',
                message: '合约部署失败：' + error,
            })

        })
}

emitter.on('deploy_solidity_code', (code: string) => {
    run_loading.value = false
    not_constructer.value = false
    if (!preivateKey.value || preivateKey.value.length == 0) {
        ElMessage({
            type: 'warning',
            message: '请先输入私钥！',
        })
        return;
    }

    parseSolidity()
    form.args = []
    if (constructor.value) {
        form.args = constructor.value.parameters.map(param => ({
            type: param.type,
            key: param.name,
            value: ''
        }));
        dialogFormVisible.value = true;
    } else {
        deploySolidity();
    }
});

const changeFunction = () => {
    const selectedFunction = otherFunctions.value.find(func => func.name === form.function);
    if (selectedFunction) {
        form.args = selectedFunction.parameters.map(param => ({
            type: param.type,
            key: param.name,
            value: ''
        }));
    } else {
        form.args = [];
    }
}

emitter.on('call_function_solidity_code', (code: string) => {
    run_loading.value = false
    dialogTitle.value = '调用合约函数'
    parseSolidity()
    form.args = []
    if (otherFunctions.value.length == 0) {
        ElMessage({
            type: 'warning',
            message: '合约中没有可调用的函数！',
        })
        return;
    }

    form.function = otherFunctions.value[0].name
    changeFunction()
    dialogFormVisible.value = true;
    not_constructer.value = true
});

// 响应式数据
const codeValue = ref(`// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract ContractName {
    uint256 public myUint;
    bytes public myData;
    bytes public myInfo;

    constructor(uint256 _myUint, bytes memory _data, bytes memory _info) {
        myUint = _myUint;
        myData = _data;
        myInfo = _info;
    }

    function setUint(uint256 _myUint) public {
        myUint = _myUint;
    }

    function getUint() public view returns (uint256) {
        return myUint;
    }
}`)


function parseSolidity() {
    try {
        // 重置结果
        constructor.value = null;
        otherFunctions.value = [];

        // 解析所有函数
        parseAllFunctions();
        console.log('Constructor:', constructor);
        console.log('Other Functions:', otherFunctions);

    } catch (error) {
        console.error('解析错误:', error);
    }
}

function parseAllFunctions() {
    const functionRegex = /(?:constructor|function\s+(\w+)?)\s*\(([^)]*)\)\s*(?:public|private|internal|external)?\s*(?:payable)?\s*(?:returns\s*\(([^)]*)\))?/g;
    let match;

    while ((match = functionRegex.exec(codeValue.value)) !== null) {
        const isConstructor = match[0].includes('constructor') || !match[1];
        const funcName = isConstructor ? 'constructor' : match[1];
        const paramsStr = match[2] || '';
        const returnsStr = match[3] || '';

        // 解析参数
        const parameters = parseParameters(paramsStr);

        // 解析可见性
        const visibility = parseVisibility(match[0]);

        // 解析状态可变性
        const stateMutability = parseStateMutability(match[0]);

        // 解析返回类型
        const returns = parseReturnType(returnsStr);

        const funcData = {
            name: funcName,
            parameters: parameters,
            visibility: visibility,
            stateMutability: stateMutability,
            returns: returns
        };

        if (isConstructor) {
            constructor.value = funcData;
        } else {
            otherFunctions.value.push(funcData);
        }
    }
}

function parseParameters(paramsStr) {
    if (!paramsStr.trim()) return [];

    return paramsStr.split(',').map(param => {
        const trimmed = param.trim();
        if (!trimmed) return null;

        // 分离修饰符和类型
        const parts = trimmed.split(/\s+/);
        let modifiers = [];
        // 识别数据位置修饰符
        const dataLocationModifiers = ['memory', 'storage', 'calldata'];

        let index = 0;
        while (index < parts.length && dataLocationModifiers.includes(parts[index])) {
            modifiers.push(parts[index]);
            index++;
        }

        console.log('Parameter modifiers:', modifiers);
        return {
            type: parts[0],
            name: parts[parts.length - 1],
            modifiers: modifiers
        };
    }).filter(param => param !== null);
}

// function parseParameters(paramsStr) {
//     if (!paramsStr.trim()) return [];

//     return paramsStr.split(',').map(param => {
//         const trimmed = param.trim();
//         if (!trimmed) return null;

//         const parts = trimmed.split(/\s+/);
//         return {
//             type: parts[0],
//             name: parts[1] || ''
//         };
//     }).filter(param => param !== null);
// }

function parseReturnType(returnsStr) {
    if (!returnsStr.trim()) return '';

    const types = returnsStr.split(',').map(type => type.trim());
    return types.join(', ');
}

function parseVisibility(codeSnippet) {
    if (codeSnippet.includes('public')) return 'public';
    if (codeSnippet.includes('private')) return 'private';
    if (codeSnippet.includes('internal')) return 'internal';
    if (codeSnippet.includes('external')) return 'external';
    return 'internal';
}

function parseStateMutability(codeSnippet) {
    if (codeSnippet.includes('payable')) return 'payable';
    return '';
}

// Solidity关键字和代码片段
const solidityKeywords = [
    'pragma', 'solidity', 'contract', 'function', 'returns', 'public',
    'private', 'internal', 'external', 'view', 'pure', 'payable',
    'memory', 'storage', 'calldata', 'emit', 'event',
    'uint256', 'uint', 'int', 'bool', 'address', 'string',
    'mapping', 'struct', 'enum', 'modifier', 'constructor',
    'if', 'else', 'for', 'while', 'return', 'require'
]

const soliditySnippets = [
    {
        label: 'contract',
        type: 'keyword',
        apply: `contract \${1:ContractName} {\n    \${0}\n}`,
        detail: '创建新合约'
    },
    {
        label: 'function',
        type: 'function',
        apply: `function \${1:functionName}() public \${2|view,pure|} returns (\${3}) {\n    \${0}\n}`,
        detail: '函数定义'
    },
    {
        label: 'event',
        type: 'keyword',
        apply: `event \${1:EventName}(\${2});`,
        detail: '事件定义'
    },
    {
        label: 'modifier',
        type: 'keyword',
        apply: `modifier \${1:modifierName} {\n    \${0}\n    _;\n}`,
        detail: '修饰器定义'
    }
]

// 自动完成器
function solidityCompleter(context) {
    const word = context.matchBefore(/\w*/)
    if (word.from === word.to && !context.explicit) return null

    return {
        from: word.from,
        options: [
            ...solidityKeywords.map(keyword => ({
                label: keyword,
                type: 'keyword'
            })),
            ...soliditySnippets
        ]
    }
}

// 初始化编辑器
const initEditor = () => {
    if (!editorElement.value) return

    const extensions = [
        lineNumbers(),
        history(),
        keymap.of([...historyKeymap, indentWithTab]),
        solidity,
        autocompletion({
            override: [solidityCompleter]
        }),
        EditorView.updateListener.of(update => {
            if (update.docChanged) {
                codeValue.value = update.state.doc.toString()
                updateCursorPosition(update.state)
                return true
            }
        }),
        EditorView.theme({
            "&": {
                fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
                fontSize: "13px",
                lineHeight: "1.5"
            },
            ".cm-content": {
                fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                fontSize: "12px"
            },
            ".cm-gutter": {
                fontFamily: "inherit",
                fontSize: "inherit"
            }
        })
    ]

    // 添加主题
    if (theme.value === 'dark') {
        extensions.push(oneDark)
    }

    const state = EditorState.create({
        doc: codeValue.value,
        extensions
    })

    editorView = new EditorView({
        state,
        parent: editorElement.value
    })

    // 监听光标位置变化
    editorView.dom.addEventListener('mousemove', updateCursorFromEvent)
    editorView.dom.addEventListener('keydown', updateCursorFromEvent)
}

// 更新光标位置
const updateCursorPosition = (state) => {
    const selection = state.selection.main
    const line = state.doc.lineAt(selection.from)
    currentLine.value = line.number
    currentColumn.value = selection.from - line.from + 1
}

const updateCursorFromEvent = () => {
    if (editorView) {
        updateCursorPosition(editorView.state)
    }
}

// 生命周期
onMounted(() => {
    console.log('SolidityEditor mounted.')
    nextTick(() => {
        console.log('Calling initEditor...')
        initEditor()
        console.log('Editor initialized.')
    })
})

onUnmounted(() => {
    if (editorView) {
        editorView.destroy()
    }
})

// 监听代码变化
watch(codeValue, (newValue) => {
    if (editorView && newValue !== editorView.state.doc.toString()) {
        const transaction = editorView.state.update({
            changes: {
                from: 0,
                to: editorView.state.doc.length,
                insert: newValue
            }
        })
        editorView.dispatch(transaction)
        solidityCode.value = editorView.state.doc.toString();
    }
})


</script>

<style scoped>
.editor-container {
    border: 1px solid #4c4d4f;
    border-radius: 4px;
    overflow: hidden;
    background: white;
    transition: all 0.3s ease;
}

.editor-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    border-radius: 0;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e5e9;
}

.toolbar-left {
    display: flex;
    gap: 8px;
}

.toolbar-btn {
    padding: 6px 12px;
    border: 1px solid #d1d9e0;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
    color: #495057;
}

.toolbar-btn:hover:not(:disabled) {
    background: #e9ecef;
    border-color: #adb5bd;
}

.toolbar-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.file-info {
    font-size: 12px;
    color: #6c757d;
    padding: 4px 8px;
    background: #e9ecef;
    border-radius: 4px;
}

.editor-wrapper {
    position: relative;
    height: 70vh;
    overflow: hidden;
}

.code-editor {
    height: 100%;
    width: 100%;
}

.status-bar {
    display: flex;
    gap: 16px;
    padding: 4px 16px;
    background: #f8f9fa;
    border-top: 1px solid #e1e5e9;
    font-size: 11px;
    color: #6c757d;
}

.status-item {
    display: flex;
    align-items: center;
}

.compile-panel {
    border-top: 1px solid #e1e5e9;
    background: #d4edda;
}

.compile-panel.error {
    background: #f8d7da;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
}

.panel-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6c757d;
}

.panel-content {
    padding: 12px 16px;
}

.panel-content pre {
    margin: 0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    white-space: pre-wrap;
}

/* 深色主题适配 */
:deep(.cm-editor) {
    height: 100%;
}

:deep(.cm-scroller) {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
    }

    .toolbar-right {
        align-self: flex-end;
    }

    .status-bar {
        flex-wrap: wrap;
        gap: 8px;
    }
}
</style>
