import * as vscode from "vscode";
import * as path from "path";
import * as net from "net";
import * as os from "os";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  StreamInfo,
} from "vscode-languageclient/node";
import { spawn, ChildProcess } from "child_process";

let client: LanguageClient;
let serverProcess: ChildProcess | undefined;

// 通信模式枚举
enum CommunicationMode {
  STDIO = "stdio",
  TCP = "tcp",
}

// 获取语言服务器可执行文件名
function getLanguageServerExecutableName(): string {
  const platform = os.platform();
  switch (platform) {
    case "win32":
      return "origami-language-server.exe";
    case "darwin":
      return "origami-language-server";
    case "linux":
      return "origami-language-server-linux";
    default:
      // 默认使用无扩展名版本（macOS）
      console.warn(`未知平台: ${platform}，使用默认可执行文件名`);
      return "origami-language-server";
  }
}

// 检查端口是否可用
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Origami Language Extension is now active!");

  // 获取配置
  const config = vscode.workspace.getConfiguration("origami");
  const enabled = config.get<boolean>("languageServer.enabled", true);

  if (!enabled) {
    console.log("Origami Language Server is disabled");
    return;
  }

  // 语言服务器配置
  let serverPath = config.get<string>("languageServer.path", "");
  const communicationMode = config.get<string>(
    "languageServer.communicationMode",
    CommunicationMode.TCP
  ) as CommunicationMode;
  const tcpPort = config.get<number>("languageServer.tcpPort", 8081);
  const verbose = config.get<boolean>("languageServer.verbose", false);
  const logFile = config.get<string>("languageServer.logFile", "");

  if (!serverPath) {
    // 默认使用扩展目录下的语言服务器
    const executableName = getLanguageServerExecutableName();
    serverPath = path.join(
      context.extensionPath,
      "server",
      executableName
    );
  }

  // 根据通信模式创建服务器选项
  let serverOptions: ServerOptions;

  if (communicationMode === CommunicationMode.TCP) {
    // TCP 模式：独立启动服务器进程
    serverOptions = createTcpServerOptions(
      serverPath,
      tcpPort,
      verbose,
      logFile
    );
  } else {
    // STDIO 模式：传统方式
    serverOptions = createStdioServerOptions(serverPath, verbose, logFile);
  }

  // 客户端选项
  const clientOptions: LanguageClientOptions = {
    // 注册服务器支持的文档选择器
    documentSelector: [{ scheme: "file", language: "origami" }],
    synchronize: {
      // 监听工作区中 .cjp 和 .cj 文件的变化
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{cjp,cj}"),
    },
  };

  // 创建语言客户端并启动
  client = new LanguageClient(
    "origami-language-server",
    "Origami Language Server",
    serverOptions,
    clientOptions
  );

  // 启动客户端
  if (communicationMode === CommunicationMode.TCP) {
    // TCP模式下先检查端口可用性
    checkPortAvailable(tcpPort)
      .then((available) => {
        if (!available) {
          throw new Error(`Port ${tcpPort} is already in use. Please choose a different port in settings.`);
        }
        return startLanguageServer(communicationMode, tcpPort);
      })
      .then(() => {
        console.log(
          `Origami Language Server started successfully in ${communicationMode} mode on port ${tcpPort}`
        );
      })
      .catch((error) => {
        console.error("Failed to start Origami Language Server:", error);
        vscode.window.showErrorMessage(
          `Failed to start Origami Language Server: ${error.message}`
        );
      });
  } else {
    // STDIO模式直接启动
    startLanguageServer(communicationMode, tcpPort)
      .then(() => {
        console.log(
          `Origami Language Server started successfully in ${communicationMode} mode`
        );
      })
      .catch((error) => {
        console.error("Failed to start Origami Language Server:", error);
        vscode.window.showErrorMessage(
          `Failed to start Origami Language Server: ${error.message}`
        );
      });
  }

  // 注册命令
  const restartCommand = vscode.commands.registerCommand(
    "origami.restartLanguageServer",
    () => {
      if (client) {
        stopLanguageServer()
          .then(() => {
            return startLanguageServer(communicationMode, tcpPort);
          })
          .then(() => {
            vscode.window.showInformationMessage(
              "Origami Language Server restarted"
            );
          })
          .catch((error) => {
            vscode.window.showErrorMessage(
              `Failed to restart Origami Language Server: ${error.message}`
            );
          });
      }
    }
  );

  context.subscriptions.push(restartCommand);
}

