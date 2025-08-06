package lsp

import (
	"encoding/json"
	"log"
)

// CompletionParams 代码补全参数
type CompletionParams struct {
	TextDocumentPositionParams
	Context *CompletionContext `json:"context,omitempty"`
}

// TextDocumentPositionParams 文本文档位置参数
type TextDocumentPositionParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
	Position     Position                `json:"position"`
}

// CompletionContext 代码补全上下文
type CompletionContext struct {
	TriggerKind      CompletionTriggerKind `json:"triggerKind"`
	TriggerCharacter *string               `json:"triggerCharacter,omitempty"`
}

// CompletionTriggerKind 代码补全触发类型
type CompletionTriggerKind int

const (
	// CompletionTriggerKindInvoked 手动调用补全
	CompletionTriggerKindInvoked CompletionTriggerKind = 1
	// CompletionTriggerKindTriggerCharacter 触发字符
	CompletionTriggerKindTriggerCharacter CompletionTriggerKind = 2
	// CompletionTriggerKindTriggerForIncompleteCompletions 不完整补全的重新触发
	CompletionTriggerKindTriggerForIncompleteCompletions CompletionTriggerKind = 3
)

// CompletionList 代码补全列表
type CompletionList struct {
	IsIncomplete bool             `json:"isIncomplete"`
	Items        []CompletionItem `json:"items"`
}

// CompletionItem 代码补全项
type CompletionItem struct {
	Label               string                 `json:"label"`                         // 显示标签
	Kind                *CompletionItemKind    `json:"kind,omitempty"`                // 补全项类型
	Tags                []CompletionItemTag    `json:"tags,omitempty"`                // 标签
	Detail              *string                `json:"detail,omitempty"`              // 详细信息
	Documentation       interface{}            `json:"documentation,omitempty"`       // 文档
	Deprecated          *bool                  `json:"deprecated,omitempty"`          // 是否已废弃
	Preselect           *bool                  `json:"preselect,omitempty"`           // 是否预选
	SortText            *string                `json:"sortText,omitempty"`            // 排序文本
	FilterText          *string                `json:"filterText,omitempty"`          // 过滤文本
	InsertText          *string                `json:"insertText,omitempty"`          // 插入文本
	InsertTextFormat    *InsertTextFormat      `json:"insertTextFormat,omitempty"`    // 插入文本格式
	InsertTextMode      *InsertTextMode        `json:"insertTextMode,omitempty"`      // 插入文本模式
	TextEdit            *TextEdit              `json:"textEdit,omitempty"`            // 文本编辑
	AdditionalTextEdits []TextEdit             `json:"additionalTextEdits,omitempty"` // 额外文本编辑
	CommitCharacters    []string               `json:"commitCharacters,omitempty"`    // 提交字符
	Command             *Command               `json:"command,omitempty"`             // 命令
	Data                interface{}            `json:"data,omitempty"`                // 自定义数据
}

// CompletionItemKind 代码补全项类型
type CompletionItemKind int

const (
	CompletionItemKindText          CompletionItemKind = 1
	CompletionItemKindMethod        CompletionItemKind = 2
	CompletionItemKindFunction      CompletionItemKind = 3
	CompletionItemKindConstructor   CompletionItemKind = 4
	CompletionItemKindField         CompletionItemKind = 5
	CompletionItemKindVariable      CompletionItemKind = 6
	CompletionItemKindClass         CompletionItemKind = 7
	CompletionItemKindInterface     CompletionItemKind = 8
	CompletionItemKindModule        CompletionItemKind = 9
	CompletionItemKindProperty      CompletionItemKind = 10
	CompletionItemKindUnit          CompletionItemKind = 11
	CompletionItemKindValue         CompletionItemKind = 12
	CompletionItemKindEnum          CompletionItemKind = 13
	CompletionItemKindKeyword       CompletionItemKind = 14
	CompletionItemKindSnippet       CompletionItemKind = 15
	CompletionItemKindColor         CompletionItemKind = 16
	CompletionItemKindFile          CompletionItemKind = 17
	CompletionItemKindReference     CompletionItemKind = 18
	CompletionItemKindFolder        CompletionItemKind = 19
	CompletionItemKindEnumMember    CompletionItemKind = 20
	CompletionItemKindConstant      CompletionItemKind = 21
	CompletionItemKindStruct        CompletionItemKind = 22
	CompletionItemKindEvent         CompletionItemKind = 23
	CompletionItemKindOperator      CompletionItemKind = 24
	CompletionItemKindTypeParameter CompletionItemKind = 25
)

// CompletionItemTag 代码补全项标签
type CompletionItemTag int

const (
	CompletionItemTagDeprecated CompletionItemTag = 1
)

// InsertTextFormat 插入文本格式
type InsertTextFormat int

const (
	InsertTextFormatPlainText InsertTextFormat = 1
	InsertTextFormatSnippet   InsertTextFormat = 2
)

// InsertTextMode 插入文本模式
type InsertTextMode int

const (
	InsertTextModeAsIs               InsertTextMode = 1
	InsertTextModeAdjustIndentation  InsertTextMode = 2
)

// TextEdit 文本编辑
type TextEdit struct {
	Range   Range  `json:"range"`
	NewText string `json:"newText"`
}

// Command 命令
type Command struct {
	Title     string        `json:"title"`
	Command   string        `json:"command"`
	Arguments []interface{} `json:"arguments,omitempty"`
}

// handleCompletion 处理代码补全请求
func (h *Handler) handleCompletion(params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Println("收到代码补全请求")
	}
	
	var completionParams CompletionParams
	if err := json.Unmarshal(params, &completionParams); err != nil {
		log.Printf("解析代码补全参数失败: %v", err)
		return nil, err
	}
	
	docURI := completionParams.TextDocument.URI
	position := completionParams.Position
	
	if h.verbose {
		log.Printf("请求补全: 文档=%s, 位置=(%d,%d)", docURI, position.Line+1, position.Character+1)
		if completionParams.Context != nil {
			log.Printf("补全上下文: 触发类型=%d", completionParams.Context.TriggerKind)
			if completionParams.Context.TriggerCharacter != nil {
				log.Printf("触发字符: '%s'", *completionParams.Context.TriggerCharacter)
			}
		}
	}
	
	// 调用语言服务器获取补全项
	completions := h.langServer.GetCompletions(docURI, position.Line, position.Character)
	
	if h.verbose {
		if completionList, ok := completions.(map[string]interface{}); ok {
			if items, exists := completionList["items"]; exists {
				if itemSlice, ok := items.([]interface{}); ok {
					log.Printf("返回 %d 个补全项", len(itemSlice))
				}
			}
		}
	}
	
	return completions, nil
}

// convertToLSPCompletionItem 将内部补全项转换为LSP补全项
func convertToLSPCompletionItem(item interface{}) CompletionItem {
	// 这里需要根据实际的内部补全项结构进行转换
	// 暂时返回一个基本的补全项
	return CompletionItem{
		Label: "示例补全项",
		Kind:  &[]CompletionItemKind{CompletionItemKindText}[0],
	}
}