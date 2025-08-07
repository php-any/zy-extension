package server

import (
	"fmt"
	"log"
	"sync"

	"origami-language-server/internal/completion"
	"origami-language-server/internal/parser"
)

// Document 代表一个打开的文档
type Document struct {
	URI     string
	Content string
	AST     *parser.AST
}

// LanguageServer 代表核心语言服务器
type LanguageServer struct {
	documents  map[string]*Document  // 文档映射
	mutex      sync.RWMutex          // 读写锁
	parser     *parser.Parser        // 语法解析器
	completion *completion.Provider  // 代码补全提供器
	verbose    bool                  // 是否启用详细日志
}

// NewLanguageServer 创建新的语言服务器实例
func NewLanguageServer(verbose bool) *LanguageServer {
	ls := &LanguageServer{
		documents:  make(map[string]*Document),
		parser:     parser.NewParser(),
		completion: completion.NewProvider(),
		verbose:    verbose,
	}
	
	if verbose {
		log.Println("语言服务器实例已创建")
	}
	
	return ls
}

// OpenDocument 打开新文档
func (ls *LanguageServer) OpenDocument(uri, content string) {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()
	
	if ls.verbose {
		log.Printf("正在打开文档: %s (长度: %d 字符)", uri, len(content))
	}
	
	// 解析文档
	ast, err := ls.parser.Parse(content)
	if err != nil {
		log.Printf("解析文档 %s 时出错: %v", uri, err)
	}
	
	ls.documents[uri] = &Document{
		URI:     uri,
		Content: content,
		AST:     ast,
	}
	
	if ls.verbose {
		log.Printf("文档已成功打开: %s", uri)
	}
}

// UpdateDocument 更新现有文档
func (ls *LanguageServer) UpdateDocument(uri, content string) {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()
	
	if ls.verbose {
		log.Printf("正在更新文档: %s (长度: %d 字符)", uri, len(content))
	}
	
	// 重新解析文档
	ast, err := ls.parser.Parse(content)
	if err != nil {
		log.Printf("解析文档 %s 时出错: %v", uri, err)
	}
	
	if doc, exists := ls.documents[uri]; exists {
		doc.Content = content
		doc.AST = ast
		if ls.verbose {
			log.Printf("文档已更新: %s", uri)
		}
	} else {
		ls.documents[uri] = &Document{
			URI:     uri,
			Content: content,
			AST:     ast,
		}
		if ls.verbose {
			log.Printf("新文档已创建: %s", uri)
		}
	}
}

// GetCompletions 获取指定位置的代码补全项
func (ls *LanguageServer) GetCompletions(uri string, line, character int) interface{} {
	ls.mutex.RLock()
	defer ls.mutex.RUnlock()
	
	if ls.verbose {
		log.Printf("正在为文档 %s 第 %d 行第 %d 列获取代码补全", uri, line+1, character+1)
	}
	
	doc, exists := ls.documents[uri]
	if !exists {
		if ls.verbose {
			log.Printf("文档不存在，无法提供补全: %s", uri)
		}
		return []interface{}{}
	}
	
	// 获取补全建议
	completions := ls.completion.GetCompletions(doc.Content, doc.AST, line, character)
	
	if ls.verbose {
		log.Printf("为文档 %s 找到 %d 个补全项", uri, len(completions))
	}
	
	return map[string]interface{}{
		"isIncomplete": false,
		"items":        completions,
	}
}

// GetDefinition 获取指定位置符号的定义位置
func (ls *LanguageServer) GetDefinition(uri string, line, character int) interface{} {
	ls.mutex.RLock()
	defer ls.mutex.RUnlock()
	
	if ls.verbose {
		log.Printf("正在为文档 %s 第 %d 行第 %d 列查找符号定义", uri, line+1, character+1)
	}
	
	doc, exists := ls.documents[uri]
	if !exists {
		if ls.verbose {
			log.Printf("文档不存在，无法查找定义: %s", uri)
		}
		return nil
	}
	
	// 查找定义
	definition := ls.findDefinition(doc, line, character)
	
	if definition != nil && ls.verbose {
		log.Printf("成功找到符号定义位置")
	} else if ls.verbose {
		log.Printf("未找到符号定义")
	}
	
	return definition
}

