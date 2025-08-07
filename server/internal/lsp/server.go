package lsp

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"os"

	"go.lsp.dev/jsonrpc2"

	"origami-language-server/internal/server"
)

// LSPServer 使用成熟库实现的LSP服务器
type LSPServer struct {
	langServer *server.LanguageServer
	verbose    bool
}

// NewLSPServer 创建新的LSP服务器
func NewLSPServer(langServer *server.LanguageServer, verbose bool) *LSPServer {
	return &LSPServer{
		langServer: langServer,
		verbose:    verbose,
	}
}

// Handler 实现jsonrpc2.Handler接口
func (s *LSPServer) Handler(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	if s.verbose {
		log.Printf("收到LSP请求: %s", req.Method())
	}

	switch req.Method() {
	case "initialize":
		return s.handleInitialize(ctx, reply, req)
	case "initialized":
		return s.handleInitialized(ctx, reply, req)
	case "textDocument/didOpen":
		return s.handleTextDocumentDidOpen(ctx, reply, req)
	case "textDocument/didChange":
		return s.handleTextDocumentDidChange(ctx, reply, req)
	case "textDocument/didClose":
		return s.handleTextDocumentDidClose(ctx, reply, req)
	case "textDocument/completion":
		return s.handleTextDocumentCompletion(ctx, reply, req)
	case "textDocument/definition":
		return s.handleTextDocumentDefinition(ctx, reply, req)
	case "textDocument/hover":
		return s.handleTextDocumentHover(ctx, reply, req)
	case "shutdown":
		return s.handleShutdown(ctx, reply, req)
	case "exit":
		return s.handleExit(ctx, reply, req)
	default:
		if s.verbose {
			log.Printf("未处理的方法: %s", req.Method())
		}
		return reply(ctx, nil, nil)
	}
}

// handleInitialize 处理初始化请求
func (s *LSPServer) handleInitialize(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析初始化参数失败: %v", err))
	}

	if s.verbose {
		log.Printf("客户端初始化")
	}

	result := map[string]interface{}{
		"capabilities": map[string]interface{}{
			"textDocumentSync": map[string]interface{}{
				"openClose": true,
				"change":    1, // Full document sync
			},
			"completionProvider": map[string]interface{}{
				"triggerCharacters": []string{".", "(", " "},
			},
			"definitionProvider": true,
			"hoverProvider":      true,
		},
		"serverInfo": map[string]interface{}{
			"name":    "Origami Language Server",
			"version": "0.0.1",
		},
	}

	return reply(ctx, result, nil)
}

// handleInitialized 处理初始化完成通知
func (s *LSPServer) handleInitialized(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	if s.verbose {
		log.Println("客户端初始化完成")
	}
	return reply(ctx, nil, nil)
}

// handleTextDocumentDidOpen 处理文档打开通知
func (s *LSPServer) handleTextDocumentDidOpen(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析文档打开参数失败: %v", err))
	}

	textDocument := params["textDocument"].(map[string]interface{})
	uri := textDocument["uri"].(string)
	text := textDocument["text"].(string)

	s.langServer.OpenDocument(uri, text)
	return reply(ctx, nil, nil)
}

// handleTextDocumentDidChange 处理文档变更通知
func (s *LSPServer) handleTextDocumentDidChange(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析文档变更参数失败: %v", err))
	}

	textDocument := params["textDocument"].(map[string]interface{})
	uri := textDocument["uri"].(string)
	
	contentChanges := params["contentChanges"].([]interface{})
	if len(contentChanges) > 0 {
		change := contentChanges[0].(map[string]interface{})
		text := change["text"].(string)
		s.langServer.UpdateDocument(uri, text)
	}
	
	return reply(ctx, nil, nil)
}

// handleTextDocumentDidClose 处理文档关闭通知
func (s *LSPServer) handleTextDocumentDidClose(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析文档关闭参数失败: %v", err))
	}

	textDocument := params["textDocument"].(map[string]interface{})
	uri := textDocument["uri"].(string)

	s.langServer.CloseDocument(uri)
	return reply(ctx, nil, nil)
}

