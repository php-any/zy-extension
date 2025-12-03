import * as vscode from "vscode";
import * as net from "net";
import * as path from "path";
import * as fs from "fs";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from "vscode-languageclient/node";

let client: LanguageClient;
let reconnectTimer: NodeJS.Timeout | undefined;
let isReconnecting = false;
let serverOptions: ServerOptions;
let connectionType: string;
let clientOptions: LanguageClientOptions;
let extensionContext: vscode.ExtensionContext | undefined;

// 固定的语言服务器端口
const LANGUAGE_SERVER_PORT = 8800;
const RECONNECT_INTERVAL = 3000; // 3 秒重试间隔

// 获取打包的 LSP 二进制路径
function getBundledLspPath(
  context: vscode.ExtensionContext
): string | undefined {
  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "zy-lsp.exe" : "zy-lsp";
  const bundledPath = path.join(context.extensionPath, "bin", binaryName);

  if (fs.existsSync(bundledPath)) {
    // 确保有执行权限 (非 Windows)
    if (!isWindows) {
      try {
        fs.chmodSync(bundledPath, "755");
      } catch (e) {
        console.warn("Failed to set executable permissions:", e);
      }
    }
    return bundledPath;
  }
  return undefined;
}

// 创建stdio服务器选项
function createStdioServerOptions(commandPath: string): ServerOptions {
  return {
    command: commandPath,
    args: [],
    options: {
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
    },
  };
}

// 创建TCP服务器选项
function createTcpServerOptions(): ServerOptions {
  return () => {
    return new Promise<StreamInfo>((resolve, reject) => {
      console.log(
        `[Extension] 正在连接到语言服务器 localhost:${LANGUAGE_SERVER_PORT}`
      );

      const socket = net.connect(LANGUAGE_SERVER_PORT, "localhost");

      // 设置连接超时
      socket.setTimeout(5000);

      socket.on("connect", () => {
        console.log(
          `[Extension] 已连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器`
        );
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
        reject(
          new Error(
            `连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：连接超时`
          )
        );
      });

      socket.on("error", (error: NodeJS.ErrnoException) => {
        const errorMsg = error.message || error.code || "连接被拒绝";
        console.error(`[Extension] 连接失败: ${errorMsg}`);
        reject(
          new Error(
            `连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：${errorMsg}`
          )
        );
      });
    });
  };
}

function registerArrowTrigger(context: vscode.ExtensionContext) {
  const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId !== "origami") {
      return;
    }
    for (const change of event.contentChanges) {
      if (change.text !== ">") {
        continue;
      }
      const position = change.range.start;
      if (position.character === 0) {
        continue;
      }
      const prevCharRange = new vscode.Range(
        position.translate(0, -1),
        position
      );
      const prevChar = event.document.getText(prevCharRange);
      if (prevChar !== "-") {
        continue;
      }
      // 让 VS Code 完成本次文档更新后再触发建议，避免出现旧上下文
      setTimeout(() => {
        vscode.commands.executeCommand("editor.action.triggerSuggest");
      }, 20);
      break;
    }
  });
  context.subscriptions.push(disposable);
}

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("折言语言扩展已激活！");

  // 获取配置
  const config = vscode.workspace.getConfiguration("origami");
  const enabled = config.get<boolean>("languageServer.enabled", true);

  if (!enabled) {
    vscode.window.showWarningMessage("折言语言服务器已禁用");
    return;
  }

  // 优先使用打包的 LSP 二进制
  const bundledLspPath = getBundledLspPath(context);

  // 检查是否处于调试模式
  const isDebugMode =
    context.extensionMode === vscode.ExtensionMode.Development;

  if (!isDebugMode && bundledLspPath) {
    serverOptions = createStdioServerOptions(bundledLspPath);
    connectionType = "stdio";
    vscode.window.showInformationMessage(
      `使用内置语言服务器: ${bundledLspPath}`
    );
  } else {
    // 降级到 TCP 模式 (用于开发调试或手动启动的服务)
    serverOptions = createTcpServerOptions();
    connectionType = "TCP";

    if (isDebugMode) {
      vscode.window.showInformationMessage(
        "开发模式：使用TCP方式连接语言服务器 (localhost:8800)"
      );
    } else {
      vscode.window.showInformationMessage(
        "未检测到内置语言服务器，尝试使用TCP方式连接 (localhost:8800)"
      );
    }
  }

  // 客户端选项
  clientOptions = {
    // 注册服务器支持的文档选择器
    documentSelector: [{ scheme: "file", language: "origami" }],
    synchronize: {
      // 监听工作区中 .zy 文件的变化
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.zy"),
    },
  };

  extensionContext = context;

  // 创建并启动语言客户端
  createAndStartClient();

  // 注册重启命令
  const restartCommand = vscode.commands.registerCommand(
    "origami.restartLanguageServer",
    async () => {
      try {
        console.log("[Extension] 正在重启折言语言服务器...");
        stopReconnect(); // 停止自动重连，使用手动重启
        await stopLanguageServer();
        createAndStartClient();
        vscode.window.showInformationMessage("折言语言服务器已重新连接");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error) || "未知错误";
        vscode.window.showErrorMessage(
          `重新连接折言语言服务器失败：${errorMessage}`
        );
        // 手动重启失败时，启动自动重连
        if (extensionContext) {
          startReconnect(extensionContext);
        }
      }
    }
  );

  context.subscriptions.push(restartCommand);

  registerArrowTrigger(context);
}

