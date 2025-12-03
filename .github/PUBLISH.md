# 自动发布到 VS Code Marketplace

本项目使用 GitHub Actions 自动发布 VS Code 扩展到 Marketplace。

## 功能特性

- ✅ 自动构建 LSP 服务器（从 origami 仓库）
- ✅ 自动编译 TypeScript 代码
- ✅ 自动打包扩展
- ✅ 自动发布到 VS Code Marketplace
- ✅ 自动创建 GitHub Release

## 设置步骤

### 1. 获取 Personal Access Token (PAT)

1. 访问 [Azure DevOps](https://dev.azure.com)
2. 点击右上角头像 → **Personal access tokens**
3. 点击 **+ New Token**
4. 配置：
   - **Name**: `VS Code Extension Publishing`
   - **Organization**: 选择你的组织（或 "All accessible organizations"）
   - **Expiration**: 建议选择 1-2 年
   - **Scopes**: 选择 **Custom defined**，然后勾选：
     - **Marketplace** → **Manage**
5. 点击 **Create** 并复制 Token（只显示一次）

### 2. 配置 GitHub Secret

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加：
   - **Name**: `VSCE_PAT`
   - **Value**: 粘贴刚才复制的 PAT
5. 点击 **Add secret**

## 发布方式

### 方式 1: 通过 Git Tag 发布（推荐）

1. 更新 `package.json` 中的版本号（例如：`1.0.4`）
2. 更新 `CHANGELOG.md`
3. 提交并推送代码：
   ```bash
   git add .
   git commit -m "chore: bump version to 1.0.4"
   git push
   ```
4. 创建并推送 tag：
   ```bash
   git tag v1.0.4
   git push origin v1.0.4
   ```
5. GitHub Actions 会自动检测到 tag 并发布

### 方式 2: 手动触发发布

1. 进入 GitHub 仓库的 **Actions** 标签页
2. 选择 **Publish VS Code Extension** workflow
3. 点击 **Run workflow**
4. 选择版本类型（patch/minor/major）
5. 点击 **Run workflow**

## 版本号规则

- **patch**: 1.0.3 → 1.0.4（修复 bug）
- **minor**: 1.0.3 → 1.1.0（新功能）
- **major**: 1.0.3 → 2.0.0（重大变更）

## 注意事项

1. **版本号必须匹配**：使用 tag 发布时，tag 版本必须与 `package.json` 中的版本一致
2. **CHANGELOG.md**：建议在发布前更新变更日志
3. **测试**：发布前确保代码已通过 CI 测试
4. **PAT 过期**：如果 PAT 过期，需要重新创建并更新 GitHub Secret

## 故障排除

### 发布失败：PAT 过期

- 重新创建 PAT 并更新 GitHub Secret

### 发布失败：版本号不匹配

- 确保 tag 版本与 `package.json` 中的版本一致

### 发布失败：权限不足

- 检查 PAT 的权限是否包含 Marketplace → Manage
