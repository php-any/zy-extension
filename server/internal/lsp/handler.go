package lsp

import (
	"encoding/json"
	"fmt"
	"log"

	"origami-language-server/internal/server"
)

// Handler 处理LSP消息
type Handler struct {
	langServer *server.LanguageServer // 语言服务器实例
	verbose    bool                   // 是否启用详细日志
}

// NewHandler 创建新的消息处理器
func NewHandler(langServer *server.LanguageServer, verbose bool) *Handler {
	h := &Handler{
		langServer: langServer,
		verbose:    verbose,
	}
	
	if verbose {
		log.Println("LSP消息处理器已创建")
	}
	
	return h
}

// HandleMessage 处理传入的LSP消息
func (h *Handler) HandleMessage(method string, params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Printf("处理LSP方法: %s", method)
	}
	
	switch method {
	// 生命周期方法
	case "initialize":
		return h.handleInitialize(params)
	case "initialized":
		return nil, h.handleInitialized(params)
	case "shutdown":
		return h.handleShutdown(params)
	case "exit":
		return nil, h.handleExit(params)
	
	// 文档同步方法
	case "textDocument/didOpen":
		return nil, h.handleDidOpen(params)
	case "textDocument/didChange":
		return nil, h.handleDidChange(params)
	case "textDocument/didSave":
		return nil, h.handleDidSave(params)
	case "textDocument/didClose":
		return nil, h.handleDidClose(params)
	
	// 语言功能方法
	case "textDocument/completion":
		return h.handleCompletion(params)
	case "textDocument/definition":
		return h.handleDefinition(params)
	case "textDocument/references":
		return h.handleReferences(params)
	case "textDocument/hover":
		return h.handleHover(params)
	
	default:
		if h.verbose {
			log.Printf("未知的LSP方法: %s", method)
		}
		return nil, fmt.Errorf("未支持的方法: %s", method)
	}
}



// handleShutdown 处理关闭请求
func (h *Handler) handleShutdown(params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Println("收到关闭请求")
	}
	return nil, nil
}

// handleExit 处理退出通知
func (h *Handler) handleExit(params json.RawMessage) error {
	if h.verbose {
		log.Println("收到退出通知")
	}
	return nil
}