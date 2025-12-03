import * as vscode from "vscode";
import * as https from "https";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as stream from "stream";
import { promisify } from "util";
import * as tar from "tar";
import * as unzipper from "unzipper";
import { ZyLspDetector } from "./zy-lsp-detector";

const pipeline = promisify(stream.pipeline);

// 当前使用的 origami 发布版本标签
// TODO: 后续可以考虑从配置或扩展版本中推导
const ORIGAMI_RELEASE_TAG = "v0.0.15";

interface ReleaseAssetInfo {
  url: string;
  fileName: string;
  isZip: boolean;
  lspBinaryName: string;
}

function getReleaseAssetInfo(): ReleaseAssetInfo | undefined {
  const platform = process.platform;
  const arch = process.arch;

  // 根据平台和架构选择对应的 Release 资产
  // 参见 https://github.com/php-any/origami/releases/tag/v0.0.15
  if (platform === "linux" && arch === "x64") {
    return {
      fileName: "origami-linux-amd64.tar.gz",
      url: `https://github.com/php-any/origami/releases/download/${ORIGAMI_RELEASE_TAG}/origami-linux-amd64.tar.gz`,
      isZip: false,
      lspBinaryName: "zy-lsp",
    };
  }

  if (platform === "linux" && arch === "arm64") {
    return {
      fileName: "origami-linux-arm64.tar.gz",
      url: `https://github.com/php-any/origami/releases/download/${ORIGAMI_RELEASE_TAG}/origami-linux-arm64.tar.gz`,
      isZip: false,
      lspBinaryName: "zy-lsp",
    };
  }

  if (platform === "darwin" && arch === "x64") {
    return {
      fileName: "origami-darwin-amd64.tar.gz",
      url: `https://github.com/php-any/origami/releases/download/${ORIGAMI_RELEASE_TAG}/origami-darwin-amd64.tar.gz`,
      isZip: false,
      lspBinaryName: "zy-lsp",
    };
  }

  if (platform === "darwin" && arch === "arm64") {
    return {
      fileName: "origami-darwin-arm64.tar.gz",
      url: `https://github.com/php-any/origami/releases/download/${ORIGAMI_RELEASE_TAG}/origami-darwin-arm64.tar.gz`,
      isZip: false,
      lspBinaryName: "zy-lsp",
    };
  }

  if (platform === "win32" && arch === "x64") {
    return {
      fileName: "origami-windows-amd64.zip",
      url: `https://github.com/php-any/origami/releases/download/${ORIGAMI_RELEASE_TAG}/origami-windows-amd64.zip`,
      isZip: true,
      lspBinaryName: "zy-lsp.exe",
    };
  }

  return undefined;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // 处理重定向
          const redirectUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.destroy();
          downloadFile(redirectUrl, dest).then(resolve, reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`下载失败，状态码: ${res.statusCode}, URL: ${url}`));
          return;
        }

        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
        fileStream.on("error", (err) => {
          reject(err);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function extractArchive(
  archivePath: string,
  destDir: string,
  isZip: boolean
): Promise<void> {
  if (isZip) {
    await pipeline(
      fs.createReadStream(archivePath),
      unzipper.Extract({ path: destDir })
    );
  } else {
    await tar.extract({
      file: archivePath,
      cwd: destDir,
    });
  }
}

export async function ensureZyLspAvailable(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  // 1. 先尝试使用系统已有的 zy-lsp（模仿 Go 扩展对 gopls 的处理）
  try {
    await ZyLspDetector.getInstance().initializePath();
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : String(e) || "未知错误（初始化 PATH 失败）";
    console.warn("[ZyLspInstaller] 初始化 PATH 失败：", msg);
  }

  const hasSystemLsp = await ZyLspDetector.getInstance().checkZyLspCommand();
  if (hasSystemLsp) {
    // 直接使用系统命令，让 Node 通过 PATH 查找
    return "zy-lsp";
  }

  // 2. 如果系统中没有 zy-lsp，尝试提供自动下载选项
  const INSTALL = "自动下载并安装";
  const CANCEL = "暂时忽略";

  const choice = await vscode.window.showWarningMessage(
    "未检测到 zy-lsp 语言服务器，是否从 GitHub Release 自动下载并安装？",
    INSTALL,
    CANCEL
  );

  if (choice !== INSTALL) {
    return undefined;
  }

  const assetInfo = getReleaseAssetInfo();
  if (!assetInfo) {
    vscode.window.showErrorMessage(
      `当前平台（${process.platform}/${process.arch}）暂不支持自动安装 zy-lsp，请手动从 GitHub Releases 下载并安装。`
    );
    return undefined;
  }

  const storageDir = path.join(
    context.globalStorageUri.fsPath,
    "zy-lsp",
    `${process.platform}-${process.arch}`
  );
  const archivePath = path.join(
    os.tmpdir(),
    `origami-${process.platform}-${process.arch}-${Date.now()}${
      assetInfo.isZip ? ".zip" : ".tar.gz"
    }`
  );

  try {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    vscode.window.showInformationMessage(
      `正在从 Origami Release (${ORIGAMI_RELEASE_TAG}) 下载 zy-lsp，请稍候...`
    );

    await downloadFile(assetInfo.url, archivePath);

    await extractArchive(archivePath, storageDir, assetInfo.isZip);

    const lspPath = path.join(storageDir, assetInfo.lspBinaryName);

    if (!fs.existsSync(lspPath)) {
      vscode.window.showErrorMessage(
        `在解压后的目录中未找到 ${assetInfo.lspBinaryName}，请手动检查 ${storageDir}`
      );
      return undefined;
    }

    if (process.platform !== "win32") {
      try {
        fs.chmodSync(lspPath, 0o755);
      } catch (e) {
        console.warn("[ZyLspInstaller] 设置执行权限失败：", e);
      }
    }

    vscode.window.showInformationMessage("zy-lsp 安装完成。");
    return lspPath;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : String(e) || "未知错误（下载/解压失败）";
    vscode.window.showErrorMessage(`自动安装 zy-lsp 失败：${msg}`);
    return undefined;
  } finally {
    try {
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
      }
    } catch {
      // ignore
    }
  }
}
