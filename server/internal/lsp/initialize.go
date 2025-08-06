package lsp

import (
	"encoding/json"
	"log"
)

// InitializeParams 初始化参数
type InitializeParams struct {
	ProcessID             *int                 `json:"processId"`
	ClientInfo            *ClientInfo          `json:"clientInfo,omitempty"`
	Locale                string               `json:"locale,omitempty"`
	RootPath              *string              `json:"rootPath,omitempty"`
	RootURI               *string              `json:"rootUri"`
	InitializationOptions interface{}          `json:"initializationOptions,omitempty"`
	Capabilities          ClientCapabilities   `json:"capabilities"`
	Trace                 string               `json:"trace,omitempty"`
	WorkspaceFolders      []WorkspaceFolder    `json:"workspaceFolders,omitempty"`
}

// ClientInfo 客户端信息
type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

// ClientCapabilities 客户端能力
type ClientCapabilities struct {
	Workspace    *WorkspaceClientCapabilities    `json:"workspace,omitempty"`
	TextDocument *TextDocumentClientCapabilities `json:"textDocument,omitempty"`
	Window       *WindowClientCapabilities       `json:"window,omitempty"`
	General      *GeneralClientCapabilities      `json:"general,omitempty"`
}

// WorkspaceClientCapabilities 工作区客户端能力
type WorkspaceClientCapabilities struct {
	ApplyEdit              bool                        `json:"applyEdit,omitempty"`
	WorkspaceEdit          *WorkspaceEditCapabilities  `json:"workspaceEdit,omitempty"`
	DidChangeConfiguration *DidChangeConfigurationCapabilities `json:"didChangeConfiguration,omitempty"`
	DidChangeWatchedFiles  *DidChangeWatchedFilesCapabilities  `json:"didChangeWatchedFiles,omitempty"`
	Symbol                 *WorkspaceSymbolCapabilities        `json:"symbol,omitempty"`
	ExecuteCommand         *ExecuteCommandCapabilities         `json:"executeCommand,omitempty"`
	Configuration          bool                                 `json:"configuration,omitempty"`
	WorkspaceFolders       bool                                 `json:"workspaceFolders,omitempty"`
}

// TextDocumentClientCapabilities 文本文档客户端能力
type TextDocumentClientCapabilities struct {
	Synchronization    *TextDocumentSyncCapabilities `json:"synchronization,omitempty"`
	Completion         *CompletionCapabilities        `json:"completion,omitempty"`
	Hover              *HoverCapabilities             `json:"hover,omitempty"`
	SignatureHelp      *SignatureHelpCapabilities     `json:"signatureHelp,omitempty"`
	Declaration        *DeclarationCapabilities       `json:"declaration,omitempty"`
	Definition         *DefinitionCapabilities        `json:"definition,omitempty"`
	TypeDefinition     *TypeDefinitionCapabilities    `json:"typeDefinition,omitempty"`
	Implementation     *ImplementationCapabilities    `json:"implementation,omitempty"`
	References         *ReferencesCapabilities        `json:"references,omitempty"`
	DocumentHighlight  *DocumentHighlightCapabilities `json:"documentHighlight,omitempty"`
	DocumentSymbol     *DocumentSymbolCapabilities    `json:"documentSymbol,omitempty"`
	CodeAction         *CodeActionCapabilities        `json:"codeAction,omitempty"`
	CodeLens           *CodeLensCapabilities          `json:"codeLens,omitempty"`
	DocumentLink       *DocumentLinkCapabilities      `json:"documentLink,omitempty"`
	ColorProvider      *DocumentColorCapabilities     `json:"colorProvider,omitempty"`
	Formatting         *DocumentFormattingCapabilities `json:"formatting,omitempty"`
	RangeFormatting    *DocumentRangeFormattingCapabilities `json:"rangeFormatting,omitempty"`
	OnTypeFormatting   *DocumentOnTypeFormattingCapabilities `json:"onTypeFormatting,omitempty"`
	Rename             *RenameCapabilities            `json:"rename,omitempty"`
	PublishDiagnostics *PublishDiagnosticsCapabilities `json:"publishDiagnostics,omitempty"`
	FoldingRange       *FoldingRangeCapabilities      `json:"foldingRange,omitempty"`
	SelectionRange     *SelectionRangeCapabilities    `json:"selectionRange,omitempty"`
	LinkedEditingRange *LinkedEditingRangeCapabilities `json:"linkedEditingRange,omitempty"`
	CallHierarchy      *CallHierarchyCapabilities     `json:"callHierarchy,omitempty"`
	SemanticTokens     *SemanticTokensCapabilities    `json:"semanticTokens,omitempty"`
	Moniker            *MonikerCapabilities           `json:"moniker,omitempty"`
}

