# stdio 连接方式测试指南

## 测试环境准备

### 1. 安装 zy-lsp 命令

为了测试 stdio 连接方式，你需要安装 `zy-lsp` 命令到系统 PATH。

#### macOS/Linux

```bash
# 方法1：创建符号链接（如果 zy-lsp 在其他位置）
sudo ln -s /path/to/your/zy-lsp /usr/local/bin/zy-lsp

# 方法2：添加到 PATH
export PATH="/path/to/your/zy-lsp:$PATH"
```

#### Windows

```cmd
# 将 zy-lsp.exe 所在目录添加到系统 PATH 环境变量
# 或者将 zy-lsp.exe 复制到 C:\Windows\System32\
```

### 2. 验证命令可用性

```bash
# 检查命令是否存在
which zy-lsp  # macOS/Linux
where zy-lsp  # Windows

# 检查命令是否可执行
zy-lsp --help  # 或任何参数
```

## 测试步骤

### 1. 编译扩展

```bash
npm run compile
```

### 2. 在 VS Code 中测试

1. 按 `F5` 启动扩展开发主机
2. 打开一个新的 VS Code 窗口
3. 创建 `.cjp` 文件
4. 查看开发者控制台输出

### 3. 预期结果

#### 如果检测到 zy-lsp 命令：

```
折言语言扩展已激活！
检测到zy-lsp命令，使用stdio方式启动语言服务器
折言语言服务器已通过stdio方式成功启动
```

#### 如果未检测到 zy-lsp 命令：

```
折言语言扩展已激活！
未检测到zy-lsp命令，使用TCP方式连接语言服务器
正在连接到语言服务器 localhost:8800
已连接到端口 8800 的语言服务器
折言语言服务器已成功连接到端口 8800
```

## 故障排除

### 常见问题

1. **命令未找到**

   - 确保 `zy-lsp` 已添加到系统 PATH
   - 重启 VS Code 和终端

2. **权限问题**

   - 确保 `zy-lsp` 有执行权限
   - macOS/Linux: `chmod +x /path/to/zy-lsp`

3. **路径问题**
   - 使用绝对路径测试
   - 检查命令是否在正确的目录

### 调试技巧

1. **查看控制台输出**

   - 在 VS Code 中按 `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
   - 输入 "Developer: Toggle Developer Tools"

2. **检查扩展日志**

   - 在扩展面板中查看扩展输出
   - 选择 "Origami Language Support" 扩展

3. **测试命令检测**
   ```bash
   node -e "
   const cp = require('child_process');
   cp.exec('which zy-lsp', (error) => {
     console.log('zy-lsp exists:', !error);
   });
   "
   ```

## 性能对比

### stdio 方式优势

- 启动更快，无需等待网络连接
- 更稳定，不受网络环境影响
- 资源占用更少

### TCP 方式优势

- 支持远程语言服务器
- 可以独立管理语言服务器进程
- 便于调试和监控

## 配置建议

- **开发环境**：推荐使用 stdio 方式，启动快速
- **生产环境**：根据部署需求选择，本地部署推荐 stdio
- **调试环境**：推荐使用 TCP 方式，便于监控和调试
