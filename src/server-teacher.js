require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // 心跳配置 - 10分钟无响应断开
    pingTimeout: 600000,    // 10分钟无响应则断开
    pingInterval: 60000,    // 每60秒发送一次心跳
    upgradeTimeout: 30000,  // 升级超时时间
    allowEIO3: true         // 兼容性设置
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// 设置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 验证 API 密钥
if (!process.env.API_KEY) {
    console.error('错误：未找到 API_KEY 环境变量');
    process.exit(1);
}

console.log('API_KEY 已加载，长度:', process.env.API_KEY.length);

// 初始化 Gemini AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// 辅助函数：将文件转换为 Gemini 格式
function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
            mimeType
        }
    };
}

// 存储用户会话
const userSessions = new Map();

// WebSocket 连接处理
io.on('connection', (socket) => {
    console.log(`用户已连接: ${socket.id}`);

    // 初始化用户会话
    userSessions.set(socket.id, {
        currentChat: null,
        lastActivity: Date.now(),
        heartbeatInterval: null
    });

    const session = userSessions.get(socket.id);

    // 发送连接确认
    socket.emit('message', '欢迎！我是你的AI助手，可以帮你分析图片和回答问题。');

    // 设置心跳机制
    session.heartbeatInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - session.lastActivity;

        // 如果超过8分钟无活动，发送保活消息
        if (timeSinceLastActivity > 8 * 60 * 1000) {
            socket.emit('heartbeat', { timestamp: now });
            console.log(`发送心跳给用户: ${socket.id}`);
        }
    }, 60000); // 每60秒检查一次

    // 处理心跳响应
    socket.on('heartbeat_response', () => {
        session.lastActivity = Date.now();
        console.log(`收到用户心跳响应: ${socket.id}`);
    });

    // 处理文本消息
    socket.on('message', async (msg) => {
        try {
            console.log('收到消息:', msg);

            // 更新活动时间
            session.lastActivity = Date.now();

            if (!session.currentChat) {
                // 创建新对话
                const result = await model.generateContent(msg);
                const responseText = result.response.text();

                session.currentChat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: msg }] },
                        { role: "model", parts: [{ text: responseText }] }
                    ]
                });

                console.log('AI 回复:', responseText);
                socket.emit('message', responseText);
            } else {
                // 继续现有对话（保持图片上下文）
                console.log('继续现有对话，保持上下文');
                const result = await session.currentChat.sendMessage(msg);
                const responseText = result.response.text();

                console.log('AI 回复:', responseText);
                socket.emit('message', responseText);
            }
        } catch (error) {
            console.error(`处理消息错误 (${socket.id}):`, error);

            // 根据错误类型提供不同的错误消息
            if (error.message.includes('API_KEY_INVALID')) {
                socket.emit('message', '抱歉，API 密钥无效，请联系管理员。');
            } else if (error.message.includes('timeout')) {
                socket.emit('message', '请求超时，请稍后重试。');
            } else {
                socket.emit('message', `抱歉，处理消息时出现错误：${error.message}`);
            }
        }
    });

    // 处理图片上传
    socket.on('upload', async (data) => {
        try {
            console.log('收到图片上传:', data);

            // 更新活动时间
            session.lastActivity = Date.now();

            const { path: filePath, mimeType, initialPrompt } = data;

            if (!filePath) {
                socket.emit('message', '错误：文件路径缺失');
                return;
            }

            const absolutePath = path.resolve(filePath);

            if (!fs.existsSync(absolutePath)) {
                socket.emit('message', '错误：文件不存在');
                return;
            }

            console.log('处理图片:', absolutePath);

            // 创建图片部分
            const imagePart = fileToGenerativePart(absolutePath, mimeType);

            // 发送给 Gemini，使用更好的初始提示
            const enhancedPrompt = initialPrompt + "。请详细描述这张图片，我想和你讨论图片的内容。";
            const result = await model.generateContent([enhancedPrompt, imagePart]);
            const responseText = result.response.text();

            // 创建新的聊天会话，包含图片上下文
            session.currentChat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: enhancedPrompt }, imagePart] },
                    { role: "model", parts: [{ text: responseText }] }
                ]
            });

            console.log('图片分析结果:', responseText);
            socket.emit('message', responseText);

        } catch (error) {
            console.error(`处理图片错误 (${socket.id}):`, error);

            // 根据错误类型提供不同的错误消息
            if (error.message.includes('API_KEY_INVALID')) {
                socket.emit('message', '抱歉，API 密钥无效，请联系管理员。');
            } else if (error.message.includes('File not found')) {
                socket.emit('message', '抱歉，找不到上传的图片文件。');
            } else if (error.message.includes('timeout')) {
                socket.emit('message', '图片处理超时，请稍后重试。');
            } else {
                socket.emit('message', `抱歉，处理图片时出现错误：${error.message}`);
            }
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`用户已断开连接: ${socket.id}, 原因: ${reason}`);

        // 清理用户会话
        const session = userSessions.get(socket.id);
        if (session && session.heartbeatInterval) {
            clearInterval(session.heartbeatInterval);
        }
        userSessions.delete(socket.id);
    });

    // 处理连接错误
    socket.on('error', (error) => {
        console.error(`Socket 错误 (${socket.id}):`, error);
    });
});

// 文件上传端点
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('没有上传文件');
    }

    console.log('文件上传成功:', req.file.path);
    res.json({
        path: req.file.path,
        mimeType: req.file.mimetype
    });
});

// 定期清理过期会话
setInterval(() => {
    const now = Date.now();
    const expiredSessions = [];

    userSessions.forEach((session, socketId) => {
        const timeSinceLastActivity = now - session.lastActivity;

        // 如果超过15分钟无活动，标记为过期
        if (timeSinceLastActivity > 15 * 60 * 1000) {
            expiredSessions.push(socketId);
        }
    });

    expiredSessions.forEach(socketId => {
        console.log(`清理过期会话: ${socketId}`);
        const session = userSessions.get(socketId);
        if (session && session.heartbeatInterval) {
            clearInterval(session.heartbeatInterval);
        }
        userSessions.delete(socketId);
    });

    if (expiredSessions.length > 0) {
        console.log(`清理了 ${expiredSessions.length} 个过期会话`);
    }
}, 10 * 60 * 1000); // 每10分钟清理一次

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log('心跳机制已启用：');
    console.log('- 每60秒检查用户活动');
    console.log('- 8分钟无活动后发送心跳');
    console.log('- 10分钟无响应则断开连接');
    console.log('- 每10分钟清理15分钟无活动的过期会话');
});