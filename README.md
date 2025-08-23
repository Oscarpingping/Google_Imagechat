# Google Gemini 图片对话应用

一个基于 Google Gemini API 的智能图片对话应用，支持上传图片并与 AI 进行实时对话交流。

## 🌟 主要功能

### 📸 图片识别与分析
- 支持上传各种格式的图片（JPG、PNG、GIF 等）
- 使用 Google Gemini 1.5 Flash 模型进行图片内容分析
- 智能识别图片中的文字、物体、场景等信息

### 💬 实时对话系统
- 基于 Socket.IO 的实时双向通信
- 支持连续对话，保持上下文记忆
- 智能学习辅导模式，引导式教学而非直接给答案

### 🔄 连接稳定性保障
- 自动重连机制，网络中断后自动恢复
- 心跳检测系统，防止长时间无活动导致的连接断开
- 用户活动监测，智能管理连接状态

### 🎯 教育导向设计
- 专为学习辅导优化的 AI 提示词
- 启发式教学方法，逐步引导思考
- 友好耐心的交互体验

## 🚀 快速开始

### 环境要求
- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器
- Google Gemini API 密钥

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <项目地址>
   cd Google_Imagechat
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   在项目根目录创建 `.env` 文件：
   ```env
   API_KEY=你的_Google_Gemini_API_密钥
   PORT=3000
   ```

4. **创建上传目录**
   ```bash
   mkdir -p src/uploads
   ```

5. **启动应用**
   ```bash
   node src/server.js
   ```

6. **访问应用**
   
   打开浏览器访问：`http://localhost:3000`

## 📁 项目结构

```
Google_Imagechat/
├── src/
│   ├── server.js              # 主服务器文件
│   ├── server-teacher.js      # 教师模式服务器
│   ├── Google_imagechat.js    # Google API 集成
│   └── uploads/               # 图片上传目录
├── public/
│   └── index.html            # 前端界面
├── .env                      # 环境变量配置
├── .gitignore               # Git 忽略文件
├── package.json             # 项目依赖配置
└── README.md               # 项目说明文档
```

## 🔧 核心技术栈

- **后端框架**: Express.js
- **实时通信**: Socket.IO
- **AI 服务**: Google Generative AI (Gemini 1.5 Flash)
- **文件上传**: Multer
- **环境配置**: dotenv
- **前端**: 原生 HTML/CSS/JavaScript

## 📖 使用指南

### 上传图片
1. 点击"选择文件"按钮选择图片
2. 图片会自动上传并显示在右侧预览区域
3. AI 会自动分析图片内容并开始对话

### 进行对话
1. 在输入框中输入你的问题或回复
2. 按回车键或点击"发送"按钮
3. AI 会根据图片内容和对话历史给出回应

### 连接状态
- 绿色提示：连接正常
- 黄色提示：正在重连
- 红色提示：连接失败

## ⚙️ 配置说明

### 环境变量
- `API_KEY`: Google Gemini API 密钥（必需）
- `PORT`: 服务器端口号（默认 3000）

### Socket.IO 配置
- 重连延迟：1秒
- 最大重连次数：5次
- 连接超时：20秒
- 心跳间隔：5分钟

## 🛠️ 开发说明

### 启动开发模式
```bash
# 使用 nodemon 自动重启
npm install -g nodemon
nodemon src/server.js
```

### 调试模式
服务器启动时会输出详细的调试信息，包括：
- API 密钥状态检查
- 文件上传路径
- WebSocket 连接状态
- AI 响应内容

## 🔒 安全注意事项

1. **API 密钥保护**
   - 不要将 `.env` 文件提交到版本控制
   - 定期更换 API 密钥
   - 使用环境变量管理敏感信息

2. **文件上传安全**
   - 限制上传文件类型和大小
   - 定期清理上传目录
   - 验证文件内容安全性

## 🐛 常见问题

### API 密钥错误
- 检查 `.env` 文件是否正确配置
- 确认 API 密钥有效且有足够配额
- 验证 Google Cloud 项目设置

### 连接断开问题
- 检查网络连接稳定性
- 确认服务器正常运行
- 查看浏览器控制台错误信息

### 图片上传失败
- 确认 `src/uploads` 目录存在且有写入权限
- 检查图片格式是否支持
- 验证文件大小是否超出限制

## 📝 更新日志

- **v1.0.0**: 初始版本发布
  - 基础图片上传和对话功能
  - Google Gemini API 集成
  - 实时通信系统
  - 连接稳定性优化

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目！

## 📄 许可证

ISC License

---

如有问题或建议，请随时联系开发团队。