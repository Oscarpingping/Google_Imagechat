const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const { GoogleGenerativeAI, HarmBlockThreshold } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

// 设置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制文件大小为10MB
  },
  fileFilter: (req, file, cb) => {
    const validImageTypes = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (validImageTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  }
});

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

// 辅助函数：从文件读取图像并编码为Base64
function fileToGenerativePart(filePath, mimeType) {
  const imageBuffer = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: imageBuffer.toString('base64'),
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
          ],
        //   safetySettings: [
        //     {
        //         category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        //         threshold: HarmCategory.HarmBlockThreshold.BLOCK_NONE,
        //     },
        //     {
        //         category: HARM_CATEGORY_HATE_SPEECH,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        //     {
        //         category: HARM_CATEGORY_SEXUALLY_EXPLICIT,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        //     {
        //         category: HARM_CATEGORY_DANGEROUS_CONTENT,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        // ],
        // generationConfig: {
        //     temperature: 0.9,
        //     topK: 32,
        //     topP: 0.95,
        //     maxOutputTokens: 1024,
        // },
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
  
      // 检查和压缩图片
      const image = sharp(absoluteFilePath);
      const metadata = await image.metadata();

      if (metadata.width > 2048 || metadata.height > 2048) {
        const tempFilePath = absoluteFilePath + '.temp';
        await image.resize(2048, 2048, { fit: 'inside' }).toFile(tempFilePath);
        fs.renameSync(tempFilePath, absoluteFilePath);
      }
  
      console.log('Image processed successfully');
  
      console.log('Sending request to AI model...');
      const imagePart = fileToGenerativePart(absoluteFilePath, mimeType);
      const result = await model.generateContent([initialPrompt, imagePart]);
    //   const result = await model.generateContent({
    //     contents: [{
    //         role: "user",
    //         parts: [
    //             { text: initialPrompt },
    //             { inlineData: imagePart }
    //         ]
    //     }],
    //     generationConfig: {
    //         temperature: 0.9,
    //         topK: 32,
    //         topP: 0.95,
    //         maxOutputTokens: 1024,
    //     },
        // SafetySettings: [
        //     {
        //         category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        //     {
        //         category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        //     {
        //         category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        //     {
        //         category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        //         threshold: HarmBlockThreshold.BLOCK_NONE,
        //     },
        // ],        
    // });

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
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).send('No file uploaded.');
  }

  try {
    const filePath = req.file.path;
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // 检查图片尺寸并压缩到2048x2048
    if (metadata.width > 2048 || metadata.height > 2048) {
      const tempFilePath = filePath + '.temp';
      await image.resize(2048, 2048, { fit: 'inside' }).toFile(tempFilePath);
      fs.renameSync(tempFilePath, filePath);
    }

    console.log('File uploaded and processed successfully:', filePath);
    res.json({ 
      path: filePath, 
      mimeType: req.file.mimetype 
    });
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).send('Error processing uploaded file.');
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});