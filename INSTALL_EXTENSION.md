# VS Code 扩展安装指南

## 🎉 扩展打包完成！

你的折言语言扩展已经成功打包为：`origami-language-0.0.1.vsix`

## 📦 安装方法

### 方法 1：通过 VS Code 界面安装（推荐）

1. **打开 VS Code**
2. **按 `Ctrl+Shift+P`** (macOS: `Cmd+Shift+P`)
3. **输入命令**：`Extensions: Install from VSIX...`
4. **选择文件**：浏览并选择 `origami-language-0.0.1.vsix`
5. **重启 VS Code**：安装完成后重启以激活扩展

### 方法 2：通过命令行安装

```bash
# 使用code命令安装（如果已安装code命令）
code --install-extension origami-language-0.0.1.vsix

# 或者使用vsce工具安装
vsce install origami-language-0.0.1.vsix
```

## 🔧 安装后配置

### 1. 验证扩展安装

- 打开扩展面板 (`Ctrl+Shift+X`)
- 搜索 "Origami Language Support"
- 确认扩展已安装并启用

### 2. 选择连接方式

#### 方式 A：使用 zy-lsp 命令（推荐）

```bash
# 安装zy-lsp命令到系统PATH
# 扩展会自动检测并使用stdio方式
```

#### 方式 B：使用 TCP 连接

```bash
# 启动语言服务器在localhost:8800端口
# 扩展会自动连接
```

### 3. 测试扩展功能

1. **创建测试文件**：新建 `.zy` 文件
2. **查看语法高亮**：确认代码有颜色标记
3. **检查控制台输出**：查看连接方式信息

## 📁 扩展文件说明

```
origami-language-0.0.1.vsix
├─ 扩展清单文件
├─ 编译后的JavaScript代码
├─ 语法高亮规则
├─ 语言配置文件
├─ 图标文件
└─ 文档文件
```

## 🚀 新功能特性

### ✨ stdio 连接支持

- 自动检测 `zy-lsp` 命令
- 优先使用 stdio 方式启动
- 无需网络配置，启动更快

### 🔄 智能回退

- 如果 zy-lsp 不可用，自动回退到 TCP
- 确保兼容性和稳定性
- 支持两种连接方式无缝切换

### 📝 完整语言支持

- 语法高亮和代码提示
- 智能代码补全
- 支持 `.zy` 和 `.ori` 文件

## 🐛 故障排除

### 安装问题

1. **扩展安装失败**

   - 检查 VS Code 版本是否兼容（需要 1.102.0+）
   - 确认文件完整性

2. **扩展无法激活**
   - 重启 VS Code
   - 检查扩展是否已启用

### 连接问题

1. **stdio 方式问题**

   - 确认 `zy-lsp` 命令已安装到 PATH
   - 检查命令执行权限

2. **TCP 方式问题**
   - 确认语言服务器在 8800 端口运行
   - 检查防火墙设置

## 📋 系统要求

- **VS Code**: 1.102.0 或更高版本
- **Node.js**: 20.14.0 或更高版本
- **操作系统**: Windows, macOS, Linux

## 🎯 下一步

1. **安装扩展**：按照上述步骤安装
2. **配置环境**：选择并配置连接方式
3. **开始使用**：创建 `.zy` 文件开始编码
4. **反馈问题**：如有问题请提交 Issue

## 📞 技术支持

- **文档**: 查看 `README.md` 和 `STDIO_TESTING.md`
- **问题反馈**: 在 GitHub 仓库提交 Issue
- **功能建议**: 欢迎提交 Feature Request

---

🎉 **恭喜！你的折言语言扩展已经准备就绪！**



