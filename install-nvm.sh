#!/bin/bash
# 使用 nvm 安装和管理 Node.js 版本（推荐方案）

echo "=== 使用 nvm 安装 Node.js 18 ==="

# 1. 安装 nvm
echo "步骤 1: 安装 nvm..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. 加载 nvm（支持多种 shell）
echo "步骤 2: 加载 nvm..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 如果上面的加载失败，尝试手动加载
if ! command -v nvm &> /dev/null; then
    echo "手动加载 nvm..."
    source ~/.bashrc
    source ~/.profile
fi

# 3. 安装 Node.js 18 LTS
echo "步骤 3: 安装 Node.js 18..."
nvm install 18

# 4. 设置为默认版本
echo "步骤 4: 设置默认版本..."
nvm use 18
nvm alias default 18

# 5. 验证
echo "步骤 5: 验证安装..."
echo "Node.js 版本："
node -v

echo "npm 版本："
npm -v

# 6. 检查版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo "✅ Node.js 18 安装成功！"
    echo ""
    echo "重要提示："
    echo "1. 关闭当前终端并重新打开，或运行: source ~/.bashrc"
    echo "2. 验证版本: node -v"
    echo "3. 如果 nvm 命令不可用，运行: source ~/.nvm/nvm.sh"
else
    echo "❌ 安装失败，当前版本: $(node -v)"
    echo "请手动运行以下命令："
    echo "  source ~/.bashrc"
    echo "  nvm use 18"
    exit 1
fi

echo "=== 安装完成 ==="
