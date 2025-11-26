# Origami Language Extension 安装指南

## 系统要求

- Visual Studio Code 1.74.0 或更高版本
- 支持的操作系统：
  - Windows 10 或更高版本
  - macOS 10.15 或更高版本
  - Linux (Ubuntu 18.04+ 或其他现代发行版)

## 安装方法

### 方法一：从 VSIX 文件安装

1. 下载最新的 `.vsix` 文件
2. 打开 VS Code
3. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS) 打开命令面板
4. 输入 "Extensions: Install from VSIX..."
5. 选择下载的 `.vsix` 文件

### 方法二：从源码构建

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/origami-vscode-extension.git
   cd origami-vscode-extension
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建语言服务器（所有平台）：
   ```bash
   cd server
   ./build.sh
   ```

4. 编译扩展：
   ```bash
   cd ..
   npx tsc -p ./
   ```

5. 打包扩展：
   ```bash
   npm install -g vsce
   vsce package
   ```

6. 安装生成的 `.vsix` 文件

## 跨平台支持

扩展会自动检测你的操作系统并使用相应的语言服务器可执行文件：

- **Windows**: `origami-language-server.exe`
- **macOS**: `origami-language-server`
- **Linux**: `origami-language-server-linux`

## 配置

安装完成后，你可以在 VS Code 设置中配置 Origami 语言服务器：

- `origami.languageServer.enabled`: 启用/禁用语言服务器
- `origami.languageServer.path`: 自定义语言服务器路径
- `origami.languageServer.communicationMode`: 通信模式 (stdio/tcp)
- `origami.languageServer.tcpPort`: TCP 端口号 (默认 8081)
- `origami.languageServer.verbose`: 启用详细日志
- `origami.languageServer.logFile`: 日志文件路径

## 验证安装

1. 创建一个新文件，保存为 `.zy` 扩展名
2. 输入一些 Origami 代码：
   ```origami
   函数 测试() {
       打印("Hello, Origami!");
   }
   
   测试();
   ```
3. 检查是否有语法高亮和代码补全功能

## 故障排除

如果遇到问题，请检查：

1. **VS Code 版本**是否符合要求
2. **扩展是否正确安装**
3. **语言服务器可执行文件**是否存在且有执行权限
4. 查看 **VS Code 开发者控制台**的错误信息
5. 检查 **输出面板**中的 "Origami Language Server" 日志

### 常见问题

#### macOS 上语言服务器无法启动
- 确保 `server/origami-language-server` 文件有执行权限：
  ```bash
  chmod +x server/origami-language-server
  ```

#### Linux 上语言服务器无法启动
- 确保 `server/origami-language-server-linux` 文件有执行权限：
  ```bash
  chmod +x server/origami-language-server-linux
  ```

#### Windows 上语言服务器无法启动
- 检查是否被杀毒软件阻止
- 确保 `server/origami-language-server.exe` 文件存在

#### TCP 端口冲突
如果遇到 "Port already in use" 错误：

1. **检查端口占用**：
   ```bash
   # macOS/Linux
   lsof -i :8081
   
   # Windows
   netstat -ano | findstr :8081
   ```

2. **更改端口**：
   - 打开 VS Code 设置
   - 搜索 "origami.languageServer.tcpPort"
   - 修改为其他可用端口（如 8082, 8083 等）

3. **终止占用进程**：
   ```bash
   # macOS/Linux
   pkill -f origami-language-server
   
   # Windows
   taskkill /f /im origami-language-server.exe
   ```

4. **使用 STDIO 模式**：
   - 将 `origami.languageServer.communicationMode` 设置为 "stdio"
   - 这样可以避免端口冲突问题

### 调试模式

如果需要调试语言服务器，可以启用详细日志：

1. 打开 VS Code 设置
2. 搜索 "origami"
3. 启用 `origami.languageServer.verbose`
4. 设置 `origami.languageServer.logFile` 为日志文件路径
5. 重启 VS Code

## 卸载

在 VS Code 扩展面板中找到 "Origami Language Support" 并点击卸载。

## 支持

如果遇到问题，请：

1. 查看项目的 [GitHub Issues](https://github.com/your-username/origami-vscode-extension/issues)
2. 提交新的 Issue 并包含：
   - 操作系统版本
   - VS Code 版本
   - 错误信息
   - 重现步骤