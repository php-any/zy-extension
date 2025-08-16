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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const net = __importStar(require("net"));
const node_1 = require("vscode-languageclient/node");
const zy_lsp_detector_1 = require("./zy-lsp-detector");
let client;
// 固定的语言服务器端口
const LANGUAGE_SERVER_PORT = 8800;
// 使用ZyLspDetector来检查zy-lsp命令
async function checkZyLspCommand() {
    const detector = zy_lsp_detector_1.ZyLspDetector.getInstance();
    return await detector.checkZyLspCommand();
}
// 创建stdio服务器选项
function createStdioServerOptions() {
    return {
        command: "zy-lsp",
        args: [],
        options: {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
        },
    };
}
// 创建TCP服务器选项
function createTcpServerOptions() {
    return () => {
        return new Promise((resolve, reject) => {
            console.log(`[Extension] 正在连接到语言服务器 localhost:${LANGUAGE_SERVER_PORT}`);
            const socket = net.connect(LANGUAGE_SERVER_PORT, "localhost");
            // 设置连接超时
            socket.setTimeout(5000);
            socket.on("connect", () => {
                console.log(`[Extension] 已连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器`);
                socket.setTimeout(0); // 清除超时
                // 设置socket选项以保持连接稳定
                socket.setKeepAlive(true, 30000);
                socket.setNoDelay(true);
                resolve({
                    reader: socket,
                    writer: socket,
                });
            });
            socket.on("timeout", () => {
                console.error("[Extension] 连接超时");
                socket.destroy();
                reject(new Error(`连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：连接超时`));
            });
            socket.on("error", (error) => {
                console.error(`[Extension] 连接失败: ${error.message}`);
                reject(new Error(`连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：${error.message}`));
            });
        });
    };
}
async function activate(context) {
    vscode.window.showInformationMessage("折言语言扩展已激活！");
    // 获取配置
    const config = vscode.workspace.getConfiguration("origami");
    const enabled = config.get("languageServer.enabled", true);
    if (!enabled) {
        vscode.window.showWarningMessage("折言语言服务器已禁用");
        return;
    }
    try {
        // 初始化ZyLspDetector（这会自动处理PATH注入）
        console.log("[Extension] 开始初始化 zy-lsp 检测器...");
        const detector = zy_lsp_detector_1.ZyLspDetector.getInstance();
        // 等待初始化完成
        await detector.initializePath();
        console.log("[Extension] PATH环境初始化完成");
        // 检查并选择服务器选项
        console.log("[Extension] 开始检测 zy-lsp 命令...");
        const hasZyLsp = await checkZyLspCommand();
        let serverOptions;
        let connectionType;
        if (hasZyLsp) {
            serverOptions = createStdioServerOptions();
            connectionType = "stdio";
            vscode.window.showInformationMessage("检测到zy-lsp命令，使用stdio方式启动语言服务器");
        }
        else {
            serverOptions = createTcpServerOptions();
            connectionType = "TCP";
            vscode.window.showInformationMessage("未检测到zy-lsp命令，使用TCP方式连接语言服务器");
        }
        // 客户端选项
        const clientOptions = {
            // 注册服务器支持的文档选择器
            documentSelector: [{ scheme: "file", language: "origami" }],
            synchronize: {
                // 监听工作区中 .ori 和 .cjp 文件的变化
                fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{ori,cjp}"),
            },
        };
        // 创建语言客户端
        client = new node_1.LanguageClient("origami-language-server", "折言语言服务器", serverOptions, clientOptions);
        // 启动客户端
        try {
            await startLanguageServer();
            if (connectionType === "stdio") {
                vscode.window.showInformationMessage("折言语言服务器已通过stdio方式成功启动");
            }
            else {
                vscode.window.showInformationMessage(`折言语言服务器已成功连接到端口 ${LANGUAGE_SERVER_PORT}`);
            }
        }
        catch (error) {
            if (connectionType === "stdio") {
                vscode.window.showErrorMessage(`启动折言语言服务器失败: ${error instanceof Error ? error.message : String(error)}。请确保zy-lsp命令可用。`);
            }
            else {
                vscode.window.showErrorMessage(`连接折言语言服务器失败 localhost:${LANGUAGE_SERVER_PORT}: ${error instanceof Error ? error.message : String(error)}。请确保服务器正在运行。`);
            }
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`扩展激活失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    // 注册重启命令
    const restartCommand = vscode.commands.registerCommand("origami.restartLanguageServer", async () => {
        if (client) {
            try {
                console.log("[Extension] 正在重启折言语言服务器...");
                await stopLanguageServer();
                await startLanguageServer();
                vscode.window.showInformationMessage("折言语言服务器已重新连接");
            }
            catch (error) {
                vscode.window.showErrorMessage(`重新连接折言语言服务器失败：${error instanceof Error ? error.message : String(error)}`);
            }
        }
    });
    context.subscriptions.push(restartCommand);
}
// 启动语言服务器
async function startLanguageServer() {
    try {
        await client.start();
        console.log("[Extension] 语言服务器启动成功");
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`启动语言服务器失败: ${errorMessage}`);
        throw error;
    }
}
// 停止语言服务器
async function stopLanguageServer() {
    try {
        if (client) {
            await client.stop();
            console.log("[Extension] 语言服务器已停止");
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`停止语言服务器失败: ${errorMessage}`);
        throw error;
    }
}
function deactivate() {
    console.log("[Extension] 正在停用折言语言扩展");
    return stopLanguageServer().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`停用过程中发生错误: ${errorMessage}`);
    });
}
//# sourceMappingURL=extension.js.map