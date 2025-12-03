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
exports.ensureZyLspAvailable = ensureZyLspAvailable;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const stream = __importStar(require("stream"));
const util_1 = require("util");
const tar = __importStar(require("tar"));
const unzipper = __importStar(require("unzipper"));
const zy_lsp_detector_1 = require("./zy-lsp-detector");
const pipeline = (0, util_1.promisify)(stream.pipeline);
// 当前使用的 origami 发布版本标签
// TODO: 后续可以考虑从配置或扩展版本中推导
const ORIGAMI_RELEASE_TAG = "v0.0.15";
function getReleaseAssetInfo() {
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
async function downloadFile(url, dest) {
    await new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
            if (res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location) {
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
async function extractArchive(archivePath, destDir, isZip) {
    if (isZip) {
        await pipeline(fs.createReadStream(archivePath), unzipper.Extract({ path: destDir }));
    }
    else {
        await tar.extract({
            file: archivePath,
            cwd: destDir,
        });
    }
}
async function ensureZyLspAvailable(context) {
    // 1. 先尝试使用系统已有的 zy-lsp（模仿 Go 扩展对 gopls 的处理）
    try {
        await zy_lsp_detector_1.ZyLspDetector.getInstance().initializePath();
    }
    catch (e) {
        const msg = e instanceof Error
            ? e.message
            : String(e) || "未知错误（初始化 PATH 失败）";
        console.warn("[ZyLspInstaller] 初始化 PATH 失败：", msg);
    }
    const hasSystemLsp = await zy_lsp_detector_1.ZyLspDetector.getInstance().checkZyLspCommand();
    if (hasSystemLsp) {
        // 直接使用系统命令，让 Node 通过 PATH 查找
        return "zy-lsp";
    }
    // 2. 如果系统中没有 zy-lsp，尝试提供自动下载选项
    const INSTALL = "自动下载并安装";
    const CANCEL = "暂时忽略";
    const choice = await vscode.window.showWarningMessage("未检测到 zy-lsp 语言服务器，是否从 GitHub Release 自动下载并安装？", INSTALL, CANCEL);
    if (choice !== INSTALL) {
        return undefined;
    }
    const assetInfo = getReleaseAssetInfo();
    if (!assetInfo) {
        vscode.window.showErrorMessage(`当前平台（${process.platform}/${process.arch}）暂不支持自动安装 zy-lsp，请手动从 GitHub Releases 下载并安装。`);
        return undefined;
    }
    const storageDir = path.join(context.globalStorageUri.fsPath, "zy-lsp", `${process.platform}-${process.arch}`);
    const archivePath = path.join(os.tmpdir(), `origami-${process.platform}-${process.arch}-${Date.now()}${assetInfo.isZip ? ".zip" : ".tar.gz"}`);
    try {
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        vscode.window.showInformationMessage(`正在从 Origami Release (${ORIGAMI_RELEASE_TAG}) 下载 zy-lsp，请稍候...`);
        await downloadFile(assetInfo.url, archivePath);
        await extractArchive(archivePath, storageDir, assetInfo.isZip);
        const lspPath = path.join(storageDir, assetInfo.lspBinaryName);
        if (!fs.existsSync(lspPath)) {
            vscode.window.showErrorMessage(`在解压后的目录中未找到 ${assetInfo.lspBinaryName}，请手动检查 ${storageDir}`);
            return undefined;
        }
        if (process.platform !== "win32") {
            try {
                fs.chmodSync(lspPath, 0o755);
            }
            catch (e) {
                console.warn("[ZyLspInstaller] 设置执行权限失败：", e);
            }
        }
        vscode.window.showInformationMessage("zy-lsp 安装完成。");
        return lspPath;
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e) || "未知错误（下载/解压失败）";
        vscode.window.showErrorMessage(`自动安装 zy-lsp 失败：${msg}`);
        return undefined;
    }
    finally {
        try {
            if (fs.existsSync(archivePath)) {
                fs.unlinkSync(archivePath);
            }
        }
        catch {
            // ignore
        }
    }
}
//# sourceMappingURL=zy-lsp-installer.js.map