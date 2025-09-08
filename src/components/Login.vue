<template>
    <div class="login-page " style="margin-top: 0px;">
        <div class="panel-container ">
            <div class="block text-center">
                <el-carousel height="550px" style="width:800px;" motion-blur>
                    <el-carousel-item v-for="item in 4" :key="item">
                        <section class="login-intro custom-primary-bg">
                            <h1 class="intro-title">{{ appName }}</h1>
                            <p class="intro-subtitle">欢迎登录！</p>
                            <img :src="loginImg" alt="login" />
                        </section>
                    </el-carousel-item>
                </el-carousel>
            </div>

            <section class="login-panel">
                <h1 style="margin-bottom: 10px" v-if="device == 'mobile'">
                    {{ appName }}
                </h1>
                <h1 style="color: var(--el-color-primary) !important;">{{ loginStatus ? "登录" : "注册" }}</h1>
                <el-form :model="loginForm" class="login-form" v-show="loginStatus" label-position="top">
                    <el-form-item label="账号">
                        <el-input placeholder="请输入账号" v-model="loginForm.account" />
                    </el-form-item>
                    <el-form-item label="密码">
                        <el-input type="password" placeholder="请输入密码" v-model="loginForm.password" />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" class="login-btn" @click="onLoginClick" :loading="loginBtnLoading">
                            登录
                        </el-button>
                        <div class="form-bottom">
                            <el-button type="text" @click="onTogglePanelStatus">
                                注册
                            </el-button>
                        </div>
                    </el-form-item>
                </el-form>
                <el-form :model="registerForm" class="login-form" v-show="!loginStatus" label-position="top">
                    <el-form-item label="用户名" name="username">
                        <el-input placeholder="请输入用户名" v-model="registerForm.username" />
                    </el-form-item>
                    <el-form-item label="密码">
                        <el-input type="password" placeholder="请设置密码" v-model="registerForm.password" />
                    </el-form-item>
                    <el-form-item label="邮箱" name="email">
                        <el-input placeholder="请输入邮箱" v-model="registerForm.email" :prefix-icon="Message" />
                    </el-form-item>
                    <el-form-item label="手机号码" name="phone">
                        <el-input placeholder="请输入手机号码" v-model="registerForm.phone" :prefix-icon="Iphone" />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" class="login-btn" @click="onRegisterClick">
                            注册
                        </el-button>
                        <div class="form-bottom">
                            <el-button type="text" @click="onTogglePanelStatus">
                                密码登录
                            </el-button>
                        </div>
                    </el-form-item>
                </el-form>
            </section>
        </div>
    </div>
</template>


<script>
import { reactive, ref, computed } from "vue";
import loginSvg from "../assets/images/login.svg";
import axios from 'axios';
import router from '../router/index.js'; // 假设你使用了 Vue Router
import { ElNotification } from 'element-plus'
import { Message, Iphone } from '@element-plus/icons-vue'

export default {
    name: "login",

    setup() {

        //切换登录、注册面板
        const loginStatus = ref(true);
        const onTogglePanelStatus = () => {
            loginStatus.value = !loginStatus.value;
        };

        //获取验证码
        const onGetCodeClick = () => {
            console.log("获取验证码");
        };

        //登录操作
        const loginForm = reactive({
            account: "",
            password: "",
        });
        let loginBtnLoading = ref(false);

        const onLoginClick = async () => {
            console.log("1")
            delete axios.defaults.headers.common['Authorization'];

            try {
                const response = await axios.post('http://82.156.224.174:7001/rest_token/', {
                    username: loginForm.account,
                    password: loginForm.password,
                });

                console.log("2")
                const token = response.data.access;
                localStorage.setItem('access_token', response.data.access)
                localStorage.setItem('refresh_token', response.data.refresh)

                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // 设置默认请求头
                axios.interceptors.response.use(response => response, error => {
                    if (error.response.status === 401) {
                        return axios.post('http://82.156.224.174:7001/rest_refresh/', {
                            refresh: localStorage.getItem('refresh_token')
                        }).then(response => {
                            localStorage.setItem('access_token', response.data.access)
                            error.config.headers['Authorization'] = `Bearer ${response.data.access}`
                            return axios.request(error.config)
                        })
                    }
                    return Promise.reject(error)
                })


                console.log("3")
                ElNotification({ title: "成功", message: "欢迎： " + loginForm.account, type: "success", })
                router.push('/pipeline'); // 登录成功后跳转到主页
            } catch (error) {
                ElNotification({ title: "出现错误", message: "登录失败：" + error, type: "error", })
            }
        };

        //注册操作
        const registerForm = reactive({
            username: "",
            email: "",
            phone: "",
            password: "",
            code: "",
        });
        const onRegisterClick = async () => {
            try {
                const response = await axios.post('http://82.156.224.174:7001/rest_register/', {
                    username: registerForm.username,
                    password: registerForm.password,
                    email: registerForm.email,
                    phone: registerForm.phone,
                });
                message.value = response.data.message;
                // 注册成功后可以进行页面跳转
                ElNotification({ title: "注册成功", message: "请登录", type: "success", })
                router.push("/login")
            } catch (error) {
                message.value = '注册失败：' + (error.response?.data?.message || '网络错误');
                ElNotification({ title: "注册失败：", message: (error.response?.data?.message || '网络错误'), type: "error", })
            }
        };
        return {
            loginForm,
            loginImg: loginSvg,
            loginStatus,
            loginBtnLoading,
            registerForm,
            onRegisterClick,
            onLoginClick,
            onGetCodeClick,
            onTogglePanelStatus,
            appName: computed(() => "分布式智能计算实验平台"),
            device: computed(() => "store.state.app.device"),
        };
    },
};
</script>

