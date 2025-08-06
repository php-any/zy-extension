package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"origami-language-server/internal/lsp"
	"origami-language-server/internal/server"
)

var (
	// 版本信息
	version = "0.0.1"
	buildTime = "unknown"
	commitHash = "unknown"
)

func main() {
	// 定义命令行参数
	var (
		showHelp = flag.Bool("help", false, "显示帮助信息")
		showVersion = flag.Bool("version", false, "显示版本信息")
		logFile = flag.String("log", "", "日志文件路径 (默认输出到stderr)")
		verbose = flag.Bool("verbose", false, "启用详细日志输出")
		port = flag.Int("port", 0, "TCP端口号 (默认使用stdio)")
		stdio = flag.Bool("stdio", true, "使用标准输入输出进行通信")
	)

	// 自定义帮助信息
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "折言(Origami)语言服务器 v%s\n\n", version)
		fmt.Fprintf(os.Stderr, "用法: %s [选项]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "选项:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\n示例:\n")
		fmt.Fprintf(os.Stderr, "  %s --stdio                    # 使用标准输入输出模式\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s --port 8080               # 使用TCP端口8080\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s --log server.log --verbose # 启用详细日志并输出到文件\n", os.Args[0])
	}

	flag.Parse()

	// 处理帮助信息
	if *showHelp {
		flag.Usage()
		return
	}

	// 处理版本信息
	if *showVersion {
		fmt.Printf("折言(Origami)语言服务器\n")
		fmt.Printf("版本: %s\n", version)
		fmt.Printf("构建时间: %s\n", buildTime)
		fmt.Printf("提交哈希: %s\n", commitHash)
		return
	}

	// 设置日志输出
	if *logFile != "" {
		// 确保日志目录存在
		logDir := filepath.Dir(*logFile)
		if err := os.MkdirAll(logDir, 0755); err != nil {
			log.Fatalf("创建日志目录失败: %v", err)
		}

		// 打开日志文件
		file, err := os.OpenFile(*logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			log.Fatalf("打开日志文件失败: %v", err)
		}
		defer file.Close()
		log.SetOutput(file)
	}

	// 设置日志格式
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	if *verbose {
		log.Println("启动折言语言服务器...")
		log.Printf("版本: %s, 构建时间: %s", version, buildTime)
		log.Printf("命令行参数: stdio=%v, port=%d, verbose=%v, logFile=%s", *stdio, *port, *verbose, *logFile)
	}

	// 创建语言服务器实例
	langServer := server.NewLanguageServer(*verbose)

	// 创建LSP服务器
	lspServer := lsp.NewServer(langServer, *verbose)

	// 运行服务器
	ctx := context.Background()
	var err error

	if *port > 0 {
		// TCP模式
		log.Printf("在TCP端口 %d 上启动服务器", *port)
		err = lspServer.RunTCP(ctx, *port)
	} else {
		// 标准输入输出模式
		if *verbose {
			log.Println("在标准输入输出模式下启动服务器")
		}
		err = lspServer.Run(ctx, os.Stdin, os.Stdout)
	}

	if err != nil {
		log.Fatalf("服务器错误: %v", err)
	}
}