# 折言语言服务器快速使用指南

## 🚀 快速开始

### 1. 安装扩展
- 在VS Code中安装折言语言扩展
- 扩展会自动激活并启动语言服务器

### 2. 验证安装
- 打开任意`.cjp`或`.cj`文件
- 查看VS Code状态栏，应显示语言服务器已连接
- 首次连接可能需要5-10秒

### 3. 功能验证
- **语法高亮**: 代码应正确着色
- **代码补全**: 输入时按`Ctrl+Space`
- **定义跳转**: 右键选择"Go to Definition"
- **悬停提示**: 鼠标悬停在符号上查看信息

## ⚙️ 配置选项

在VS Code设置中搜索"origami"可找到以下配置：

```json
{
  "origami.languageServer.enabled": true,
  "origami.languageServer.communicationMode": "tcp",
  "origami.languageServer.tcpPort": 8081,
  "origami.languageServer.verbose": false
}
```

## 🔧 故障排除

### 常见问题

1. **连接失败**
   - 检查端口8081是否被占用：`lsof -i :8081`
   - 尝试重启语言服务器：`Ctrl+Shift+P` → "Origami: Restart Language Server"

2. **功能不工作**
   - 启用详细日志：设置`origami.languageServer.verbose: true`
   - 查看输出面板：`View` → `Output` → 选择"Origami Language Server"

3. **端口冲突**
   - 修改端口：设置`origami.languageServer.tcpPort`为其他值（如8082）
   - 或切换到stdio模式：设置`origami.languageServer.communicationMode: "stdio"`

### 重置方法
如果遇到问题，可以尝试：
1. 重启VS Code
2. 重新加载窗口：`Ctrl+Shift+P` → "Developer: Reload Window"
3. 重启语言服务器：`Ctrl+Shift+P` → "Origami: Restart Language Server"

## 📝 示例代码

创建一个测试文件`test.cjp`：

```origami
// 折言示例代码
func main() {
    var message = "Hello, Origami!"
    echo message
    
    // 测试补全功能
    var numbers = [1, 2, 3, 4, 5]
    for num in numbers {
        echo num
    }
}
```

## 🆘 获取帮助

如果仍有问题：
1. 查看详细的修复文档：`LANGUAGE_SERVER_FIX.md`
2. 检查VS Code开发者控制台的错误信息
3. 提交issue到项目仓库

## ✅ 验证清单

- [ ] 扩展已安装并激活
- [ ] 语言服务器成功启动（查看输出面板）
- [ ] 端口8081可用或已配置其他端口
- [ ] 语法高亮正常工作
- [ ] 代码补全功能可用
- [ ] 定义跳转功能可用
- [ ] 悬停提示功能可用

完成以上检查后，折言语言服务器应该可以正常工作了！