// WindowClientCapabilities 窗口客户端能力
type WindowClientCapabilities struct {
	WorkDoneProgress bool `json:"workDoneProgress,omitempty"`
	ShowMessage      *ShowMessageRequestCapabilities `json:"showMessage,omitempty"`
	ShowDocument     *ShowDocumentCapabilities       `json:"showDocument,omitempty"`
}

// GeneralClientCapabilities 通用客户端能力
type GeneralClientCapabilities struct {
	RegularExpressions *RegularExpressionsCapabilities `json:"regularExpressions,omitempty"`
	Markdown           *MarkdownCapabilities           `json:"markdown,omitempty"`
}

// WorkspaceFolder 工作区文件夹
type WorkspaceFolder struct {
	URI  string `json:"uri"`
	Name string `json:"name"`
}

// InitializeResult 初始化结果
type InitializeResult struct {
	Capabilities ServerCapabilities `json:"capabilities"`
	ServerInfo   *ServerInfo        `json:"serverInfo,omitempty"`
}

// ServerCapabilities 服务器能力
type ServerCapabilities struct {
	TextDocumentSync                 interface{}                       `json:"textDocumentSync,omitempty"`
	CompletionProvider               *CompletionOptions                `json:"completionProvider,omitempty"`
	HoverProvider                    interface{}                       `json:"hoverProvider,omitempty"`
	SignatureHelpProvider            *SignatureHelpOptions             `json:"signatureHelpProvider,omitempty"`
	DeclarationProvider              interface{}                       `json:"declarationProvider,omitempty"`
	DefinitionProvider               interface{}                       `json:"definitionProvider,omitempty"`
	TypeDefinitionProvider           interface{}                       `json:"typeDefinitionProvider,omitempty"`
	ImplementationProvider           interface{}                       `json:"implementationProvider,omitempty"`
	ReferencesProvider               interface{}                       `json:"referencesProvider,omitempty"`
	DocumentHighlightProvider        interface{}                       `json:"documentHighlightProvider,omitempty"`
	DocumentSymbolProvider           interface{}                       `json:"documentSymbolProvider,omitempty"`
	CodeActionProvider               interface{}                       `json:"codeActionProvider,omitempty"`
	CodeLensProvider                 *CodeLensOptions                  `json:"codeLensProvider,omitempty"`
	DocumentLinkProvider             *DocumentLinkOptions              `json:"documentLinkProvider,omitempty"`
	ColorProvider                    interface{}                       `json:"colorProvider,omitempty"`
	DocumentFormattingProvider       interface{}                       `json:"documentFormattingProvider,omitempty"`
	DocumentRangeFormattingProvider  interface{}                       `json:"documentRangeFormattingProvider,omitempty"`
	DocumentOnTypeFormattingProvider *DocumentOnTypeFormattingOptions  `json:"documentOnTypeFormattingProvider,omitempty"`
	RenameProvider                   interface{}                       `json:"renameProvider,omitempty"`
	FoldingRangeProvider             interface{}                       `json:"foldingRangeProvider,omitempty"`
	ExecuteCommandProvider           *ExecuteCommandOptions            `json:"executeCommandProvider,omitempty"`
	SelectionRangeProvider           interface{}                       `json:"selectionRangeProvider,omitempty"`
	LinkedEditingRangeProvider       interface{}                       `json:"linkedEditingRangeProvider,omitempty"`
	CallHierarchyProvider            interface{}                       `json:"callHierarchyProvider,omitempty"`
	SemanticTokensProvider           *SemanticTokensOptions            `json:"semanticTokensProvider,omitempty"`
	MonikerProvider                  interface{}                       `json:"monikerProvider,omitempty"`
	WorkspaceSymbolProvider          interface{}                       `json:"workspaceSymbolProvider,omitempty"`
	Workspace                        *WorkspaceOptions                 `json:"workspace,omitempty"`
	Experimental                     interface{}                       `json:"experimental,omitempty"`
}

