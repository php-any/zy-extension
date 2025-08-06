# Origami Language Server

这是 Origami 语言的 Language Server Protocol (LSP) 实现，使用 Go 语言开发。

## 功能特性

### 已实现功能

- **语法解析**: 支持 Origami 语言的基本语法解析
- **代码补全**: 提供智能代码补全功能
  - 关键字补全（中英文）
  - 内置函数补全
  - 用户定义函数补全
  - 变量补全
  - 类和方法补全
  - 代码片段补全
- **函数跳转**: 支持跳转到函数、变量、类的定义位置
- **悬停提示**: 显示符号的详细信息

### 支持的语言特性

- **中英文关键字**: 支持中文和英文关键字混用
- **PHP 兼容**: 支持 PHP 风格的语法和函数
- **Go 特性**: 支持 Go 语言的并发和类型特性
- **面向对象**: 支持类、接口、继承等 OOP 特性

## 项目结构

```
server/
├── main.go                    # 主入口文件
├── internal/
│   ├── lsp/                   # LSP 协议实现
│   │   ├── server.go          # LSP 服务器
│   │   └── handler.go         # 消息处理器
│   ├── server/                # 语言服务器核心
│   │   └── language_server.go # 语言服务器逻辑
│   ├── parser/                # 语法解析器
│   │   └── parser.go          # Origami 语法解析
│   └── completion/            # 代码补全
│       └── provider.go        # 补全提供器
├── go.mod                     # Go 模块文件
└── README.md                  # 项目说明
```

## 构建和运行

### 构建

```bash
cd server
go build -o origami-language-server main.go
```

### 运行

语言服务器通过标准输入/输出与编辑器通信：

```bash
./origami-language-server
```

### 开发模式

```bash
go run main.go
```

## VS Code 集成

语言服务器已集成到 VS Code 扩展中。当你安装 Origami 语言扩展时，语言服务器会自动启动。

### 配置

在 VS Code 扩展的 `package.json` 中添加语言服务器配置：

```json
{
  "contributes": {
    "configuration": {
      "title": "Origami Language Server",
      "properties": {
        "origami.languageServer.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable Origami language server"
        },
        "origami.languageServer.path": {
          "type": "string",
          "description": "Path to Origami language server executable"
        }
      }
    }
  }
}
```

## 支持的 LSP 功能

| 功能 | 状态 | 描述 |
|------|------|------|
| textDocument/completion | ✅ | 代码补全 |
| textDocument/definition | ✅ | 跳转到定义 |
| textDocument/hover | 🚧 | 悬停提示（计划中） |
| textDocument/references | 🚧 | 查找引用（计划中） |
| textDocument/rename | 🚧 | 重命名（计划中） |
| textDocument/formatting | 🚧 | 代码格式化（计划中） |
| textDocument/diagnostics | 🚧 | 错误诊断（计划中） |

## 代码补全示例

### 关键字补全

```origami
if -> 如果 (条件) { ... }
function -> 函数 名称(参数) { ... }
class -> 类 类名 { ... }
```

### 函数补全

```origami
print -> print()
array_map -> array_map()
len -> len()
```

### 变量补全

```origami
$user -> $userName, $userAge, $userEmail
```

## 开发指南

### 添加新的补全类型

1. 在 `internal/completion/provider.go` 中添加新的补全逻辑
2. 在 `GetCompletions` 方法中调用新的补全函数
3. 定义相应的 `CompletionItem` 结构

### 扩展语法解析

1. 在 `internal/parser/parser.go` 中添加新的正则表达式模式
2. 实现相应的解析方法
3. 更新 AST 结构以支持新的语法元素

### 添加新的 LSP 功能

1. 在 `internal/lsp/handler.go` 中添加新的消息处理方法
2. 在 `HandleMessage` 中添加新的 case 分支
3. 在 `internal/server/language_server.go` 中实现相应的业务逻辑

## 测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/parser
go test ./internal/completion
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进 Origami 语言服务器！

## 许可证

MIT License