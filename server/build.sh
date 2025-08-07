#!/bin/bash

# Origami Language Server 跨平台构建脚本

set -e

echo "开始构建 Origami Language Server..."

# 获取版本信息
VERSION="0.0.1"
BUILD_TIME=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 构建标志
LDFLAGS="-X main.version=${VERSION} -X 'main.buildTime=${BUILD_TIME}' -X main.commitHash=${COMMIT_HASH}"

# 清理旧的构建文件
echo "清理旧的构建文件..."
rm -f origami-language-server origami-language-server.exe origami-language-server-linux

# 构建 macOS 版本
echo "构建 macOS 版本..."
GOOS=darwin GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o origami-language-server main.go

# 构建 Windows 版本
echo "构建 Windows 版本..."
GOOS=windows GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o origami-language-server.exe main.go

# 构建 Linux 版本
echo "构建 Linux 版本..."
GOOS=linux GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o origami-language-server-linux main.go

echo "构建完成！"
echo "生成的文件："
ls -la origami-language-server*

echo ""
echo "测试 macOS 版本："
./origami-language-server --version