package lsp

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"

	"origami-language-server/internal/server"
)

// Server 代表LSP服务器
type Server struct {
	langServer *server.LanguageServer // 语言服务器实例
	verbose    bool                   // 是否启用详细日志
}

// NewServer 创建新的LSP服务器
func NewServer(langServer *server.LanguageServer, verbose bool) *Server {
	s := &Server{
		langServer: langServer,
		verbose:    verbose,
	}
	
	if verbose {
		log.Println("LSP服务器实例已创建")
	}
	
	return s
}

// Run 启动LSP服务器（标准输入输出模式）
func (s *Server) Run(ctx context.Context, reader io.Reader, writer io.Writer) error {
	if s.verbose {
		log.Println("LSP服务器正在启动（标准输入输出模式）...")
	}
	
	// 创建处理器
	handler := NewHandler(s.langServer, s.verbose)
	
	// 启动消息循环
	return s.messageLoop(ctx, reader, writer, handler)
}

// RunTCP 启动LSP服务器（TCP模式）
func (s *Server) RunTCP(ctx context.Context, port int) error {
	if s.verbose {
		log.Printf("LSP服务器正在启动（TCP模式，端口: %d）...", port)
	}
	
	// 监听TCP端口
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
			if s.verbose {
				log.Println("收到停止信号，关闭TCP服务器")
			}
			return ctx.Err()
		default:
			// 接受连接
			conn, err := listener.Accept()
			if err != nil {
				log.Printf("接受连接失败: %v", err)
				continue
			}
			
			if s.verbose {
				log.Printf("新客户端连接: %s", conn.RemoteAddr())
			}
			
			// 为每个连接启动goroutine
			go func(conn net.Conn) {
				defer conn.Close()
				
				// 创建处理器
				handler := NewHandler(s.langServer, s.verbose)
				
				// 启动消息循环
				if err := s.messageLoop(ctx, conn, conn, handler); err != nil {
					log.Printf("客户端 %s 连接处理错误: %v", conn.RemoteAddr(), err)
				}
				
				if s.verbose {
					log.Printf("客户端 %s 连接已关闭", conn.RemoteAddr())
				}
			}(conn)
		}
	}
}

// messageLoop handles the main message processing loop
func (s *Server) messageLoop(ctx context.Context, reader io.Reader, writer io.Writer, handler *Handler) error {
	decoder := json.NewDecoder(reader)
	encoder := json.NewEncoder(writer)
	
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			// 读取消息
			var msg map[string]interface{}
			if err := decoder.Decode(&msg); err != nil {
				if err == io.EOF {
					return nil
				}
				log.Printf("解码消息错误: %v", err)
				continue
			}
			
			// 提取方法名
			method, ok := msg["method"].(string)
			if !ok {
				log.Printf("无效消息: 缺少方法名")
				continue
			}
			
			// 提取参数
			var params json.RawMessage
			if p, exists := msg["params"]; exists {
				params, _ = json.Marshal(p)
			}
			
			// 处理消息
			result, err := handler.HandleMessage(method, params)
			if err != nil {
				log.Printf("处理消息错误: %v", err)
				// 发送错误响应
				if id, hasId := msg["id"]; hasId {
					errorResponse := map[string]interface{}{
						"jsonrpc": "2.0",
						"id":      id,
						"error": map[string]interface{}{
							"code":    -32603,
							"message": err.Error(),
						},
					}
					encoder.Encode(errorResponse)
				}
				continue
			}
			
			// 发送响应（仅对请求消息，不对通知消息）
			if id, hasId := msg["id"]; hasId {
				response := map[string]interface{}{
					"jsonrpc": "2.0",
					"id":      id,
					"result":  result,
				}
				if err := encoder.Encode(response); err != nil {
					log.Printf("编码响应错误: %v", err)
				}
			}
		}
	}
}