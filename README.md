# Origami Language Support for VS Code

## 简介

这是一个为 Visual Studio Code 提供折言(origami-lang)语言支持的扩展插件。折言是一门创新性的融合型脚本语言，深度结合 PHP 的快速开发基因与 Go 的高效并发模型。

## 特性

### 🎯 语法高亮

- 支持 origami 语言的所有关键字和语法结构
- 支持中文关键字高亮（函数、输出、类等）
- 支持字符串插值语法 `"Hello {$name}"` 和 `"@{function()}"`
- 支持注解语法 `@Controller`、`@Route` 等
- 支持类型声明和可空类型 `?string`

### 📝 代码编辑

- 自动括号配对和闭合
- 智能缩进
- 代码折叠支持
- 注释快捷键支持

### 🔧 文件支持

- `.cjp` - 折言脚本文件
- `.cj` - 折言代码文件

### 🚀 智能连接

- 自动检测 `zy-lsp` 命令，优先使用 stdio 方式
- 回退到 TCP 连接方式，确保兼容性
- 支持两种连接方式的自动切换

## 语言特性

### 核心语法

```php
// 变量声明和类型
string $name = "Alice";
int $age = 25;
?string $nickname = null;

// 函数定义
function greet(string $name): string {
    return "Hello {$name}!";
}

// 类定义
class User {
    public string $name;

    public function __construct(string $name) {
        this->name = $name;
    }
}
```

### 并发编程

```php
// 使用 spawn 启动协程
spawn {
    echo "异步执行";
};
```

### 注解支持

```php
@Controller
@Route(prefix: "/api")
class ApiController {
    @GetMapping(path: "/users")
    public function getUsers() {
        return "用户列表";
    }
}
```

### 数组方法链

```php
$result = $array
    ->map(fn($x) => $x * 2)
    ->filter(fn($x) => $x > 10)
    ->reduce(fn($acc, $x) => $acc + $x, 0);
```

## 安装和使用

### 前提条件

在使用此扩展之前，你需要选择以下两种方式之一：

#### 方式 1：使用 zy-lsp 命令（推荐）

1. **安装 zy-lsp 命令到系统 PATH**
2. 扩展会自动检测并使用 stdio 方式启动语言服务器

#### 方式 2：使用 TCP 连接

1. **确保语言服务器在 `localhost:8800` 端口运行**
2. 扩展会自动连接到此端口

### 启动语言服务器

#### 使用 zy-lsp 命令（stdio 方式）

```bash
# 安装 zy-lsp 命令到系统 PATH
# 扩展会自动检测并使用此命令启动语言服务器
# 无需任何参数
```

#### 使用 TCP 连接

```bash
# 启动语言服务器（示例命令）
origami-language-server --port 8800
```

### 安装扩展

1. 在 VS Code 中打开扩展面板 (Ctrl+Shift+X)
2. 搜索 "Origami Language Support"
3. 点击安装

### 开始使用

1. 创建 `.cjp` 或 `.cj` 文件
2. 开始编写 origami 代码
3. 享受语法高亮和代码提示

### 🔧 语言服务器功能

- **代码补全**: 智能代码提示和自动完成
- **定义跳转**: 快速跳转到函数和变量定义
- **悬停提示**: 鼠标悬停查看符号信息
- **语法检查**: 实时语法错误检测

## 配置

可以在 VS Code 设置中配置语言服务器选项：

- `origami.languageServer.enabled`: 启用/禁用语言服务器

### 连接方式优先级

扩展会按以下优先级选择连接方式：

1. **stdio 方式**：如果检测到 `zy-lsp` 命令，优先使用 stdio 方式
2. **TCP 方式**：如果未检测到 `zy-lsp` 命令，回退到 TCP 方式（localhost:8800）

## 调试

如果连接失败，请检查：

### stdio 方式问题

1. `zy-lsp` 命令是否已安装到系统 PATH
2. 命令是否有执行权限
3. 查看 VS Code 开发者控制台的错误信息

### TCP 方式问题

1. 语言服务器是否在 `localhost:8800` 端口运行
2. 防火墙是否阻止了连接
3. 查看 VS Code 开发者控制台的错误信息

## 示例代码

```php
<?php
namespace App\Controller;

use Annotation\Route;
use Annotation\Controller;

@Controller
@Route(prefix: "/api/users")
class UserController {
    @Inject(service: "UserService")
    public $userService;

    @GetMapping(path: "/list")
    public function getUserList(): array {
        return this->userService->getAllUsers();
    }

    // 支持中文关键字
    函数 获取用户信息(int $id): ?User {
        return this->userService->findById($id);
    }
}

// 字符串插值
$message = "用户 {$user->name} 的年龄是 {$user->age}";

// 异步执行
spawn {
    输出 "异步任务执行中...";
};
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-username/origami-vscode-extension.git

# 安装依赖
npm install

# 编译
npm run compile

# 运行扩展
F5 (在 VS Code 中)
```

## 相关链接

- [Origami 语言源码](https://github.com/your-username/origami)
- [语言文档](https://origami-lang.org/docs)
- [问题反馈](https://github.com/your-username/origami-vscode-extension/issues)

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个扩展！

## 许可证

MIT License