// findDefinition finds the definition of a symbol
func (ls *LanguageServer) findDefinition(doc *Document, line, character int) interface{} {
	if doc.AST == nil {
		return nil
	}
	
	// 获取当前位置的符号
	symbol := ls.getSymbolAtPosition(doc.Content, line, character)
	if symbol == "" {
		return nil
	}
	
	log.Printf("Looking for definition of symbol: %s", symbol)
	
	// 在AST中查找符号定义
	if definition := ls.findSymbolDefinition(doc.AST, symbol); definition != nil {
		return map[string]interface{}{
			"uri": doc.URI,
			"range": map[string]interface{}{
				"start": map[string]interface{}{
					"line":      definition.Line,
					"character": definition.Column,
				},
				"end": map[string]interface{}{
					"line":      definition.Line,
					"character": definition.Column + len(symbol),
				},
			},
		}
	}
	
	return nil
}

// getSymbolAtPosition extracts the symbol at the given position
func (ls *LanguageServer) getSymbolAtPosition(content string, line, character int) string {
	lines := splitLines(content)
	if line >= len(lines) {
		return ""
	}
	
	currentLine := lines[line]
	if character >= len(currentLine) {
		return ""
	}
	
	// 简单的符号提取逻辑
	start := character
	end := character
	
	// 向前查找符号开始
	for start > 0 && isSymbolChar(currentLine[start-1]) {
		start--
	}
	
	// 向后查找符号结束
	for end < len(currentLine) && isSymbolChar(currentLine[end]) {
		end++
	}
	
	if start == end {
		return ""
	}
	
	return currentLine[start:end]
}

// isSymbolChar checks if a character is part of a symbol
func isSymbolChar(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' || c == '$'
}

// findSymbolDefinition finds a symbol definition in the AST
func (ls *LanguageServer) findSymbolDefinition(ast *parser.AST, symbol string) *parser.Position {
	if ast == nil {
		return nil
	}
	
	// 在函数定义中查找
	for _, fn := range ast.Functions {
		if fn.Name == symbol {
			return &fn.Position
		}
	}
	
	// 在变量定义中查找
	for _, variable := range ast.Variables {
		if variable.Name == symbol {
			return &variable.Position
		}
	}
	
	// 在类定义中查找
	for _, class := range ast.Classes {
		if class.Name == symbol {
			return &class.Position
		}
	}
	
	return nil
}

// CloseDocument 关闭文档
func (ls *LanguageServer) CloseDocument(uri string) {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()
	
	if ls.verbose {
		log.Printf("正在关闭文档: %s", uri)
	}
	
	delete(ls.documents, uri)
	
	if ls.verbose {
		log.Printf("文档已关闭: %s", uri)
	}
}

// GetHover 获取指定位置的悬停信息
func (ls *LanguageServer) GetHover(uri string, line, character int) interface{} {
	ls.mutex.RLock()
	defer ls.mutex.RUnlock()
	
	if ls.verbose {
		log.Printf("正在为文档 %s 第 %d 行第 %d 列获取悬停信息", uri, line+1, character+1)
	}
	
	doc, exists := ls.documents[uri]
	if !exists {
		if ls.verbose {
			log.Printf("文档不存在，无法提供悬停信息: %s", uri)
		}
		return nil
	}
	
	// 获取当前位置的符号
	symbol := ls.getSymbolAtPosition(doc.Content, line, character)
	if symbol == "" {
		return nil
	}
	
	// 查找符号定义以提供悬停信息
	if definition := ls.findSymbolDefinition(doc.AST, symbol); definition != nil {
		hoverText := "**" + symbol + "**\n\n定义位置: 第 " + 
			fmt.Sprintf("%d", definition.Line+1) + " 行"
		
		if ls.verbose {
			log.Printf("为符号 %s 提供悬停信息", symbol)
		}
		
		return hoverText
	}
	
	return nil
}

// splitLines splits content into lines
func splitLines(content string) []string {
	lines := []string{}
	current := ""
	
	for _, char := range content {
		if char == '\n' {
			lines = append(lines, current)
			current = ""
		} else if char != '\r' {
			current += string(char)
		}
	}
	
	if current != "" {
		lines = append(lines, current)
	}
	
	return lines
}