const net = require('net');

// 创建TCP客户端连接
const client = new net.Socket();

client.connect(9999, 'localhost', () => {
    console.log('✅ 成功连接到TCP服务器 localhost:9999');
    
    // 发送LSP初始化请求
    const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            processId: process.pid,
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            },
            capabilities: {
                textDocument: {
                    synchronization: {
                        dynamicRegistration: false
                    }
                }
            },
            workspaceFolders: null
        }
    };
    
    const message = JSON.stringify(initRequest);
    const header = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n`;
    const fullMessage = header + message;
    
    console.log('📤 发送初始化请求...');
    client.write(fullMessage);
});

client.on('data', (data) => {
    console.log('📥 收到服务器响应:');
    console.log(data.toString());
    
    // 发送shutdown请求
    const shutdownRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'shutdown',
        params: null
    };
    
    const message = JSON.stringify(shutdownRequest);
    const header = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n`;
    const fullMessage = header + message;
    
    console.log('📤 发送关闭请求...');
    client.write(fullMessage);
    
    // 延迟关闭连接
    setTimeout(() => {
        console.log('🔌 关闭连接');
        client.destroy();
    }, 1000);
});

client.on('close', () => {
    console.log('✅ TCP连接已关闭');
});

client.on('error', (err) => {
    console.error('❌ TCP连接错误:', err.message);
});

console.log('🚀 开始TCP通信测试...');