// ServerInfo 服务器信息
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

// CompletionOptions 代码补全选项
type CompletionOptions struct {
	TriggerCharacters   []string `json:"triggerCharacters,omitempty"`
	AllCommitCharacters []string `json:"allCommitCharacters,omitempty"`
	ResolveProvider     bool     `json:"resolveProvider,omitempty"`
}

// handleInitialize 处理初始化请求
func (h *Handler) handleInitialize(params json.RawMessage) (interface{}, error) {
	if h.verbose {
		log.Println("收到初始化请求")
	}
	
	var initParams InitializeParams
	if err := json.Unmarshal(params, &initParams); err != nil {
		log.Printf("解析初始化参数失败: %v", err)
		return nil, err
	}
	
	if h.verbose {
		if initParams.ClientInfo != nil {
			log.Printf("客户端信息: %s %s", initParams.ClientInfo.Name, initParams.ClientInfo.Version)
		}
		if initParams.RootURI != nil {
			log.Printf("工作区根目录: %s", *initParams.RootURI)
		}
	}
	
	// 构建服务器能力
	capabilities := ServerCapabilities{
		// 文本文档同步
		TextDocumentSync: map[string]interface{}{
			"openClose": true,
			"change":    1, // 增量同步
			"save":      map[string]interface{}{"includeText": true},
		},
		// 代码补全
		CompletionProvider: &CompletionOptions{
			TriggerCharacters: []string{".", "$", "::", "->"},
			ResolveProvider:   false,
		},
		// 悬停提示
		HoverProvider: true,
		// 跳转到定义
		DefinitionProvider: true,
		// 查找引用
		ReferencesProvider: true,
		// 文档符号
		DocumentSymbolProvider: true,
		// 工作区符号
		WorkspaceSymbolProvider: true,
	}
	
	result := InitializeResult{
		Capabilities: capabilities,
		ServerInfo: &ServerInfo{
			Name:    "折言(Origami)语言服务器",
			Version: "0.0.1",
		},
	}
	
	if h.verbose {
		log.Println("初始化完成，返回服务器能力")
	}
	
	return result, nil
}

// handleInitialized 处理初始化完成通知
func (h *Handler) handleInitialized(params json.RawMessage) error {
	if h.verbose {
		log.Println("收到初始化完成通知")
	}
	return nil
}

// 简化的能力结构体定义（避免过于复杂）
type WorkspaceEditCapabilities struct{}
type DidChangeConfigurationCapabilities struct{}
type DidChangeWatchedFilesCapabilities struct{}
type WorkspaceSymbolCapabilities struct{}
type ExecuteCommandCapabilities struct{}
type TextDocumentSyncCapabilities struct{}
type CompletionCapabilities struct{}
type HoverCapabilities struct{}
type SignatureHelpCapabilities struct{}
type DeclarationCapabilities struct{}
type DefinitionCapabilities struct{}
type TypeDefinitionCapabilities struct{}
type ImplementationCapabilities struct{}
type ReferencesCapabilities struct{}
type DocumentHighlightCapabilities struct{}
type DocumentSymbolCapabilities struct{}
type CodeActionCapabilities struct{}
type CodeLensCapabilities struct{}
type DocumentLinkCapabilities struct{}
type DocumentColorCapabilities struct{}
type DocumentFormattingCapabilities struct{}
type DocumentRangeFormattingCapabilities struct{}
type DocumentOnTypeFormattingCapabilities struct{}
type RenameCapabilities struct{}
type PublishDiagnosticsCapabilities struct{}
type FoldingRangeCapabilities struct{}
type SelectionRangeCapabilities struct{}
type LinkedEditingRangeCapabilities struct{}
type CallHierarchyCapabilities struct{}
type SemanticTokensCapabilities struct{}
type MonikerCapabilities struct{}
type ShowMessageRequestCapabilities struct{}
type ShowDocumentCapabilities struct{}
type RegularExpressionsCapabilities struct{}
type MarkdownCapabilities struct{}
type SignatureHelpOptions struct{}
type CodeLensOptions struct{}
type DocumentLinkOptions struct{}
type DocumentOnTypeFormattingOptions struct{}
type ExecuteCommandOptions struct{}
type SemanticTokensOptions struct{}
type WorkspaceOptions struct{}