/**
 * Author: Ruo
 * Create: 2018/9/4
 * Description:
 */
import _ from 'lodash';
import store from 'store';
import {
    getOption,
    setOption,
    isLogin,
    PERMISSION_STATUS,
    PERMISSION_TYPE,
} from 'Utils';

const {login, notifications} = PERMISSION_TYPE;

/**
 * 特性
 * 规范启用一个特性/功能需要涉及到的一系列方法
 */
export class Feature {

    /**
     * @param name {string} 配置的名称
     * @param kind {string} 配置的列表划分，在渲染设置页面时根据该值在相对应的列表中自动渲染，如：主站，直播，其他等
     * @param GUI {ReactDOM}
     * @param optionDOM {ReactDOM}
     * @param options {object} 特性的额外配置选项，如过滤列表的配置信息
     */
    constructor({name, kind, GUI = null, optionDOM = null, permissions = {}, options = {}, require = []}) {
        this.name = _.upperFirst(name);
        this.storeName = `bilibili-helper-${this.name}`;
        this.kind = kind;
        this.GUI = GUI; // 功能/特性的UI
        this.optionDOM = optionDOM; // 设置页面的UI
        this.permissions = permissions;
        this.options = {...options, kind, name};
        this.initialed = false;
        this.launching = false;
        this.require = require;
        //this.init();
    }

    /**
     * 初始化 - 位于装载过程之前
     * 1.检查(启动)配置
     * 2.鉴权
     * 3.配置初始化
     * @return {Promise} true 表示初始化成功 返回字符串表示初始化失败说明
     */
    init = () => {
        return new Promise((resolve) => {
            const {on} = this.options;
            if (on === false) { // 检查启用状态，如果没有启动则不会执行后续的装载和启动过程
                console.warn(`Feature ${this.name} OFF`);
                return on;
            } else if (on === true) {
                resolve(this.checkPermission().then(({pass, msg}) => {
                    if (pass) {
                        this.initOption();
                        this.addListener();
                        this.initialed = true;
                        console.log(`Feature load complete: ${this.name}`);
                        return this;
                        //chrome.extension.getBackgroundPage().FeatureManager.dealWidthWaitQueue();
                    } else console.error(msg);
                }));
            } else { // 没有启动配置
                console.error(`No options names ${_.upperFirst(this.name)}`);
                resolve(false);
            }
        });
    };

    // 初始化配置
    initOption = () => {
        const options = store.get(this.storeName) || {}; // 缓存配置
        this.options = Object.assign({}, this.options, options);
        store.set(this.storeName, this.options);
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log(...message);
            if (message.commend === 'setOption' && message.feature === this.name) {
                // 同步设置 background 里 memory 和 localStorage 中的设置
                this.setOption(message.options);
                sendResponse(true);
            } else if (message.commend === 'getOption' && message.feature === _.upperFirst(this.name)) {
                sendResponse(this.options);
            }
        });
    };

    // 获取配置
    getOption = (featureName) => {
        if (featureName === this.name || !featureName) return store.get(this.storeName) || {};
        else {
            const name = _.upperFirst(featureName);
            return chrome.extension.getBackgroundPage().FeatureManager.features[name].getOption();
        }
    };

    // 设置配置
    setOption = (options) => {
        if (this.options.toggle === false) return;
        if (this.initialed === false || options.on !== this.options.on) { // 没有初始化过 或者 总启动状态发生变化时
            if (options.on === true) {
                if (!this.initialed) this.init();
                else this.launch();
            } else this.pause();
        }
        this.options = options;
        store.set(this.storeName, options);
        this.afterSetOption(options);
    };

    // 设置之后运行的钩子函数
    afterSetOption = () => {};

    // 启动 - 装载过程之后
    launch = () => {
        //console.warn(`Feature ${_.upperFirst(this.name)}'s launch Function is empty!`);
        return;
    };

    // 暂停 - 启动后关闭功能时调用
    pause = () => {
        //console.error(`Feature ${_.upperFirst(this.name)}'s pause Function is empty!`);
        return;
    };

    // 添加监听器
    addListener = () => {
        //console.warn(`Feature ${_.upperFirst(this.name)}'s addListener Function is empty!`);
        return;
    };

    // 渲染特性/功能UI
    render = () => {
        return;
    };

    // 鉴权
    checkPermission = () => {
        return new Promise(resolve => {
            if (!this.permissions) return true; // 没有设置需要检查的权限，则无条件通过
            let [pass, msg] = [true, '']; // 通过状态
            _.map(this.permissions, async (permission, permissionName) => {
                if (!permission) { // 未知权限类型
                    [pass, msg] = [false, `Undefined permission: ${permissionName}`];
                } else if (permission.check && !permission.value) {// 已经检查过 且 没有检查通过 直接返回之前的检查结果
                    [pass, msg] = [permission.value, permission.errorMsg];
                } else { // 权限没有检查过
                    switch (permissionName) {
                        case 'login': {
                            await isLogin().then((login) => {
                                pass = login ? true : false;
                                msg = permission.errorMsg;
                            });
                            break;
                        }
                        case 'notifications': {
                            await chrome.notifications.getPermissionLevel((level) => {
                                pass = level === 'granted' ? true : false;
                                msg = permission.errorMsg;
                            });
                            break;
                        }
                    }
                }
                if (!pass) return false; // 权限检查没过
                else {
                    permission.check = true;
                    permission.value = true;
                }
            });
            resolve({pass, msg});
        });
    };

    /**
     * 装载 - 初始化成功后
     * 不同功能有不同的装载要求和时机
     */
    install = (feature) => {
        //feature.launch();
    };
}