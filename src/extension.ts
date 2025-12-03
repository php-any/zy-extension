import * as vscode from "vscode";
import * as net from "net";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from "vscode-languageclient/node";
import { ensureZyLspAvailable } from "./zy-lsp-installer";

let client: LanguageClient;

// 固定的语言服务器端口（仅调试模式下使用）
const LANGUAGE_SERVER_PORT = 8800;

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

      socket.on("error", (error) => {
        console.error(`[Extension] 连接失败: ${error.message}`);
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

export async function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("折言语言扩展已激活！");

  // 获取配置
  const config = vscode.workspace.getConfiguration("origami");
  const enabled = config.get<boolean>("languageServer.enabled", true);

  if (!enabled) {
    vscode.window.showWarningMessage("折言语言服务器已禁用");
    return;
  }

  let serverOptions: ServerOptions;
  let connectionType: string;

  // 检查是否处于调试模式
  const isDebugMode =
    context.extensionMode === vscode.ExtensionMode.Development;

  if (!isDebugMode) {
    // 生产模式：先尝试使用系统已有的 zy-lsp，没有则尝试自动下载
    const lspPath = await ensureZyLspAvailable(context);

    if (!lspPath) {
      // 用户取消或安装失败，直接退出（不再偷偷回退到 TCP）
      return;
    }

    serverOptions = createStdioServerOptions(lspPath);
    connectionType = "stdio";
    vscode.window.showInformationMessage(`使用语言服务器: ${lspPath}`);
  } else {
    // 仅在开发模式允许 TCP（方便本地调试）
    serverOptions = createTcpServerOptions();
    connectionType = "TCP";
    vscode.window.showInformationMessage(
      "开发模式：使用TCP方式连接语言服务器 (localhost:8800)"
    );
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
    async () => {
      if (client) {
        try {
          console.log("[Extension] 正在重启折言语言服务器...");
          await stopLanguageServer();
          await startLanguageServer();
          vscode.window.showInformationMessage("折言语言服务器已重新连接");
        } catch (error) {
          vscode.window.showErrorMessage(
            `重新连接折言语言服务器失败：${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
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
    console.log("[Extension] 语言服务器启动成功");
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
  return stopLanguageServer().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`停用过程中发生错误: ${errorMessage}`);
  });
}
