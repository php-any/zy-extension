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

## 安装

1. 在 VS Code 中打开扩展面板 (Ctrl+Shift+X)
2. 搜索 "Origami Language Support"
3. 点击安装

或者从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=origami-lang.origami-language) 安装。

## 使用

1. 创建 `.cjp` 或 `.cj` 文件
2. 开始编写 origami 代码
3. 享受语法高亮和代码提示

### 📚 快速开始
- [快速使用指南](QUICK_START.md) - 新用户必读
- [语言服务器修复文档](LANGUAGE_SERVER_FIX.md) - 连接问题解决方案

### 🔧 语言服务器功能
- **代码补全**: 智能代码提示和自动完成
- **定义跳转**: 快速跳转到函数和变量定义
- **悬停提示**: 鼠标悬停查看符号信息
- **语法检查**: 实时语法错误检测

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

## 相关链接

- [Origami 语言源码](https://github.com/your-username/origami)
- [语言文档](https://origami-lang.org/docs)
- [问题反馈](https://github.com/your-username/origami-vscode-extension/issues)

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个扩展！

## 许可证

MIT License

---

**代码绝对路径**: `D:\github.cocm\php-any\origami`