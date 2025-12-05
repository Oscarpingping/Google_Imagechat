#!/bin/bash
# 使用 nvm 安装和管理 Node.js 版本

echo "安装 nvm..."

# 1. 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. 安装 Node.js 18 LTS
nvm install 18

# 4. 设置为默认版本
nvm use 18
nvm alias default 18

# 5. 验证
echo "Node.js 版本："
node -v

echo "npm 版本："
npm -v

echo "安装完成！"
echo "如果命令不生效，请运行: source ~/.bashrc"
