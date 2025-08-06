package completion

import (
	"fmt"
	"strings"

	"origami-language-server/internal/parser"
)

// CompletionItem represents a completion suggestion
type CompletionItem struct {
	Label         string `json:"label"`
	Kind          int    `json:"kind"`
	Detail        string `json:"detail,omitempty"`
	Documentation string `json:"documentation,omitempty"`
	InsertText    string `json:"insertText,omitempty"`
}

// CompletionItemKind constants
const (
	Text          = 1
	Method        = 2
	Function      = 3
	Constructor   = 4
	Field         = 5
	Variable      = 6
	Class         = 7
	Interface     = 8
	Module        = 9
	Property      = 10
	Unit          = 11
	Value         = 12
	Enum          = 13
	Keyword       = 14
	Snippet       = 15
	Color         = 16
	File          = 17
	Reference     = 18
	Folder        = 19
	EnumMember    = 20
	Constant      = 21
	Struct        = 22
	Event         = 23
	Operator      = 24
	TypeParameter = 25
)

// Provider provides code completion functionality
type Provider struct {
	// 内置关键字和函数
	keywords      []string
	builtinFuncs  []string
	phpFunctions  []string
	goKeywords    []string
}

// NewProvider creates a new completion provider
func NewProvider() *Provider {
	return &Provider{
		keywords: []string{
			// Origami 关键字
			"如果", "否则", "否则如果", "当", "为", "函数", "返回", "类", "接口",
			"公共", "私有", "保护", "静态", "抽象", "最终", "常量", "变量",
			"尝试", "捕获", "最终", "抛出", "新建", "这个", "父类", "自己",
			"真", "假", "空", "未定义",
			// 英文关键字
			"if", "else", "elseif", "while", "for", "function", "return", "class", "interface",
			"public", "private", "protected", "static", "abstract", "final", "const", "var",
			"try", "catch", "finally", "throw", "new", "this", "parent", "self",
			"true", "false", "null", "undefined",
		},
		builtinFuncs: []string{
			"打印", "输出", "长度", "类型", "转换", "解析", "格式化",
			"print", "echo", "len", "type", "convert", "parse", "format",
		},
		phpFunctions: []string{
			"array_map", "array_filter", "array_reduce", "array_merge", "array_push",
			"strlen", "substr", "strpos", "str_replace", "explode", "implode",
			"json_encode", "json_decode", "file_get_contents", "file_put_contents",
			"preg_match", "preg_replace", "trim", "ltrim", "rtrim",
		},
		goKeywords: []string{
			"go", "func", "var", "const", "type", "struct", "interface",
			"package", "import", "chan", "select", "defer", "range",
			"make", "append", "copy", "delete", "len", "cap",
		},
	}
}

// GetCompletions returns completion suggestions for the given position
func (p *Provider) GetCompletions(content string, ast *parser.AST, line, character int) []CompletionItem {
	completions := []CompletionItem{}
	
	// 获取当前行和前缀
	lines := strings.Split(content, "\n")
	if line >= len(lines) {
		return completions
	}
	
	currentLine := lines[line]
	prefix := ""
	if character <= len(currentLine) {
		prefix = p.extractPrefix(currentLine, character)
	}
	
	// 添加关键字补全
	completions = append(completions, p.getKeywordCompletions(prefix)...)
	
	// 添加内置函数补全
	completions = append(completions, p.getBuiltinCompletions(prefix)...)
	
	// 添加用户定义的函数补全
	if ast != nil {
		completions = append(completions, p.getFunctionCompletions(ast, prefix)...)
		
		// 添加变量补全
		completions = append(completions, p.getVariableCompletions(ast, prefix)...)
		
		// 添加类补全
		completions = append(completions, p.getClassCompletions(ast, prefix)...)
	}
	
	// 检查是否在对象访问上下文中
	if p.isObjectAccess(currentLine, character) {
		completions = append(completions, p.getObjectMethodCompletions(ast, currentLine, character)...)
	}
	
	// 添加代码片段
	completions = append(completions, p.getSnippetCompletions(prefix)...)
	
	return completions
}

// extractPrefix extracts the word prefix at the given position
func (p *Provider) extractPrefix(line string, character int) string {
	if character > len(line) {
		character = len(line)
	}
	
	start := character
	for start > 0 && p.isWordChar(line[start-1]) {
		start--
	}
	
	return line[start:character]
}

// isWordChar checks if a character is part of a word
func (p *Provider) isWordChar(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' || c == '$'
}

// getKeywordCompletions returns keyword completions
func (p *Provider) getKeywordCompletions(prefix string) []CompletionItem {
	completions := []CompletionItem{}
	
	for _, keyword := range p.keywords {
		if strings.HasPrefix(keyword, prefix) {
			completions = append(completions, CompletionItem{
				Label:  keyword,
				Kind:   Keyword,
				Detail: "Origami keyword",
			})
		}
	}
	
	return completions
}

