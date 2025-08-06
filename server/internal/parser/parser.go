package parser

import (
	"regexp"
	"strings"
)

// Position represents a position in the source code
type Position struct {
	Line   int
	Column int
}

// Function represents a function definition
type Function struct {
	Name     string
	Position Position
	Params   []string
	ReturnType string
}

// Variable represents a variable definition
type Variable struct {
	Name     string
	Position Position
	Type     string
}

// Class represents a class definition
type Class struct {
	Name     string
	Position Position
	Methods  []Function
	Fields   []Variable
}

// AST represents the Abstract Syntax Tree
type AST struct {
	Functions []Function
	Variables []Variable
	Classes   []Class
}

// Parser represents the Origami language parser
type Parser struct {
	// 正则表达式模式
	functionPattern *regexp.Regexp
	variablePattern *regexp.Regexp
	classPattern    *regexp.Regexp
	methodPattern   *regexp.Regexp
}

// NewParser creates a new parser instance
func NewParser() *Parser {
	return &Parser{
		// 函数定义模式: function name() 或 函数 name() 或 func name()
		functionPattern: regexp.MustCompile(`(?m)^\s*(?:function|函数|func)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(`),
		// 变量定义模式: $var = 或 var $var 或 变量 $var
		variablePattern: regexp.MustCompile(`(?m)^\s*(?:var\s+)?\$([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:]|(?:变量|var)\s+\$([a-zA-Z_][a-zA-Z0-9_]*)`),
		// 类定义模式: class Name 或 类 Name
		classPattern: regexp.MustCompile(`(?m)^\s*(?:class|类)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)`),
		// 方法定义模式
		methodPattern: regexp.MustCompile(`(?m)^\s*(?:public|private|protected)?\s*(?:function|函数|方法)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(`),
	}
}

// Parse parses the source code and returns an AST
func (p *Parser) Parse(content string) (*AST, error) {
	ast := &AST{
		Functions: []Function{},
		Variables: []Variable{},
		Classes:   []Class{},
	}
	
	lines := strings.Split(content, "\n")
	
	// 解析函数
	p.parseFunctions(content, lines, ast)
	
	// 解析变量
	p.parseVariables(content, lines, ast)
	
	// 解析类
	p.parseClasses(content, lines, ast)
	
	return ast, nil
}

// parseFunctions parses function definitions
func (p *Parser) parseFunctions(content string, lines []string, ast *AST) {
	matches := p.functionPattern.FindAllStringSubmatch(content, -1)
	indices := p.functionPattern.FindAllStringSubmatchIndex(content, -1)
	
	for i, match := range matches {
		if len(match) > 1 {
			funcName := match[1]
			position := p.getPositionFromIndex(content, indices[i][0])
			
			// 提取参数
			params := p.extractFunctionParams(lines, position.Line)
			
			ast.Functions = append(ast.Functions, Function{
				Name:     funcName,
				Position: position,
				Params:   params,
			})
		}
	}
}

// parseVariables parses variable definitions
func (p *Parser) parseVariables(content string, lines []string, ast *AST) {
	matches := p.variablePattern.FindAllStringSubmatch(content, -1)
	indices := p.variablePattern.FindAllStringSubmatchIndex(content, -1)
	
	for i, match := range matches {
		var varName string
		// 处理不同的捕获组
		for j := 1; j < len(match); j++ {
			if match[j] != "" {
				varName = match[j]
				break
			}
		}
		
		if varName != "" {
			position := p.getPositionFromIndex(content, indices[i][0])
			
			ast.Variables = append(ast.Variables, Variable{
				Name:     varName,
				Position: position,
				Type:     p.inferVariableType(lines, position.Line),
			})
		}
	}
}