// handleTextDocumentCompletion 处理代码补全请求
func (s *LSPServer) handleTextDocumentCompletion(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析补全参数失败: %v", err))
	}

	textDocument := params["textDocument"].(map[string]interface{})
	uri := textDocument["uri"].(string)
	
	position := params["position"].(map[string]interface{})
	line := int(position["line"].(float64))
	character := int(position["character"].(float64))

	completions := s.langServer.GetCompletions(uri, line, character)
	return reply(ctx, completions, nil)
}

// handleTextDocumentDefinition 处理跳转到定义请求
func (s *LSPServer) handleTextDocumentDefinition(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析定义参数失败: %v", err))
	}

	textDocument := params["textDocument"].(map[string]interface{})
	uri := textDocument["uri"].(string)
	
	position := params["position"].(map[string]interface{})
	line := int(position["line"].(float64))
	character := int(position["character"].(float64))

	definition := s.langServer.GetDefinition(uri, line, character)
	return reply(ctx, definition, nil)
}

// handleTextDocumentHover 处理悬停提示请求
func (s *LSPServer) handleTextDocumentHover(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params map[string]interface{}
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return reply(ctx, nil, fmt.Errorf("解析悬停参数失败: %v", err))
	}

	textDocument := params["textDocument"].(map[string]interface{})
	uri := textDocument["uri"].(string)
	
	position := params["position"].(map[string]interface{})
	line := int(position["line"].(float64))
	character := int(position["character"].(float64))

	hover := s.langServer.GetHover(uri, line, character)
	if hover == nil {
		return reply(ctx, nil, nil)
	}

	result := map[string]interface{}{
		"contents": map[string]interface{}{
			"kind":  "markdown",
			"value": hover.(string),
		},
	}

	return reply(ctx, result, nil)
}

// handleShutdown 处理关闭请求
func (s *LSPServer) handleShutdown(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	if s.verbose {
		log.Println("收到关闭请求")
	}
	return reply(ctx, nil, nil)
}

// handleExit 处理退出通知
func (s *LSPServer) handleExit(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	if s.verbose {
		log.Println("收到退出通知")
	}
	os.Exit(0)
	return nil
}

// RunStdio 在标准输入输出模式下运行服务器
func (s *LSPServer) RunStdio(ctx context.Context) error {
	if s.verbose {
		log.Println("LSP服务器正在启动（标准输入输出模式）...")
	}

	// 创建一个组合的ReadWriteCloser
	rwc := &stdioReadWriteCloser{os.Stdin, os.Stdout}
	stream := jsonrpc2.NewStream(rwc)
	conn := jsonrpc2.NewConn(stream)
	conn.Go(ctx, s.Handler)
	<-conn.Done()
	return conn.Err()
}

// stdioReadWriteCloser 组合stdin和stdout
type stdioReadWriteCloser struct {
	io.Reader
	io.Writer
}

func (rwc *stdioReadWriteCloser) Close() error {
	return nil
}

// RunTCP 在TCP模式下运行服务器
func (s *LSPServer) RunTCP(ctx context.Context, port int) error {
	if s.verbose {
		log.Printf("LSP服务器正在启动（TCP模式，端口: %d）...", port)
	}

	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return fmt.Errorf("监听TCP端口失败: %v", err)
	}
	defer listener.Close()

	if s.verbose {
		log.Printf("TCP服务器正在监听端口 %d", port)
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			conn, err := listener.Accept()
			if err != nil {
				log.Printf("接受连接失败: %v", err)
				continue
			}

			if s.verbose {
				log.Printf("新客户端连接: %s", conn.RemoteAddr())
			}

			go s.handleConnection(ctx, conn)
		}
	}
}

// handleConnection 处理单个连接
func (s *LSPServer) handleConnection(ctx context.Context, conn net.Conn) {
	defer conn.Close()

	stream := jsonrpc2.NewStream(conn)
	rpcConn := jsonrpc2.NewConn(stream)
	rpcConn.Go(ctx, s.Handler)
	<-rpcConn.Done()

	if s.verbose {
		log.Printf("客户端 %s 连接已关闭", conn.RemoteAddr())
	}
}