// getBuiltinCompletions returns built-in function completions
func (p *Provider) getBuiltinCompletions(prefix string) []CompletionItem {
	completions := []CompletionItem{}
	
	// 内置函数
	for _, fn := range p.builtinFuncs {
		if strings.HasPrefix(fn, prefix) {
			completions = append(completions, CompletionItem{
				Label:      fn,
				Kind:       Function,
				Detail:     "Built-in function",
				InsertText: fn + "()",
			})
		}
	}
	
	// PHP 函数
	for _, fn := range p.phpFunctions {
		if strings.HasPrefix(fn, prefix) {
			completions = append(completions, CompletionItem{
				Label:      fn,
				Kind:       Function,
				Detail:     "PHP function",
				InsertText: fn + "()",
			})
		}
	}
	
	// Go 关键字
	for _, keyword := range p.goKeywords {
		if strings.HasPrefix(keyword, prefix) {
			completions = append(completions, CompletionItem{
				Label:  keyword,
				Kind:   Keyword,
				Detail: "Go keyword",
			})
		}
	}
	
	return completions
}

// getFunctionCompletions returns user-defined function completions
func (p *Provider) getFunctionCompletions(ast *parser.AST, prefix string) []CompletionItem {
	completions := []CompletionItem{}
	
	for _, fn := range ast.Functions {
		if strings.HasPrefix(fn.Name, prefix) {
			paramStr := strings.Join(fn.Params, ", ")
			completions = append(completions, CompletionItem{
				Label:         fn.Name,
				Kind:          Function,
				Detail:        fmt.Sprintf("function %s(%s)", fn.Name, paramStr),
				Documentation: fmt.Sprintf("User-defined function at line %d", fn.Position.Line+1),
				InsertText:    fn.Name + "()",
			})
		}
	}
	
	return completions
}

// getVariableCompletions returns variable completions
func (p *Provider) getVariableCompletions(ast *parser.AST, prefix string) []CompletionItem {
	completions := []CompletionItem{}
	
	for _, variable := range ast.Variables {
		if strings.HasPrefix(variable.Name, prefix) {
			completions = append(completions, CompletionItem{
				Label:         "$" + variable.Name,
				Kind:          Variable,
				Detail:        fmt.Sprintf("%s variable", variable.Type),
				Documentation: fmt.Sprintf("Variable defined at line %d", variable.Position.Line+1),
			})
		}
	}
	
	return completions
}

// getClassCompletions returns class completions
func (p *Provider) getClassCompletions(ast *parser.AST, prefix string) []CompletionItem {
	completions := []CompletionItem{}
	
	for _, class := range ast.Classes {
		if strings.HasPrefix(class.Name, prefix) {
			completions = append(completions, CompletionItem{
				Label:         class.Name,
				Kind:          Class,
				Detail:        "class " + class.Name,
				Documentation: fmt.Sprintf("Class defined at line %d", class.Position.Line+1),
			})
		}
	}
	
	return completions
}

// isObjectAccess checks if we're in an object access context (e.g., $obj->)
func (p *Provider) isObjectAccess(line string, character int) bool {
	if character < 2 {
		return false
	}
	
	// 检查 -> 或 :: 访问
	if character >= 2 && line[character-2:character] == "->" {
		return true
	}
	if character >= 2 && line[character-2:character] == "::" {
		return true
	}
	if character >= 1 && line[character-1] == '.' {
		return true
	}
	
	return false
}

// getObjectMethodCompletions returns method completions for object access
func (p *Provider) getObjectMethodCompletions(ast *parser.AST, line string, character int) []CompletionItem {
	completions := []CompletionItem{}
	
	// 简单的对象方法补全
	commonMethods := []string{
		"toString", "valueOf", "length", "size", "isEmpty",
		"get", "set", "add", "remove", "contains",
		"map", "filter", "reduce", "forEach", "find",
	}
	
	for _, method := range commonMethods {
		completions = append(completions, CompletionItem{
			Label:      method,
			Kind:       Method,
			Detail:     "Common method",
			InsertText: method + "()",
		})
	}
	
	return completions
}

// getSnippetCompletions returns code snippet completions
func (p *Provider) getSnippetCompletions(prefix string) []CompletionItem {
	completions := []CompletionItem{}
	
	snippets := map[string]string{
		"if": "if (${1:condition}) {\n\t${2:// code}\n}",
		"如果": "如果 (${1:条件}) {\n\t${2:// 代码}\n}",
		"for": "for (${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// code}\n}",
		"为": "为 (${1:i} = 0; ${1:i} < ${2:长度}; ${1:i}++) {\n\t${3:// 代码}\n}",
		"function": "function ${1:name}(${2:params}) {\n\t${3:// code}\n\treturn ${4:result};\n}",
		"函数": "函数 ${1:名称}(${2:参数}) {\n\t${3:// 代码}\n\t返回 ${4:结果};\n}",
		"class": "class ${1:ClassName} {\n\t${2:// properties and methods}\n}",
		"类": "类 ${1:类名} {\n\t${2:// 属性和方法}\n}",
	}
	
	for trigger, snippet := range snippets {
		if strings.HasPrefix(trigger, prefix) {
			completions = append(completions, CompletionItem{
				Label:      trigger,
				Kind:       Snippet,
				Detail:     "Code snippet",
				InsertText: snippet,
			})
		}
	}
	
	return completions
}