// 创建TCP模式的服务器选项
function createTcpServerOptions(
  serverPath: string,
  port: number,
  verbose: boolean,
  logFile: string
): ServerOptions {
  return () => {
    return new Promise<StreamInfo>((resolve, reject) => {
      // 构建服务器启动参数
      const args = ["--port", port.toString()];
      if (verbose) {
        args.push("--verbose");
      }
      if (logFile) {
        args.push("--log", logFile);
      }

      // 启动独立的语言服务器进程
      console.log(`Starting language server: ${serverPath} ${args.join(" ")}`);
      serverProcess = spawn(serverPath, args, {
        stdio: "pipe",
        detached: false,
      });

      if (!serverProcess) {
        reject(new Error("Failed to spawn language server process"));
        return;
      }

      // 监听进程错误
      serverProcess.on("error", (error) => {
        console.error("Language server process error:", error);
        reject(error);
      });

      serverProcess.on("exit", (code, signal) => {
        console.log(
          `Language server process exited with code ${code}, signal ${signal}`
        );
        if (code !== 0) {
          reject(new Error(`Language server exited with code ${code}`));
        }
      });

      // 监听进程输出以便调试
      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (data) => {
          console.log(`Language server stdout: ${data}`);
        });
      }
      
      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
          console.error(`Language server stderr: ${data}`);
        });
      }

      // 等待服务器启动
      let retryCount = 0;
      const maxRetries = 15;
      const retryInterval = 1000; // 1秒

      const tryConnect = () => {
        retryCount++;
        console.log(`Attempting to connect to language server (attempt ${retryCount}/${maxRetries})`);
        
        const socket = net.connect(port, "localhost");
        
        // 设置连接超时
        socket.setTimeout(5000);

        socket.on("connect", () => {
          console.log(`Connected to language server on port ${port}`);
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
          console.error(`Connection attempt ${retryCount} timed out`);
          socket.destroy();
          
          if (retryCount < maxRetries) {
            setTimeout(tryConnect, retryInterval);
          } else {
            reject(new Error(`Failed to connect to language server after ${maxRetries} attempts: connection timeout`));
          }
        });

        socket.on("error", (error) => {
          console.error(`Connection attempt ${retryCount} failed:`, error.message);
          
          if (retryCount < maxRetries) {
            setTimeout(tryConnect, retryInterval);
          } else {
            reject(new Error(`Failed to connect to language server after ${maxRetries} attempts: ${error.message}`));
          }
        });
      };

      // 等待5秒让服务器完全启动，然后开始连接尝试
      setTimeout(tryConnect, 5000);
    });
  };
}

// 创建STDIO模式的服务器选项
function createStdioServerOptions(
  serverPath: string,
  verbose: boolean,
  logFile: string
): ServerOptions {
  const args = ["--stdio"];
  if (verbose) {
    args.push("--verbose");
  }
  if (logFile) {
    args.push("--log", logFile);
  }

  return {
    run: {
      command: serverPath,
      args: args,
      transport: TransportKind.stdio,
    },
    debug: {
      command: serverPath,
      args: args,
      transport: TransportKind.stdio,
    },
  };
}

// 启动语言服务器
async function startLanguageServer(
  mode: CommunicationMode,
  port?: number
): Promise<void> {
  try {
    await client.start();
    console.log(`Language server started in ${mode} mode`);
  } catch (error) {
    console.error("Failed to start language server:", error);
    throw error;
  }
}

// 停止语言服务器
async function stopLanguageServer(): Promise<void> {
  try {
    if (client) {
      await client.stop();
      console.log("Language client stopped");
    }

    // 如果是TCP模式，需要手动终止服务器进程
    if (serverProcess) {
      console.log("Terminating language server process");
      serverProcess.kill("SIGTERM");
      serverProcess = undefined;
    }
  } catch (error) {
    console.error("Error stopping language server:", error);
    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  return stopLanguageServer().catch((error) => {
    console.error("Error during deactivation:", error);
  });
}
