import * as vscode from "vscode";
import * as cp from "child_process";
import * as os from "os";
import * as path from "path";

/**
 * zy-lsp命令检测器
 * 负责检测zy-lsp命令是否存在，并注入相应的PATH环境变量
 * 支持 Windows、macOS 和 Linux 系统
 */
export class ZyLspDetector {
  private static instance: ZyLspDetector;
  private isInitialized = false;
  private isWindows = os.platform() === "win32";

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ZyLspDetector {
    if (!ZyLspDetector.instance) {
      ZyLspDetector.instance = new ZyLspDetector();
    }
    return ZyLspDetector.instance;
  }

  /**
   * 初始化PATH环境变量
   * 尝试从用户的shell配置文件获取完整的PATH
   */
  public async initializePath(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 显示原始PATH值（使用控制台输出，避免弹窗过多）
    const originalPath = process.env.PATH || "未设置";
    console.log(`[ZyLspDetector] 原始PATH: ${originalPath}`);
    
    // 分析 PATH 中的目录
    if (this.isWindows) {
      const pathDirs = originalPath.split(';').filter(dir => dir.trim().length > 0);
      console.log(`[ZyLspDetector] PATH 包含 ${pathDirs.length} 个目录:`);
      pathDirs.forEach((dir, index) => {
        console.log(`[ZyLspDetector]   ${index + 1}. ${dir}`);
      });
    } else {
      const pathDirs = originalPath.split(':').filter(dir => dir.trim().length > 0);
      console.log(`[ZyLspDetector] PATH 包含 ${pathDirs.length} 个目录:`);
      pathDirs.forEach((dir, index) => {
        console.log(`[ZyLspDetector]   ${index + 1}. ${dir}`);
      });
    }

    try {
      // 先尝试直接检测zy-lsp命令
      console.log("[ZyLspDetector] 开始直接检测zy-lsp命令...");
      const directCheck = await this.checkZyLspCommandDirect();

      if (directCheck) {
        console.log("[ZyLspDetector] 直接检测成功，无需PATH注入");
        this.isInitialized = true;
        return;
      }

      console.log("[ZyLspDetector] 直接检测失败，尝试PATH注入...");
      
      // 显示操作系统信息
      if (this.isWindows) {
        console.log("[ZyLspDetector] 当前系统: Windows，将使用目录搜索方式");
      } else {
        console.log("[ZyLspDetector] 当前系统: Unix/Linux/macOS，将使用PATH注入方式");
      }

      if (this.isWindows) {
        // Windows 系统使用不同的方法
        await this.initializePathWindows();
      } else {
        // Unix 系统使用原有的方法
        await this.initializePathUnix();
      }

      // 测试PATH是否真的生效（仅对Unix系统）
      if (!this.isWindows) {
        try {
          const testResult = cp.execSync("which zy-lsp").toString().trim();
          console.log(`[ZyLspDetector] PATH测试成功: zy-lsp位于 ${testResult}`);
        } catch (testError) {
          const errorMessage =
            testError instanceof Error ? testError.message : String(testError);
          console.warn(`[ZyLspDetector] PATH测试失败: ${errorMessage}`);
        }
      }

      this.isInitialized = true;
      
      // 显示初始化完成信息
      if (this.isWindows) {
        console.log("[ZyLspDetector] Windows 系统初始化完成");
      } else {
        console.log("[ZyLspDetector] Unix 系统初始化完成");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[ZyLspDetector] 获取用户PATH失败: ${errorMessage}`);
    }
  }

  /**
   * Windows 系统初始化 PATH
   */
  private async initializePathWindows(): Promise<void> {
    console.log("[ZyLspDetector] 使用 Windows 方式初始化 PATH...");

    // Windows 系统直接搜索常用目录，不修改 PATH
    await this.searchZyLspInCommonDirectories();
  }

  /**
   * Unix 系统初始化 PATH
   */
  private async initializePathUnix(): Promise<void> {
    console.log("[ZyLspDetector] 使用 Unix 方式初始化 PATH...");

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
        console.log(`[ZyLspDetector] 正在尝试source: ${fullPath}`);

        // 使用execSync，但设置较短的超时时间
        const result = cp
          .execSync(`bash -c "source ~/${config} && echo \$PATH"`, {
            encoding: "utf8",
            timeout: 2000, // 2秒超时
          })
          .toString()
          .trim();

        console.log(`[ZyLspDetector] source ${config} 结果: ${result}`);

        if (result && result !== process.env.PATH) {
          userPath = result;
          console.log(`[ZyLspDetector] 找到有效PATH: ${result}`);
          break; // 找到有效PATH就退出循环
        } else {
          console.warn(`[ZyLspDetector] PATH无变化: ${result}`);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(`[ZyLspDetector] source ${config} 失败: ${errorMessage}`);
        // 继续尝试下一个配置文件
        continue;
      }
    }

    // 只有在找到用户PATH时才合并
    if (userPath) {
      const originalPath = process.env.PATH || "";
      process.env.PATH = `${userPath}:${originalPath}`;

      // 显示调试信息
      console.log(`[ZyLspDetector] PATH注入成功!\n用户PATH: ${userPath}\n合并后PATH: ${process.env.PATH}`);
    } else {
      console.warn("[ZyLspDetector] 未找到用户自定义PATH，尝试在常用目录下查询zy-lsp");

      // 在常用目录下查询zy-lsp
      await this.searchZyLspInCommonDirectories();
    }
  }

  /**
   * 检查zy-lsp命令是否存在
   * @returns Promise<boolean> 如果命令存在返回true，否则返回false
   */
  public async checkZyLspCommand(): Promise<boolean> {
    // 确保PATH已经初始化
    if (!this.isInitialized) {
      await this.initializePath();
    }

    if (this.isWindows) {
      // Windows 系统先检查 PATH 中是否有 zy-lsp，如果没有再检查常用目录
      console.log("[ZyLspDetector] Windows 系统开始检测 zy-lsp 命令...");
      
      // 先尝试使用 where 命令检查 PATH 中的 zy-lsp
      try {
        console.log("[ZyLspDetector] 尝试使用 'where zy-lsp' 命令检测...");
        const result = cp.execSync("where zy-lsp", { encoding: "utf8" }).toString().trim();
        if (result && result.length > 0) {
          console.log(`[ZyLspDetector] Windows 系统在 PATH 中检测到 zy-lsp: ${result}`);
          return true;
        } else {
          console.log("[ZyLspDetector] 'where zy-lsp' 命令执行成功但未找到结果");
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(`[ZyLspDetector] Windows 系统 PATH 中未找到 zy-lsp: ${errorMessage}，尝试搜索常用目录...`);
      }
      
      // 如果 PATH 中没有，再搜索常用目录
      const result = await this.checkZyLspInCommonDirectoriesWindows();
      if (result) {
        console.log("[ZyLspDetector] Windows 系统在常用目录中检测到 zy-lsp 命令");
      } else {
        console.warn("[ZyLspDetector] Windows 系统未检测到 zy-lsp 命令，将使用TCP连接方式");
      }
      return result;
    } else {
      // Unix 系统使用 which 命令检查
      return new Promise<boolean>((resolve) => {
        cp.exec("which zy-lsp", (error, stdout) => {
          const exists = !error && stdout.trim().length > 0;

          if (exists) {
            console.log(`[ZyLspDetector] 检测到zy-lsp命令: ${stdout.trim()}`);
          } else {
            console.warn("[ZyLspDetector] 未检测到zy-lsp命令，将使用TCP连接方式");
          }

          resolve(exists);
        });
      });
    }
  }

  /**
   * 重置初始化状态（用于测试或重新初始化）
   */
  public reset(): void {
    this.isInitialized = false;
  }

  /**
   * 获取当前PATH值
   */
  public getCurrentPath(): string {
    return process.env.PATH || "";
  }

  /**
   * 检查是否已经初始化
   */
  public isPathInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 直接检测zy-lsp命令（不依赖PATH注入）
   */
  private async checkZyLspCommandDirect(): Promise<boolean> {
    if (this.isWindows) {
      // Windows 系统先检查 PATH 中是否有 zy-lsp，如果没有再检查常用目录
      console.log("[ZyLspDetector] Windows 系统开始直接检测...");
      
      // 先尝试使用 where 命令检查 PATH 中的 zy-lsp
      try {
        console.log("[ZyLspDetector] 尝试使用 'where zy-lsp' 命令检测...");
        const result = cp.execSync("where zy-lsp", { encoding: "utf8" }).toString().trim();
        if (result && result.length > 0) {
          console.log(`[ZyLspDetector] Windows 系统在 PATH 中检测到 zy-lsp: ${result}`);
          return true;
        } else {
          console.log("[ZyLspDetector] 'where zy-lsp' 命令执行成功但未找到结果");
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(`[ZyLspDetector] Windows 系统 PATH 中未找到 zy-lsp: ${errorMessage}，尝试搜索常用目录...`);
      }
      
      // 如果 PATH 中没有，再搜索常用目录
      const result = await this.checkZyLspInCommonDirectoriesWindows();
      if (result) {
        console.log("[ZyLspDetector] Windows 系统在常用目录中检测到 zy-lsp 命令");
      } else {
        console.warn("[ZyLspDetector] Windows 系统直接检测未找到 zy-lsp 命令");
      }
      return result;
    } else {
      // Unix 系统使用 which 命令
      return new Promise<boolean>((resolve) => {
        cp.exec("which zy-lsp", (error, stdout) => {
          const exists = !error && stdout.trim().length > 0;
          if (exists) {
            console.log(`[ZyLspDetector] 直接检测到zy-lsp命令: ${stdout.trim()}`);
          } else {
            console.warn("[ZyLspDetector] 直接检测未找到 zy-lsp 命令");
          }
          resolve(exists);
        });
      });
    }
  }

  /**
   * Windows 系统检查常用目录中的 zy-lsp
   */
  private async checkZyLspInCommonDirectoriesWindows(): Promise<boolean> {
    const fs = require("fs");

    // Windows 常用目录
    const commonDirs = [
      "C:\\Program Files",
      "C:\\Program Files (x86)",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs") : "",
      process.env.APPDATA ? path.join(process.env.APPDATA, "Programs") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData\\Local\\Programs") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Desktop\\github.com\\php-any\\origami\\bin") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "go\\bin") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".cargo\\bin") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "bin") : "",
    ].filter(Boolean);

    console.log("[ZyLspDetector] 在 Windows 常用目录下搜索 zy-lsp...");

    for (const dir of commonDirs) {
      try {
        const zyLspPath = path.join(dir, "zy-lsp.exe");
        if (fs.existsSync(zyLspPath)) {
          console.log(`[ZyLspDetector] 在常用目录中找到zy-lsp: ${zyLspPath}`);
          return true;
        }
      } catch (e) {
        // 忽略错误，继续搜索下一个目录
        continue;
      }
    }

    console.warn("[ZyLspDetector] 在 Windows 常用目录中未找到 zy-lsp");
    return false;
  }

  /**
   * 在常用目录下搜索zy-lsp
   */
  private async searchZyLspInCommonDirectories(): Promise<void> {
    const fs = require("fs");

    // 根据操作系统选择不同的常用目录
    const commonDirs = this.isWindows ? [
      // Windows 常用目录
      "C:\\Program Files",
      "C:\\Program Files (x86)",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs") : "",
      process.env.APPDATA ? path.join(process.env.APPDATA, "Programs") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData\\Local\\Programs") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Desktop\\github.com\\php-any\\origami\\bin") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "go\\bin") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".cargo\\bin") : "",
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "bin") : "",
    ].filter(Boolean) : [
      // Unix 常用目录
      "/usr/local/bin",
      "/usr/bin",
      "/opt/homebrew/bin",
      "/opt/local/bin",
      path.join(process.env.HOME || "", "bin"),
      path.join(process.env.HOME || "", "local/bin"),
      path.join(
        process.env.HOME || "",
        "Desktop/github.com/php-any/origami/bin"
      ),
      path.join(process.env.HOME || "", "go/bin"),
      path.join(process.env.HOME || "", ".cargo/bin"),
      path.join(process.env.HOME || "", ".local/bin"),
    ];

        console.log("[ZyLspDetector] 开始在常用目录下搜索zy-lsp...");

    for (const dir of commonDirs) {
      try {
        const zyLspPath = this.isWindows 
          ? path.join(dir, "zy-lsp.exe")
          : path.join(dir, "zy-lsp");
          
        if (fs.existsSync(zyLspPath)) {
          console.log(`[ZyLspDetector] 在常用目录中找到zy-lsp: ${zyLspPath}`);

          if (this.isWindows) {
            // Windows 系统不修改 PATH，直接返回
            console.log(`[ZyLspDetector] Windows 系统找到 zy-lsp，路径: ${zyLspPath}`);
            return;
          } else {
            // Unix 系统将这个目录添加到PATH
            const currentPath = process.env.PATH || "";
            process.env.PATH = `${dir}:${currentPath}`;

            console.log(`[ZyLspDetector] 已将 ${dir} 添加到PATH: ${process.env.PATH}`);
            return;
          }
        }
      } catch (e) {
        // 忽略错误，继续搜索下一个目录
        continue;
      }
    }

    console.warn("[ZyLspDetector] 在常用目录中未找到zy-lsp");
    
    // 根据操作系统显示不同的提示
    if (this.isWindows) {
      console.log("[ZyLspDetector] Windows 系统搜索完成，未找到 zy-lsp.exe");
    } else {
      console.log("[ZyLspDetector] Unix 系统搜索完成，未找到 zy-lsp");
    }
   }
}