<style lang="scss">
$primaryColor: #409EFF;
$secondaryColor: rgb($primaryColor, 0.1);
$bgColor: #f6f7f9;

$blue: #409EFF;
$red: #F56C6C;
$green: #67C23A;
$yellow: #E6A23C;

//app背景色
$appBgColor: #fff;

@mixin flex-row-center-center {
    display: flex;
    justify-content: center;
    align-items: center;
}

@mixin flex-col-center-center {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}


//单行溢出
@mixin ellipsis-singe-line {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

//多行溢出
@mixin ellipsis-multi-line($line) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: $line;
    overflow: hidden;
}

.el-form .el-form-item__label {
    color: var(--el-color-primary) !important;
    font-size: 15px;
}

.el-form .el-input__inner {
    -webkit-appearance: none;
    background: none;
    border: none;
    box-sizing: border-box;
    color: var(--el-color-info);
    flex-grow: 1;
    font-size: inherit;
    height: var(--el-input-inner-height);
    line-height: var(--el-input-inner-height);
    outline: none;
    padding: 0;
    width: 100%;
}

.demonstration {
    color: var(--el-text-color-secondary);
}

.el-carousel__item:nth-child(2n) {
    background-color: var(--el-color-primary) !important;
}

.el-carousel__item:nth-child(2n + 1) {
    background-color: var(--el-color-primary) !important;
}

/* 全局样式文件或者组件内的 <style> */
.custom-primary-bg {
    background-color: var(--el-color-primary) !important;
}

.login-page {
    width: 100%;
    height: 100vh;
    @include flex-row-center-center;

    .panel-container {
        position: relative;
        @include flex-row-center-center;
        width: auto;

        .login-intro {
            width: 900px;
            height: 500px;
            flex-shrink: 0;
            background-color: $primaryColor;
            padding: 50px;
            color: #ffffff !important;
            box-sizing: border-box;
            padding-right: 60px;
            /* border-right: 1px dashed rgba(0, 0, 0, 0.1); */
            border-top-left-radius: 6px;
            border-bottom-left-radius: 6px;

            @media screen and (max-width: 750px) {
                display: none;
            }

            >img {
                width: 100%;
                height: 100%;
            }

            .intro-title,
            .intro-subtitle {
                text-align: left;
            }

            .intro-title {
                font-weight: bold;
                font-size: 22px;
            }

            .intro-subtitle {
                font-size: 14px;
                margin-top: 10px;
            }
        }

        .login-panel {
            width: 400px;
            min-height: 550px;
            padding: 50px;
            background-color: #fff;
            box-sizing: border-box;
            transition: all 0.5s;
            flex-shrink: 0;
            border-top-right-radius: 6px;
            border-bottom-right-radius: 6px;

            @media screen and (max-width: 750px) {
                width: 90vw;
                padding: 50px 30px;
            }

            h1 {
                text-align: center;
                font-size: 24px;
                width: 100%;
                margin: 0 auto;
            }

            .login-form {
                margin-top: 40px;

                .login-btn {
                    width: 100%;
                    height: 40px;
                    margin-top: 30px;
                }

                .form-bottom {
                    margin-top: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
            }
        }

        .code-by {
            position: absolute;
            bottom: -50px;
            left: 50%;
            transform: translateX(-50%);
            color: #ccc;
        }
    }
}
</style>