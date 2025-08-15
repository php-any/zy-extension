"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZyLspDetector = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
/**
 * zy-lsp命令检测器
 * 负责检测zy-lsp命令是否存在，并注入相应的PATH环境变量
 */
class ZyLspDetector {
    constructor() {
        this.isInitialized = false;
    }
    /**
     * 获取单例实例
     */
    static getInstance() {
        if (!ZyLspDetector.instance) {
            ZyLspDetector.instance = new ZyLspDetector();
        }
        return ZyLspDetector.instance;
    }
    /**
     * 初始化PATH环境变量
     * 尝试从用户的shell配置文件获取完整的PATH
     */
    async initializePath() {
        if (this.isInitialized) {
            return;
        }
        // 显示原始PATH值
        const originalPath = process.env.PATH || "未设置";
        vscode.window.showInformationMessage(`原始PATH: ${originalPath}`);
        try {
            // 先尝试直接检测zy-lsp命令
            vscode.window.showInformationMessage("先尝试直接检测zy-lsp命令...");
            const directCheck = await this.checkZyLspCommandDirect();
            if (directCheck) {
                vscode.window.showInformationMessage("直接检测成功，无需PATH注入");
                this.isInitialized = true;
                return;
            }
            vscode.window.showInformationMessage("直接检测失败，尝试PATH注入...");
            // 使用source命令执行shell配置文件来获取完整的PATH
            let userPath = "";
            // 尝试source不同的配置文件来获取PATH
            const possibleConfigs = [
                ".bash_profile",
                ".zshrc",
                ".bashrc",
                ".profile",
            ];
            // 逐个尝试配置文件，使用同步方式避免复杂性
            for (const config of possibleConfigs) {
                try {
                    // 显示正在尝试的配置文件（包含完整路径）
                    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
                    const fullPath = `${homeDir}/${config}`;
                    vscode.window.showInformationMessage(`正在尝试source: ${fullPath}`);
                    // 使用execSync，但设置较短的超时时间
                    const result = cp
                        .execSync(`bash -c "source ~/${config} && echo \$PATH"`, {
                        encoding: "utf8",
                        timeout: 2000, // 2秒超时
                    })
                        .toString()
                        .trim();
                    vscode.window.showInformationMessage(`source ${config} 结果: ${result}`);
                    if (result && result !== process.env.PATH) {
                        userPath = result;
                        vscode.window.showInformationMessage(`找到有效PATH: ${result}`);
                        break; // 找到有效PATH就退出循环
                    }
                    else {
                        vscode.window.showWarningMessage(`PATH无变化: ${result}`);
                    }
                }
                catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    vscode.window.showWarningMessage(`source ${config} 失败: ${errorMessage}`);
                    // 继续尝试下一个配置文件
                    continue;
                }
            }
            // 只有在找到用户PATH时才合并
            if (userPath) {
                process.env.PATH = `${userPath}:${originalPath}`;
                // 显示调试信息
                vscode.window.showInformationMessage(`PATH注入成功!\n用户PATH: ${userPath}\n合并后PATH: ${process.env.PATH}`);
            }
            else {
                vscode.window.showWarningMessage("未找到用户自定义PATH，尝试在常用目录下查询zy-lsp");
                // 在常用目录下查询zy-lsp
                await this.searchZyLspInCommonDirectories();
            }
            // 测试PATH是否真的生效
            try {
                const testResult = cp.execSync("which zy-lsp").toString().trim();
                vscode.window.showInformationMessage(`PATH测试成功: zy-lsp位于 ${testResult}`);
            }
            catch (testError) {
                const errorMessage = testError instanceof Error ? testError.message : String(testError);
                vscode.window.showWarningMessage(`PATH测试失败: ${errorMessage}`);
            }
            this.isInitialized = true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showWarningMessage(`获取用户PATH失败: ${errorMessage}`);
        }
    }
    /**
     * 检查zy-lsp命令是否存在
     * @returns Promise<boolean> 如果命令存在返回true，否则返回false
     */
    async checkZyLspCommand() {
        // 确保PATH已经初始化
        if (!this.isInitialized) {
            await this.initializePath();
        }
        return new Promise((resolve) => {
            // 直接使用当前进程的PATH（已经在initializePath中注入）
            cp.exec("which zy-lsp", (error, stdout) => {
                // 检查命令是否存在且有输出
                const exists = !error && stdout.trim().length > 0;
                // 使用弹窗显示检测结果
                if (exists) {
                    vscode.window.showInformationMessage(`检测到zy-lsp命令: ${stdout.trim()}`);
                }
                else {
                    vscode.window.showWarningMessage("未检测到zy-lsp命令，将使用TCP连接方式");
                }
                resolve(exists);
            });
        });
    }
    /**
     * 重置初始化状态（用于测试或重新初始化）
     */
    reset() {
        this.isInitialized = false;
    }
    /**
     * 获取当前PATH值
     */
    getCurrentPath() {
        return process.env.PATH || "";
    }
    /**
     * 检查是否已经初始化
     */
    isPathInitialized() {
        return this.isInitialized;
    }
    /**
     * 直接检测zy-lsp命令（不依赖PATH注入）
     */
    async checkZyLspCommandDirect() {
        return new Promise((resolve) => {
            cp.exec("which zy-lsp", (error, stdout) => {
                const exists = !error && stdout.trim().length > 0;
                if (exists) {
                    vscode.window.showInformationMessage(`直接检测到zy-lsp命令: ${stdout.trim()}`);
                }
                resolve(exists);
            });
        });
    }
    /**
     * 在常用目录下搜索zy-lsp
     */
    async searchZyLspInCommonDirectories() {
        const fs = require("fs");
        const path = require("path");
        // 常用目录列表
        const commonDirs = [
            "/usr/local/bin",
            "/usr/bin",
            "/opt/homebrew/bin",
            "/opt/local/bin",
            path.join(process.env.HOME || "", "bin"),
            path.join(process.env.HOME || "", "local/bin"),
            path.join(process.env.HOME || "", "Desktop/github.com/php-any/origami/bin"),
            path.join(process.env.HOME || "", "go/bin"),
            path.join(process.env.HOME || "", ".cargo/bin"),
            path.join(process.env.HOME || "", ".local/bin"),
        ];
        vscode.window.showInformationMessage("开始在常用目录下搜索zy-lsp...");
        for (const dir of commonDirs) {
            try {
                const zyLspPath = path.join(dir, "zy-lsp");
                if (fs.existsSync(zyLspPath)) {
                    vscode.window.showInformationMessage(`在常用目录中找到zy-lsp: ${zyLspPath}`);
                    // 将这个目录添加到PATH
                    const currentPath = process.env.PATH || "";
                    process.env.PATH = `${dir}:${currentPath}`;
                    vscode.window.showInformationMessage(`已将 ${dir} 添加到PATH: ${process.env.PATH}`);
                    return;
                }
            }
            catch (e) {
                // 忽略错误，继续搜索下一个目录
                continue;
            }
        }
        vscode.window.showWarningMessage("在常用目录中未找到zy-lsp");
    }
}
exports.ZyLspDetector = ZyLspDetector;
//# sourceMappingURL=zy-lsp-detector.js.map