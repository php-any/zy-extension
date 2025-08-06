package lsp

import (
	"encoding/json"
	"log"
)

// TextDocumentItem 文本文档项
type TextDocumentItem struct {
	URI        string `json:"uri"`
	LanguageID string `json:"languageId"`
	Version    int    `json:"version"`
	Text       string `json:"text"`
}

// VersionedTextDocumentIdentifier 版本化文本文档标识符
type VersionedTextDocumentIdentifier struct {
	TextDocumentIdentifier
	Version int `json:"version"`
}

// TextDocumentIdentifier 文本文档标识符
type TextDocumentIdentifier struct {
	URI string `json:"uri"`
}

// DidOpenTextDocumentParams 打开文档参数
type DidOpenTextDocumentParams struct {
	TextDocument TextDocumentItem `json:"textDocument"`
}

// DidChangeTextDocumentParams 文档变更参数
type DidChangeTextDocumentParams struct {
	TextDocument   VersionedTextDocumentIdentifier  `json:"textDocument"`
	ContentChanges []TextDocumentContentChangeEvent `json:"contentChanges"`
}

// TextDocumentContentChangeEvent 文档内容变更事件
type TextDocumentContentChangeEvent struct {
	Range       *Range `json:"range,omitempty"`       // 变更范围（增量变更时使用）
	RangeLength *int   `json:"rangeLength,omitempty"` // 变更范围长度
	Text        string `json:"text"`                  // 新文本内容
}

// Range 范围
type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

// Position 位置
type Position struct {
	Line      int `json:"line"`      // 行号（从0开始）
	Character int `json:"character"` // 列号（从0开始）
}

// DidSaveTextDocumentParams 保存文档参数
type DidSaveTextDocumentParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
	Text         *string                 `json:"text,omitempty"` // 保存时的文档内容
}

// DidCloseTextDocumentParams 关闭文档参数
type DidCloseTextDocumentParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
}

// handleDidOpen 处理文档打开通知
func (h *Handler) handleDidOpen(params json.RawMessage) error {
	if h.verbose {
		log.Println("收到文档打开通知")
	}
	
	var openParams DidOpenTextDocumentParams
	if err := json.Unmarshal(params, &openParams); err != nil {
		log.Printf("解析文档打开参数失败: %v", err)
		return err
	}
	
	doc := openParams.TextDocument
	
	if h.verbose {
		log.Printf("打开文档: %s (语言: %s, 版本: %d, 长度: %d)", 
			doc.URI, doc.LanguageID, doc.Version, len(doc.Text))
	}
	
	// 调用语言服务器打开文档
	h.langServer.OpenDocument(doc.URI, doc.Text)
	
	if h.verbose {
		log.Printf("文档 %s 已成功打开", doc.URI)
	}
	
	return nil
}

// handleDidChange 处理文档变更通知
func (h *Handler) handleDidChange(params json.RawMessage) error {
	if h.verbose {
		log.Println("收到文档变更通知")
	}
	
	var changeParams DidChangeTextDocumentParams
	if err := json.Unmarshal(params, &changeParams); err != nil {
		log.Printf("解析文档变更参数失败: %v", err)
		return err
	}
	
	docURI := changeParams.TextDocument.URI
	version := changeParams.TextDocument.Version
	
	if h.verbose {
		log.Printf("文档变更: %s (版本: %d, 变更数量: %d)", 
			docURI, version, len(changeParams.ContentChanges))
	}
	
	// 处理文档变更
	// 注意：这里假设使用全文同步模式，即每次变更都包含完整的文档内容
	for i, change := range changeParams.ContentChanges {
		if change.Range == nil {
			// 全文变更
			if h.verbose {
				log.Printf("应用全文变更 %d: 新内容长度 %d", i+1, len(change.Text))
			}
			h.langServer.UpdateDocument(docURI, change.Text)
		} else {
			// 增量变更（暂时不支持，记录日志）
			if h.verbose {
				log.Printf("收到增量变更 %d (暂不支持): 范围 %v, 文本长度 %d", 
					i+1, change.Range, len(change.Text))
			}
			// TODO: 实现增量变更支持
		}
	}
	
	if h.verbose {
		log.Printf("文档 %s 变更处理完成", docURI)
	}
	
	return nil
}

// handleDidSave 处理文档保存通知
func (h *Handler) handleDidSave(params json.RawMessage) error {
	if h.verbose {
		log.Println("收到文档保存通知")
	}
	
	var saveParams DidSaveTextDocumentParams
	if err := json.Unmarshal(params, &saveParams); err != nil {
		log.Printf("解析文档保存参数失败: %v", err)
		return err
	}
	
	docURI := saveParams.TextDocument.URI
	
	if h.verbose {
		log.Printf("文档已保存: %s", docURI)
		if saveParams.Text != nil {
			log.Printf("保存时文档内容长度: %d", len(*saveParams.Text))
		}
	}
	
	// 如果保存时包含文档内容，更新文档
	if saveParams.Text != nil {
		h.langServer.UpdateDocument(docURI, *saveParams.Text)
		if h.verbose {
			log.Printf("已更新保存的文档内容: %s", docURI)
		}
	}
	
	return nil
}

// handleDidClose 处理文档关闭通知
func (h *Handler) handleDidClose(params json.RawMessage) error {
	if h.verbose {
		log.Println("收到文档关闭通知")
	}
	
	var closeParams DidCloseTextDocumentParams
	if err := json.Unmarshal(params, &closeParams); err != nil {
		log.Printf("解析文档关闭参数失败: %v", err)
		return err
	}
	
	docURI := closeParams.TextDocument.URI
	
	if h.verbose {
		log.Printf("文档已关闭: %s", docURI)
	}
	
	// TODO: 实现文档关闭处理（如清理缓存等）
	
	return nil
}