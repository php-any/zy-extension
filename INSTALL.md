# Origami Language Extension 安装指南

## 方法一：通过 VS Code 界面安装（推荐）

1. 打开 VS Code
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 浏览并选择 `origami-language-0.0.1.vsix` 文件
5. 点击安装，等待安装完成
6. 重启 VS Code

## 方法二：通过命令行安装

**注意**: 如果遇到路径问题，请使用绝对路径

```bash
# 进入扩展文件所在目录
cd "d:\github.cocm\php-any\zy-extension"

# 使用绝对路径安装
code --install-extension "d:\github.cocm\php-any\zy-extension\origami-language-0.0.1.vsix"
```

## 方法三：开发模式安装

如果上述方法都失败，可以使用开发模式：

1. 打开 VS Code
2. 按 `F5` 或 `Ctrl+Shift+P` 输入 "Debug: Start Debugging"
3. 选择 "VS Code Extension Development"
4. 这将打开一个新的 VS Code 窗口，扩展已自动加载

## 方法四：手动复制安装

1. 解压 `origami-language-0.0.1.vsix` 文件（重命名为 .zip 后解压）
2. 将解压后的文件夹复制到 VS Code 扩展目录：
   - Windows: `%USERPROFILE%\.vscode\extensions\origami-language-0.0.1\`
   - macOS: `~/.vscode/extensions/origami-language-0.0.1/`
   - Linux: `~/.vscode/extensions/origami-language-0.0.1/`
3. 重启 VS Code

## 验证安装

1. 创建一个新文件，保存为 `.cjp` 或 `.cj` 扩展名
2. 输入以下代码测试语法高亮：

```php
<?php
namespace Test;

@Controller
class TestController {
    public function test(): string {
        $message = "Hello {$name}!";
        return $message;
    }
    
    函数 测试(): void {
        输出 "中文关键字测试";
    }
}
```

3. 如果看到语法高亮，说明安装成功！

## 故障排除

### 常见问题解决方案

#### 1. 命令行安装失败
如果 `code --install-extension` 命令失败：

- **解决方案 A**: 使用 VS Code 界面安装（方法一）
- **解决方案 B**: 尝试以管理员身份运行命令提示符
- **解决方案 C**: 检查 VS Code 是否正确添加到系统 PATH

#### 2. 权限问题
```bash
# Windows: 以管理员身份运行 PowerShell
Start-Process powershell -Verb runAs

# 然后执行安装命令
code --install-extension "d:\github.cocm\php-any\zy-extension\origami-language-0.0.1.vsix"
```

#### 3. VS Code 版本兼容性
- 确保 VS Code 版本 >= 1.102.0
- 更新到最新版本：Help → Check for Updates

#### 4. 手动验证扩展文件
```bash
# 检查文件是否存在和大小
dir "d:\github.cocm\php-any\zy-extension\origami-language-0.0.1.vsix"

# 文件大小应该约为 9-10 KB
```

#### 5. 开发模式测试（推荐）
如果所有安装方法都失败，使用开发模式：

1. 在 VS Code 中打开扩展项目文件夹：`d:\github.cocm\php-any\zy-extension`
2. 按 `F5` 启动调试
3. 选择 "VS Code Extension Development"
4. 新窗口中扩展会自动加载

#### 6. 检查扩展状态
安装后检查：

1. 打开 VS Code 扩展面板 (Ctrl+Shift+X)
2. 搜索 "Origami" 或 "origami-language"
3. 确认扩展已启用
4. 重启 VS Code

#### 7. 清理和重试
如果多次安装失败：

```bash
# 清理可能的残留文件
code --uninstall-extension origami-lang.origami-language

# 重新打包
vsce package

# 重新安装
code --install-extension origami-language-0.0.1.vsix
```

## 功能特性

- ✅ `.cjp` 和 `.cj` 文件语法高亮
- ✅ 中文关键字支持
- ✅ 字符串插值语法
- ✅ 注解语法高亮
- ✅ 自动括号配对
- ✅ 智能缩进
- ✅ 代码折叠

---

**注意**: 这是 Origami 语言扩展的初始版本，如有问题请反馈！