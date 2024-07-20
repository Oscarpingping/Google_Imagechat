const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

// 设置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // 上传到项目根目录的uploads文件夹
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) // 保持原始文件类型
  }
});
const upload = multer({ storage: storage });

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
// const model = genAI.getGenerativeModel({model: 'gemini-1.0-pro-vision-latest'});

// 辅助函数：从文件读取图像
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString('base64'),
      mimeType
    }
  };
}

// 处理WebSocket连接
io.on('connection', (socket) => {
  console.log('A user connected');
  let currentChat = null;

  // 处理新消息
  socket.on('message', async (msg) => {
    try {
      if (!currentChat) {
        // 如果没有当前会话，创建新会话
        console.log('Starting new chat with message:', msg);
        const result = await model.generateContent([msg]);
        const response = await result.response;
        currentChat = model.startChat({
          history: [
            { role: "user", parts: [{ text: msg }] },
            { role: "model", parts: [{ text: response.text() }] }
          ]
        });
        console.log('AI response:', response.text());
        socket.emit('message', response.text());
      } else {
        // 使用现有会话发送消息
        console.log('Sending message to existing chat:', msg);
        const result = await currentChat.sendMessage(msg);
        const response = await result.response;
        console.log('AI response:', response.text());
        socket.emit('message', response.text());
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', 'An error occurred while processing your message.');
    }
  });

//   // 处理图片上传和新会话启动
//   socket.on('upload', async (data) => {
//     try {
//       const { path, mimeType, initialPrompt } = data;
//       console.log('Processing uploaded image:', path);
//       console.log('Initial prompt:', initialPrompt);
//       const imagePart = fileToGenerativePart(path, mimeType);
//       const result = await model.generateContent([initialPrompt, imagePart]);
//       const response = await result.response;
//       console.log('AI response to image:', response.text());

//       // 启动新会话
//       currentChat = model.startChat({
//         history: [
//           { role: "user", parts: [{ text: initialPrompt }, imagePart] },
//           { role: "model", parts: [{ text: response.text() }] }
//         ]
//       });

//       socket.emit('message', response.text());
//     } catch (error) {
//       console.error('Error processing image:', error);
//       socket.emit('error', 'An error occurred while processing the image.');
//     }
//   });

// 处理图片上传和新会话启动
socket.on('upload', async (data) => {
    console.log('Upload event received. Data:', JSON.stringify(data, null, 2));
    
    try {
      const { path: filePath, mimeType, initialPrompt } = data;
      
      if (!filePath) {
        console.error('File path is missing in the upload data');
        socket.emit('error', 'File path is missing');
        return;
      }
  
      const absoluteFilePath = path.resolve(filePath);
      console.log('Absolute file path:', absoluteFilePath);
      console.log('File exists:', fs.existsSync(absoluteFilePath));
      console.log('MIME type:', mimeType);
      console.log('Initial prompt:', initialPrompt);
  
      if (!fs.existsSync(absoluteFilePath)) {
        console.error(`File not found: ${absoluteFilePath}`);
        socket.emit('error', 'File not found on server');
        return;
      }
  
      console.log('Attempting to process image...');
      const imagePart = fileToGenerativePart(absoluteFilePath, mimeType);
      console.log('Image processed successfully');
  
      console.log('Sending request to AI model...');
      const result = await model.generateContent([initialPrompt, imagePart]);
      const response = await result.response;
      console.log('AI response received');
      console.log('AI response to image:', response.text());
  
      // 启动新会话
      currentChat = model.startChat({
        history: [
          { role: "user", parts: [{ text: initialPrompt }, imagePart] },
          { role: "model", parts: [{ text: response.text() }] }
        ]
      });
      console.log('New chat session started');
  
      socket.emit('message', response.text());
      console.log('Response sent to client');
    } catch (error) {
      console.error('Error processing image:', error);
      socket.emit('error', 'An error occurred while processing the image: ' + error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// 处理文件上传
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).send('No file uploaded.');
  }
  console.log('File uploaded successfully:', req.file.path);
  res.json({ 
    path: req.file.path, 
    mimeType: req.file.mimetype 
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});