// 创建并启动语言客户端
function createAndStartClient(): void {
  // 如果已有客户端，先停止并清理
  if (client) {
    try {
      client.stop().catch(() => {
        // 忽略停止错误
      });
    } catch (e) {
      // 忽略错误
    }
  }

  // 创建新的语言客户端
  client = new LanguageClient(
    "origami-language-server",
    "折言语言服务器",
    serverOptions,
    clientOptions
  );

  // 监听客户端状态变化，实现自动重连
  client.onDidChangeState((event) => {
    console.log(`[Extension] 语言服务器状态变化: ${event.newState}`);

    if (event.newState === 1) {
      // Stopped
      console.log("[Extension] 语言服务器已断开连接，将在 3 秒后尝试重连...");
      if (extensionContext) {
        startReconnect(extensionContext);
      }
    } else if (event.newState === 2) {
      // Starting
      stopReconnect();
    } else if (event.newState === 3) {
      // Running
      stopReconnect();
      console.log("[Extension] 语言服务器已成功连接");
    }
  });

  // 启动客户端
  startLanguageServer()
    .then(() => {
      if (connectionType === "stdio") {
        vscode.window.showInformationMessage(
          "折言语言服务器已通过stdio方式成功启动"
        );
      } else {
        vscode.window.showInformationMessage(
          `折言语言服务器已成功连接到端口 ${LANGUAGE_SERVER_PORT}`
        );
      }
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const displayMessage = errorMessage || "未知错误";
      vscode.window.showErrorMessage(`启动语言服务器失败: ${displayMessage}`);
      // 启动失败时也启动重连机制
      if (extensionContext) {
        startReconnect(extensionContext);
      }
    });
}

// 启动重连机制
function startReconnect(context: vscode.ExtensionContext): void {
  if (isReconnecting) {
    return; // 已经在重连中，避免重复启动
  }

  isReconnecting = true;
  console.log(`[Extension] 开始重连机制，每 ${RECONNECT_INTERVAL}ms 重试一次`);

  reconnectTimer = setInterval(async () => {
    if (!client || !extensionContext) {
      stopReconnect();
      return;
    }

    try {
      const state = client.state;
      // 如果客户端已经在运行或正在启动，停止重连
      if (state === 2 || state === 3) {
        console.log("[Extension] 语言服务器已恢复连接，停止重连");
        stopReconnect();
        return;
      }

      console.log("[Extension] 尝试重新连接语言服务器...");
      // 重新创建并启动客户端
      createAndStartClient();

      // 等待一下，让连接建立
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 检查连接状态
      if (client && (client.state === 2 || client.state === 3)) {
        // 连接成功，停止重连
        stopReconnect();
        vscode.window.showInformationMessage("折言语言服务器已重新连接");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error) || "未知错误";
      console.log(
        `[Extension] 重连失败: ${errorMessage}，将在 ${RECONNECT_INTERVAL}ms 后重试`
      );
      // 继续重试，不显示错误消息（避免频繁弹窗）
    }
  }, RECONNECT_INTERVAL);
}

// 停止重连机制
function stopReconnect(): void {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = undefined;
    isReconnecting = false;
    console.log("[Extension] 已停止重连机制");
  }
}

// 启动语言服务器
async function startLanguageServer(): Promise<void> {
  try {
    await client.start();
    console.log("[Extension] 语言服务器启动成功");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error) || "未知错误";
    console.error(`[Extension] 启动语言服务器失败: ${errorMessage}`);
    throw error;
  }
}

// 停止语言服务器
async function stopLanguageServer(): Promise<void> {
  try {
    if (client) {
      await client.stop();
      console.log("[Extension] 语言服务器已停止");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`停止语言服务器失败: ${errorMessage}`);
    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  console.log("[Extension] 正在停用折言语言扩展");
  stopReconnect(); // 停止重连机制
  return stopLanguageServer().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`停用过程中发生错误: ${errorMessage}`);
  });
}
