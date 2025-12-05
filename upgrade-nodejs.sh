#!/bin/bash
# Ubuntu 服务器升级 Node.js 到 18.x LTS

echo "开始升级 Node.js..."

# 1. 安装 Node.js 18.x 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 2. 安装 Node.js
sudo apt-get install -y nodejs

# 3. 验证版本
echo "Node.js 版本："
node -v

echo "npm 版本："
npm -v

echo "升级完成！"
