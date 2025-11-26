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

// 固定的语言服务器端口
const LANGUAGE_SERVER_PORT = 8800;

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
      console.log(`正在连接到语言服务器 localhost:${LANGUAGE_SERVER_PORT}`);

      const socket = net.connect(LANGUAGE_SERVER_PORT, "localhost");

      // 设置连接超时
      socket.setTimeout(5000);

      socket.on("connect", () => {
        vscode.window.showInformationMessage(
          `已连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器`
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
        vscode.window.showErrorMessage("连接超时");
        socket.destroy();
        reject(
          new Error(
            `连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：连接超时`
          )
        );
      });

      socket.on("error", (error) => {
        vscode.window.showErrorMessage(`连接失败: ${error.message}`);
        reject(
          new Error(
            `连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：${error.message}`
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
      if (change.text !== ">" || change.rangeLength !== 0) {
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
      }, 0);
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
  let serverOptions: ServerOptions;
  let connectionType: string;

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
  const clientOptions: LanguageClientOptions = {
    // 注册服务器支持的文档选择器
    documentSelector: [{ scheme: "file", language: "origami" }],
    synchronize: {
      // 监听工作区中 .zy 文件的变化
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.zy"),
    },
  };

  // 创建语言客户端
  client = new LanguageClient(
    "origami-language-server",
    "折言语言服务器",
    serverOptions,
    clientOptions
  );

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
      vscode.window.showErrorMessage(`启动语言服务器失败: ${error.message}`);
    });

  // 注册重启命令
  const restartCommand = vscode.commands.registerCommand(
    "origami.restartLanguageServer",
    () => {
      if (client) {
        stopLanguageServer()
          .then(() => {
            return startLanguageServer();
          })
          .then(() => {
            vscode.window.showInformationMessage("折言语言服务器已重新连接");
          })
          .catch((error) => {
            vscode.window.showErrorMessage(
              `重新连接折言语言服务器失败：${error.message}`
            );
          });
      }
    }
  );

  context.subscriptions.push(restartCommand);

  registerArrowTrigger(context);
}

// 启动语言服务器
async function startLanguageServer(): Promise<void> {
  try {
    await client.start();
    vscode.window.showInformationMessage("语言服务器启动成功");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`启动语言服务器失败: ${errorMessage}`);
    throw error;
  }
}

// 停止语言服务器
async function stopLanguageServer(): Promise<void> {
  try {
    if (client) {
      await client.stop();
      vscode.window.showInformationMessage("语言服务器已停止");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`停止语言服务器失败: ${errorMessage}`);
    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  vscode.window.showInformationMessage("正在停用折言语言扩展");
  return stopLanguageServer().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`停用过程中发生错误: ${errorMessage}`);
  });
}
