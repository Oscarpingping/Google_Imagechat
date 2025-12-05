#!/bin/bash
# 修复 Node.js 升级冲突

echo "=== 修复 Node.js 升级问题 ==="

# 1. 完全卸载旧版本 Node.js
echo "步骤 1: 卸载旧版本..."
sudo apt-get remove -y nodejs libnode-dev libnode72
sudo apt-get autoremove -y
sudo apt-get autoclean

# 2. 清理残留文件
echo "步骤 2: 清理残留文件..."
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/share/man/man1/node*
sudo rm -rf /usr/local/lib/dtrace/node.d
sudo rm -rf ~/.npm
sudo rm -rf ~/.node-gyp
sudo rm -rf /opt/local/bin/node
sudo rm -rf /opt/local/include/node
sudo rm -rf /opt/local/lib/node_modules
sudo rm -rf /usr/local/lib/node*
sudo rm -rf /usr/local/include/node*
sudo rm -rf /usr/local/bin/node*

# 3. 添加 NodeSource 仓库
echo "步骤 3: 添加 Node.js 18.x 仓库..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 4. 安装 Node.js 18
echo "步骤 4: 安装 Node.js 18..."
sudo apt-get install -y nodejs

# 5. 验证安装
echo "步骤 5: 验证安装..."
echo "Node.js 版本："
node -v

echo "npm 版本："
npm -v

# 6. 检查版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo "✅ Node.js 升级成功！"
else
    echo "❌ Node.js 升级失败，当前版本: $(node -v)"
    exit 1
fi

echo "=== 升级完成 ==="
