package lsp

import (
	"encoding/json"
	"log"
)

// DefinitionParams 跳转到定义参数
type DefinitionParams struct {
	TextDocumentPositionParams
	WorkDoneProgressParams
	PartialResultParams
}

// WorkDoneProgressParams 工作进度参数
type WorkDoneProgressParams struct {
	WorkDoneToken *ProgressToken `json:"workDoneToken,omitempty"`
}

// PartialResultParams 部分结果参数
type PartialResultParams struct {
	PartialResultToken *ProgressToken `json:"partialResultToken,omitempty"`
}

// ProgressToken 进度令牌
type ProgressToken interface{}

// Location 位置信息
type Location struct {
	URI   string `json:"uri"`
	Range Range  `json:"range"`
}

// LocationLink 位置链接
type LocationLink struct {
	OriginSelectionRange *Range `json:"originSelectionRange,omitempty"` // 原始选择范围
	TargetURI            string `json:"targetUri"`                      // 目标URI
	TargetRange          Range  `json:"targetRange"`                    // 目标范围
	TargetSelectionRange Range  `json:"targetSelectionRange"`           // 目标选择范围
}

// handleDefinition 处理跳转到定义请求
func (h *Handler) handleDefinition(params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Println("收到跳转到定义请求")
	}
	
	var definitionParams DefinitionParams
	if err := json.Unmarshal(params, &definitionParams); err != nil {
		log.Printf("解析跳转到定义参数失败: %v", err)
		return nil, err
	}
	
	docURI := definitionParams.TextDocument.URI
	position := definitionParams.Position
	
	if h.verbose {
		log.Printf("请求定义: 文档=%s, 位置=(%d,%d)", docURI, position.Line+1, position.Character+1)
	}
	
	// 调用语言服务器获取定义位置
	definition := h.langServer.GetDefinition(docURI, position.Line, position.Character)
	
	if definition == nil {
		if h.verbose {
			log.Printf("未找到符号定义")
		}
		return nil, nil
	}
	
	if h.verbose {
		log.Printf("找到定义位置")
	}
	
	return definition, nil
}

// handleReferences 处理查找引用请求
func (h *Handler) handleReferences(params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Println("收到查找引用请求")
	}
	
	var referencesParams ReferenceParams
	if err := json.Unmarshal(params, &referencesParams); err != nil {
		log.Printf("解析查找引用参数失败: %v", err)
		return nil, err
	}
	
	docURI := referencesParams.TextDocument.URI
	position := referencesParams.Position
	
	if h.verbose {
		log.Printf("请求引用: 文档=%s, 位置=(%d,%d), 包含声明=%v", 
			docURI, position.Line+1, position.Character+1, referencesParams.Context.IncludeDeclaration)
	}
	
	// TODO: 实现查找引用功能
	// 暂时返回空结果
	if h.verbose {
		log.Println("查找引用功能暂未实现")
	}
	
	return []Location{}, nil
}

// ReferenceParams 查找引用参数
type ReferenceParams struct {
	TextDocumentPositionParams
	WorkDoneProgressParams
	PartialResultParams
	Context ReferenceContext `json:"context"`
}

// ReferenceContext 引用上下文
type ReferenceContext struct {
	IncludeDeclaration bool `json:"includeDeclaration"` // 是否包含声明
}

// handleHover 处理悬停请求
func (h *Handler) handleHover(params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Println("收到悬停请求")
	}
	
	var hoverParams HoverParams
	if err := json.Unmarshal(params, &hoverParams); err != nil {
		log.Printf("解析悬停参数失败: %v", err)
		return nil, err
	}
	
	docURI := hoverParams.TextDocument.URI
	position := hoverParams.Position
	
	if h.verbose {
		log.Printf("请求悬停信息: 文档=%s, 位置=(%d,%d)", docURI, position.Line+1, position.Character+1)
	}
	
	// TODO: 实现悬停信息功能
	// 暂时返回空结果
	if h.verbose {
		log.Println("悬停信息功能暂未实现")
	}
	
	return nil, nil
}

// HoverParams 悬停参数
type HoverParams struct {
	TextDocumentPositionParams
	WorkDoneProgressParams
}

// Hover 悬停信息
type Hover struct {
	Contents interface{} `json:"contents"`       // 悬停内容
	Range    *Range      `json:"range,omitempty"` // 悬停范围
}

// MarkupContent 标记内容
type MarkupContent struct {
	Kind  MarkupKind `json:"kind"`  // 内容类型
	Value string     `json:"value"` // 内容值
}

// MarkupKind 标记类型
type MarkupKind string

const (
	MarkupKindPlainText MarkupKind = "plaintext"
	MarkupKindMarkdown  MarkupKind = "markdown"
)