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
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const node_1 = require("vscode-languageclient/node");
const child_process_1 = require("child_process");
let client;
let serverProcess;
// 通信模式枚举
var CommunicationMode;
(function (CommunicationMode) {
    CommunicationMode["STDIO"] = "stdio";
    CommunicationMode["TCP"] = "tcp";
})(CommunicationMode || (CommunicationMode = {}));
function activate(context) {
    console.log('Origami Language Extension is now active!');
    // 获取配置
    const config = vscode.workspace.getConfiguration('origami');
    const enabled = config.get('languageServer.enabled', true);
    if (!enabled) {
        console.log('Origami Language Server is disabled');
        return;
    }
    // 语言服务器配置
    let serverPath = config.get('languageServer.path', '');
    const communicationMode = config.get('languageServer.communicationMode', CommunicationMode.TCP);
    const tcpPort = config.get('languageServer.tcpPort', 8080);
    const verbose = config.get('languageServer.verbose', false);
    const logFile = config.get('languageServer.logFile', '');
    if (!serverPath) {
        // 默认使用扩展目录下的语言服务器
        serverPath = path.join(context.extensionPath, 'server', 'origami-language-server.exe');
    }
    // 根据通信模式创建服务器选项
    let serverOptions;
    if (communicationMode === CommunicationMode.TCP) {
        // TCP 模式：独立启动服务器进程
        serverOptions = createTcpServerOptions(serverPath, tcpPort, verbose, logFile);
    }
    else {
        // STDIO 模式：传统方式
        serverOptions = createStdioServerOptions(serverPath, verbose, logFile);
    }
    // 客户端选项
    const clientOptions = {
        // 注册服务器支持的文档选择器
        documentSelector: [
            { scheme: 'file', language: 'origami' }
        ],
        synchronize: {
            // 监听工作区中 .cjp 和 .cj 文件的变化
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{cjp,cj}')
        }
    };
    // 创建语言客户端并启动
    client = new node_1.LanguageClient('origami-language-server', 'Origami Language Server', serverOptions, clientOptions);
    // 启动客户端
    startLanguageServer(communicationMode, tcpPort).then(() => {
        console.log(`Origami Language Server started successfully in ${communicationMode} mode`);
        if (communicationMode === CommunicationMode.TCP) {
            console.log(`TCP Port: ${tcpPort}`);
        }
    }).catch((error) => {
        console.error('Failed to start Origami Language Server:', error);
        vscode.window.showErrorMessage(`Failed to start Origami Language Server: ${error.message}`);
    });
    // 注册命令
    const restartCommand = vscode.commands.registerCommand('origami.restartLanguageServer', () => {
        if (client) {
            stopLanguageServer().then(() => {
                return startLanguageServer(communicationMode, tcpPort);
            }).then(() => {
                vscode.window.showInformationMessage('Origami Language Server restarted');
            }).catch((error) => {
                vscode.window.showErrorMessage(`Failed to restart Origami Language Server: ${error.message}`);
            });
        }
    });
    context.subscriptions.push(restartCommand);
}
// 创建TCP模式的服务器选项
function createTcpServerOptions(serverPath, port, verbose, logFile) {
    return () => {
        return new Promise((resolve, reject) => {
            // 构建服务器启动参数
            const args = ['--port', port.toString()];
            if (verbose) {
                args.push('--verbose');
            }
            if (logFile) {
                args.push('--log', logFile);
            }
            // 启动独立的语言服务器进程
            console.log(`Starting language server: ${serverPath} ${args.join(' ')}`);
            serverProcess = (0, child_process_1.spawn)(serverPath, args, {
                stdio: 'pipe',
                detached: false
            });
            if (!serverProcess) {
                reject(new Error('Failed to spawn language server process'));
                return;
            }
            // 监听进程错误
            serverProcess.on('error', (error) => {
                console.error('Language server process error:', error);
                reject(error);
            });
            serverProcess.on('exit', (code, signal) => {
                console.log(`Language server process exited with code ${code}, signal ${signal}`);
            });
            // 等待服务器启动
            setTimeout(() => {
                const socket = net.connect(port, 'localhost');
                socket.on('connect', () => {
                    console.log(`Connected to language server on port ${port}`);
                    resolve({
                        reader: socket,
                        writer: socket
                    });
                });
                socket.on('error', (error) => {
                    console.error('Failed to connect to language server:', error);
                    reject(error);
                });
            }, 2000); // 等待2秒让服务器启动
        });
    };
}
// 创建STDIO模式的服务器选项
function createStdioServerOptions(serverPath, verbose, logFile) {
    const args = ['--stdio'];
    if (verbose) {
        args.push('--verbose');
    }
    if (logFile) {
        args.push('--log', logFile);
    }
    return {
        run: {
            command: serverPath,
            args: args,
            transport: node_1.TransportKind.stdio
        },
        debug: {
            command: serverPath,
            args: args,
            transport: node_1.TransportKind.stdio
        }
    };
}
// 启动语言服务器
async function startLanguageServer(mode, port) {
    try {
        await client.start();
        console.log(`Language server started in ${mode} mode`);
    }
    catch (error) {
        console.error('Failed to start language server:', error);
        throw error;
    }
}
// 停止语言服务器
async function stopLanguageServer() {
    try {
        if (client) {
            await client.stop();
            console.log('Language client stopped');
        }
        // 如果是TCP模式，需要手动终止服务器进程
        if (serverProcess) {
            console.log('Terminating language server process');
            serverProcess.kill('SIGTERM');
            serverProcess = undefined;
        }
    }
    catch (error) {
        console.error('Error stopping language server:', error);
        throw error;
    }
}
function deactivate() {
    return stopLanguageServer().catch((error) => {
        console.error('Error during deactivation:', error);
    });
}
//# sourceMappingURL=extension.js.map