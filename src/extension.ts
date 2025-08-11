import * as vscode from "vscode";
import * as net from "net";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from "vscode-languageclient/node";

let client: LanguageClient;

// 固定的语言服务器端口
const LANGUAGE_SERVER_PORT = 8800;

export function activate(context: vscode.ExtensionContext) {
  console.log("折言语言扩展已激活！");

  // 获取配置
  const config = vscode.workspace.getConfiguration("origami");
  const enabled = config.get<boolean>("languageServer.enabled", true);

  if (!enabled) {
    console.log("折言语言服务器已禁用");
    return;
  }

  // 创建TCP连接到固定端口的服务器选项
  const serverOptions: ServerOptions = () => {
    return new Promise<StreamInfo>((resolve, reject) => {
      console.log(`正在连接到语言服务器 localhost:${LANGUAGE_SERVER_PORT}`);
      
      const socket = net.connect(LANGUAGE_SERVER_PORT, "localhost");
      
      // 设置连接超时
      socket.setTimeout(5000);

      socket.on("connect", () => {
        console.log(`已连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器`);
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
        console.error("连接超时");
        socket.destroy();
        reject(new Error(`连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：连接超时`));
      });

      socket.on("error", (error) => {
        console.error("连接失败：", error.message);
        reject(new Error(`连接到端口 ${LANGUAGE_SERVER_PORT} 的语言服务器失败：${error.message}`));
      });
    });
  };

  // 客户端选项
  const clientOptions: LanguageClientOptions = {
    // 注册服务器支持的文档选择器
    documentSelector: [{ scheme: "file", language: "origami" }],
    synchronize: {
      // 监听工作区中 .cjp 和 .cj 文件的变化
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{cjp,cj}"),
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
      console.log(`折言语言服务器已成功连接到端口 ${LANGUAGE_SERVER_PORT}`);
    })
    .catch((error) => {
      console.error("连接折言语言服务器失败：", error);
      vscode.window.showErrorMessage(
        `连接折言语言服务器失败 localhost:${LANGUAGE_SERVER_PORT}。请确保服务器正在运行。`
      );
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
            vscode.window.showInformationMessage(
              "折言语言服务器已重新连接"
            );
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
}

// 启动语言服务器
async function startLanguageServer(): Promise<void> {
  try {
    await client.start();
    console.log("语言服务器启动成功");
  } catch (error) {
    console.error("启动语言服务器失败：", error);
    throw error;
  }
}

// 停止语言服务器
async function stopLanguageServer(): Promise<void> {
  try {
    if (client) {
      await client.stop();
      console.log("语言服务器已停止");
    }
  } catch (error) {
    console.error("停止语言服务器失败：", error);
    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  console.log("正在停用折言语言扩展");
  return stopLanguageServer().catch((error) => {
    console.error("停用过程中发生错误：", error);
  });
}
