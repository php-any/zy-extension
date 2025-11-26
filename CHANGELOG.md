# Change Log

折言(Origami) 语言扩展的所有重要更改都将记录在此文件中。

## [0.0.1] - 2024-01-XX

### 新增功能
- ✨ 支持 `.zy` 和 `.cj` 文件的语法高亮
- 🎯 完整的 Origami 语言关键字支持
- 🌏 中文关键字语法高亮（函数、输出、类等）
- 💬 单行注释 `//` 和块注释 `/* */` 支持
- 🔤 变量语法高亮 `$variable`
- 🎨 字符串插值语法支持 `"Hello {$name}"` 和 `"@{function()}"`
- 📝 注解语法高亮 `@Controller`、`@Route` 等
- 🔧 类型声明和可空类型支持 `?string`
- 🎪 运算符和操作符高亮
- 📦 函数名识别和高亮
- 🏗️ 类名和接口名高亮
- 🔄 自动括号配对和闭合
- 📐 智能缩进规则
- 📁 代码折叠支持
- 🎨 精美的折纸风格图标

### 支持的语法特性
- PHP 兼容语法
- Go 风格的并发关键字 `spawn`
- 类型系统 `int`、`string`、`bool`、`float`、`array`、`object`
- 面向对象编程 `class`、`interface`、`extends`、`implements`
- 控制流 `if`、`else`、`while`、`for`、`foreach`、`switch`、`match`
- 异常处理 `try`、`catch`、`finally`、`throw`
- 特殊操作符 `like`、`instanceof`、`??`
- 访问修饰符 `public`、`private`、`protected`、`static`

### 技术细节
- 基于 TextMate 语法规则
- 支持 VS Code 1.102.0+
- 完整的语言配置文件
- 优化的正则表达式匹配

---

**注意**: 这是初始版本，后续将根据用户反馈持续改进和优化。