// parseClasses parses class definitions
func (p *Parser) parseClasses(content string, lines []string, ast *AST) {
	matches := p.classPattern.FindAllStringSubmatch(content, -1)
	indices := p.classPattern.FindAllStringSubmatchIndex(content, -1)
	
	for i, match := range matches {
		if len(match) > 1 {
			className := match[1]
			position := p.getPositionFromIndex(content, indices[i][0])
			
			// 解析类的方法和字段
			methods, fields := p.parseClassMembers(lines, position.Line)
			
			ast.Classes = append(ast.Classes, Class{
				Name:     className,
				Position: position,
				Methods:  methods,
				Fields:   fields,
			})
		}
	}
}

// getPositionFromIndex converts byte index to line/column position
func (p *Parser) getPositionFromIndex(content string, index int) Position {
	line := 0
	column := 0
	
	for i, char := range content {
		if i >= index {
			break
		}
		if char == '\n' {
			line++
			column = 0
		} else {
			column++
		}
	}
	
	return Position{Line: line, Column: column}
}

// extractFunctionParams extracts function parameters
func (p *Parser) extractFunctionParams(lines []string, lineNum int) []string {
	if lineNum >= len(lines) {
		return []string{}
	}
	
	line := lines[lineNum]
	paramStart := strings.Index(line, "(")
	paramEnd := strings.Index(line, ")")
	
	if paramStart == -1 || paramEnd == -1 || paramEnd <= paramStart {
		return []string{}
	}
	
	paramStr := line[paramStart+1 : paramEnd]
	paramStr = strings.TrimSpace(paramStr)
	
	if paramStr == "" {
		return []string{}
	}
	
	params := strings.Split(paramStr, ",")
	result := make([]string, len(params))
	
	for i, param := range params {
		result[i] = strings.TrimSpace(param)
	}
	
	return result
}

// inferVariableType infers the type of a variable from its assignment
func (p *Parser) inferVariableType(lines []string, lineNum int) string {
	if lineNum >= len(lines) {
		return "unknown"
	}
	
	line := lines[lineNum]
	
	// 简单的类型推断
	if strings.Contains(line, "= \"") || strings.Contains(line, "= '") {
		return "string"
	}
	if strings.Contains(line, "= [") || strings.Contains(line, "= array(") {
		return "array"
	}
	if regexp.MustCompile(`=\s*\d+`).MatchString(line) {
		return "int"
	}
	if regexp.MustCompile(`=\s*\d+\.\d+`).MatchString(line) {
		return "float"
	}
	if strings.Contains(line, "= true") || strings.Contains(line, "= false") {
		return "bool"
	}
	
	return "mixed"
}

// parseClassMembers parses methods and fields within a class
func (p *Parser) parseClassMembers(lines []string, startLine int) ([]Function, []Variable) {
	methods := []Function{}
	fields := []Variable{}
	
	// 查找类的结束位置
	braceCount := 0
	foundStart := false
	
	for i := startLine; i < len(lines); i++ {
		line := lines[i]
		
		if strings.Contains(line, "{") {
			braceCount++
			foundStart = true
		}
		if strings.Contains(line, "}") {
			braceCount--
			if foundStart && braceCount == 0 {
				break
			}
		}
		
		// 在类内部查找方法
		if foundStart && braceCount > 0 {
			if p.methodPattern.MatchString(line) {
				matches := p.methodPattern.FindStringSubmatch(line)
				if len(matches) > 1 {
					methods = append(methods, Function{
						Name: matches[1],
						Position: Position{Line: i, Column: 0},
						Params: p.extractFunctionParams(lines, i),
					})
				}
			}
			
			// 查找字段
			if p.variablePattern.MatchString(line) {
				matches := p.variablePattern.FindStringSubmatch(line)
				for j := 1; j < len(matches); j++ {
					if matches[j] != "" {
						fields = append(fields, Variable{
							Name: matches[j],
							Position: Position{Line: i, Column: 0},
							Type: p.inferVariableType(lines, i),
						})
						break
					}
				}
			}
		}
	}
	
	return methods, fields
}