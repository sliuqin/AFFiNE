#!/bin/bash

# AFFiNE 生产环境部署脚本（当前分支）
# 用法: ./deploy.sh

set -e

PROJECT_DIR="/Users/sliuqin/Projects/github/AFFiNE"

# 禁用Git分页器（防止卡住）
export GIT_PAGER=""
export PAGER=""

echo "🚀 AFFiNE 生产环境部署（当前分支）"
echo "================================="

cd "$PROJECT_DIR"

echo "📋 当前分支: $(git branch --show-current)"
echo "📋 当前提交: $(git --no-pager rev-parse --short HEAD)"

# 检查Rust工具链
echo "🦀 检查Rust环境..."
if ! command -v rustc &> /dev/null; then
    echo "❌ 未找到Rust工具链"
    echo "💡 安装Rust："
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "   source ~/.cargo/env"
    exit 1
else
    echo "✅ Rust版本: $(rustc --version)"
fi

# 检查PM2
echo "📦 检查PM2进程管理器..."
if ! command -v pm2 &> /dev/null; then
    echo "⚙️  PM2未安装，正在安装..."
    npm install -g pm2
    if ! command -v pm2 &> /dev/null; then
        echo "❌ PM2安装失败，请手动安装: npm install -g pm2"
        exit 1
    fi
fi
echo "✅ PM2版本: $(pm2 --version)"

# 安装依赖
echo "📦 安装依赖..."
yarn install

# 初始化项目配置
echo "⚙️  初始化项目配置..."
yarn affine init

# 构建原生依赖（关键步骤）
echo "🔧 构建原生依赖..."
echo "   正在构建 @affine/server-native（这可能需要几分钟）..."

# 尝试构建原生模块
if ! yarn affine build -p @affine/server-native; then
    echo "❌ 原生模块构建失败"
    echo "💡 可能的解决方案："
    echo "   1. 确保Rust工具链正确安装"
    echo "   2. 重新启动终端: source ~/.cargo/env"
    echo "   3. 检查系统依赖是否完整"
    exit 1
fi

# 完整修复原生模块（创建所有架构文件）
echo "🔧 完整修复原生模块..."

# 进入native目录
cd packages/backend/native

# 检查基础文件是否存在
if [ -f "server-native.node" ]; then
    echo "✅ 找到基础原生模块: server-native.node"

    # 获取系统架构
    arch_name=$(uname -m)
    echo "📋 当前系统架构: $arch_name"

    # 创建所有可能需要的架构文件（webpack会尝试加载所有这些）
    echo "🔧 创建所有架构版本的原生模块..."

    # arm64 版本
    if [ ! -f "server-native.arm64.node" ]; then
        cp server-native.node server-native.arm64.node
        echo "✅ 创建了 server-native.arm64.node"
    else
        echo "✅ server-native.arm64.node 已存在"
    fi

    # x64 版本
    if [ ! -f "server-native.x64.node" ]; then
        cp server-native.node server-native.x64.node
        echo "✅ 创建了 server-native.x64.node"
    else
        echo "✅ server-native.x64.node 已存在"
    fi

    # armv7 版本
    if [ ! -f "server-native.armv7.node" ]; then
        cp server-native.node server-native.armv7.node
        echo "✅ 创建了 server-native.armv7.node"
    else
        echo "✅ server-native.armv7.node 已存在"
    fi

    echo "📂 所有原生模块文件:"
    ls -la *.node 2>/dev/null || echo "   无.node文件"

else
    echo "❌ 未找到 server-native.node 文件"
    echo "📂 native目录内容:"
    ls -la . 2>/dev/null || echo "   目录读取失败"
    exit 1
fi

# 回到项目根目录
cd "$PROJECT_DIR"

# 构建其他必要的包
echo "📚 构建核心包..."

# 构建reader包（修复正确路径）
if [ -d "packages/common/reader" ]; then
    echo "   构建 @affine/reader..."
    yarn affine build -p @affine/reader
else
    echo "   跳过 @affine/reader（不存在）"
fi

echo ""
echo "🏭 === 生产模式构建 ==="

# 构建前端应用
echo "🎨 构建前端应用..."
if ! yarn affine build -p @affine/web; then
    echo "❌ 主应用构建失败"
    exit 1
fi

# 构建Admin应用
echo "🛡️  构建Admin管理后台..."
if ! yarn affine build -p @affine/admin; then
    echo "❌ Admin应用构建失败"
    exit 1
fi

# 验证构建结果
if [ ! -d "packages/frontend/apps/web/dist" ]; then
    echo "❌ 主应用构建产物不存在"
    exit 1
fi

if [ ! -d "packages/frontend/admin/dist" ]; then
    echo "❌ Admin应用构建产物不存在"
    exit 1
fi

# 创建static目录并复制静态文件
echo "📋 设置静态文件..."
mkdir -p packages/backend/server/static

# 清空旧的静态文件
rm -rf packages/backend/server/static/*

# 复制静态文件
echo "📋 复制主应用静态文件..."
cp -r packages/frontend/apps/web/dist/* packages/backend/server/static/

# 复制Admin应用静态文件
echo "🛡️  复制Admin应用静态文件..."
mkdir -p packages/backend/server/static/admin
cp -r packages/frontend/admin/dist/* packages/backend/server/static/admin/

# 创建mobile目录和必要文件（v0.23.2+需要）
echo "📱 创建mobile版本占位文件..."
mkdir -p packages/backend/server/static/mobile

# 创建mobile assets-manifest.json
cat > packages/backend/server/static/mobile/assets-manifest.json << 'EOF'
{
  "publicPath": "/",
  "js": [],
  "css": [],
  "gitHash": "$(git --no-pager rev-parse --short HEAD)",
  "description": "AFFiNE Mobile Assets Manifest (Placeholder)"
}
EOF

# 创建mobile index.html
cat > packages/backend/server/static/mobile/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AFFiNE Mobile (Not Available)</title>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>AFFiNE Mobile</h1>
        <p>Mobile version is not available in this deployment.</p>
        <p>Please use the desktop version: <a href="/">Go to Desktop Version</a></p>
    </div>
</body>
</html>
EOF

# 验证静态文件
if [ ! -f "packages/backend/server/static/index.html" ]; then
    echo "❌ 主应用静态文件复制失败"
    exit 1
fi

if [ ! -d "packages/backend/server/static/admin" ] || [ -z "$(ls -A packages/backend/server/static/admin 2>/dev/null)" ]; then
    echo "❌ Admin应用静态文件复制失败"
    exit 1
fi

echo "✅ 所有静态文件设置完成"

# 构建后端（再次验证原生模块）
echo "⚙️  构建后端服务器..."
echo "   验证原生模块文件..."

# 最终检查所有原生模块文件
missing_files=()
for arch_file in "server-native.arm64.node" "server-native.x64.node" "server-native.armv7.node"; do
    if [ ! -f "packages/backend/native/$arch_file" ]; then
        missing_files+=("$arch_file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "❌ 缺少原生模块文件: ${missing_files[*]}"
    echo "🔧 正在修复..."
    cd packages/backend/native
    for missing_file in "${missing_files[@]}"; do
        if [ -f "server-native.node" ]; then
            cp server-native.node "$missing_file"
            echo "✅ 创建了 $missing_file"
        fi
    done
    cd "$PROJECT_DIR"
fi

# 开始构建后端
if ! yarn affine build -p @affine/server; then
    echo "❌ 后端构建失败"
    echo ""
    echo "🔍 调试信息:"
    echo "📂 native目录内容:"
    ls -la packages/backend/native/*.node 2>/dev/null || echo "   无.node文件"
    exit 1
fi

# 验证后端构建结果（修复路径 - 新版本输出为main.js）
backend_main_file=""
if [ -f "packages/backend/server/dist/main.js" ]; then
    backend_main_file="packages/backend/server/dist/main.js"
elif [ -f "packages/backend/server/dist/index.js" ]; then
    backend_main_file="packages/backend/server/dist/index.js"
fi

if [ -z "$backend_main_file" ]; then
    echo "❌ 后端构建产物不存在"
    echo "🔍 调试信息:"
    echo "📂 dist目录内容:"
    ls -la packages/backend/server/dist/ 2>/dev/null || echo "   dist目录不存在"
    exit 1
else
    echo "✅ 后端构建成功: $backend_main_file"
fi

# 创建PM2配置文件
echo "📦 创建PM2配置文件..."
app_name="affine-server"

cat > pm2.config.js << EOF
module.exports = {
  apps: [{
    name: '$app_name',
    script: '$backend_main_file',
    cwd: '$PROJECT_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: 3010
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# 创建日志目录
mkdir -p logs

echo "✅ PM2配置文件已创建: pm2.config.js"

echo ""
echo "🎉 === 生产构建完成！==="
echo ""

# 检查是否已有同名进程在运行
if pm2 describe "$app_name" > /dev/null 2>&1; then
    echo "⚠️  检测到已存在的PM2进程: $app_name"
    read -p "是否停止并重新启动? (y/N): " restart_choice
    if [[ "$restart_choice" =~ ^[Yy]$ ]]; then
        echo "🔄 停止旧进程..."
        pm2 stop "$app_name"
        pm2 delete "$app_name"
    else
        echo "📝 跳过启动，使用手动命令管理服务器"
        echo ""
        echo "🚀 PM2服务器管理命令："
        echo "============================="
        echo "🟢 启动服务器:"
        echo "     pm2 start pm2.config.js"
        echo ""
        echo "🔴 停止服务器:"
        echo "     pm2 stop $app_name"
        echo ""
        echo "🔄 重启服务器:"
        echo "     pm2 restart $app_name"
        echo ""
        echo "📈 查看状态:"
        echo "     pm2 status"
        echo "     pm2 monit"
        echo ""
        echo "📜 查看日志:"
        echo "     pm2 logs $app_name"
        echo "     pm2 logs $app_name --lines 100"
        echo ""
        echo "🗑️  删除服务:"
        echo "     pm2 delete $app_name"
        echo ""
        echo "🌐 访问地址: http://localhost:3010"
        echo "🛡️  管理后台: http://localhost:3010/admin"
        echo ""
        echo "📋 === 部署摘要 ==="
        echo "📍 项目目录: $PROJECT_DIR"
        echo "🏷️  应用名称: $app_name"
        echo "🕒 部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "✅ 部署完成！"
        exit 0
    fi
fi

echo "🚀 PM2服务器管理命令："
echo "============================="
echo "🟢 启动服务器:"
echo "     pm2 start pm2.config.js"
echo ""
echo "🔴 停止服务器:"
echo "     pm2 stop $app_name"
echo ""
echo "🔄 重启服务器:"
echo "     pm2 restart $app_name"
echo ""
echo "📈 查看状态:"
echo "     pm2 status"
echo "     pm2 monit"
echo ""
echo "📜 查看日志:"
echo "     pm2 logs $app_name"
echo "     pm2 logs $app_name --lines 100"
echo ""
echo "🗑️  删除服务:"
echo "     pm2 delete $app_name"
echo ""
echo "🔄 保存PM2配置（开机自启）:"
echo "     pm2 save"
echo "     pm2 startup"
echo ""
echo "🌐 访问地址: http://localhost:3010"
echo "🛡️  管理后台: http://localhost:3010/admin"
echo ""

# 提供快捷启动选项
if ! pm2 describe "$app_name" > /dev/null 2>&1; then
    echo ""
    read -p "🚀 是否现在启动AFFiNE服务器? (Y/n): " start_now
    if [[ "$start_now" =~ ^[Nn]$ ]]; then
        echo "ℹ️  使用 'pm2 start pm2.config.js' 来手动启动服务器"
    else
        echo "🚀 正在启动AFFiNE服务器..."
        if pm2 start pm2.config.js; then
            echo ""
            echo "✅ AFFiNE服务器启动成功！"
            echo "🌐 访问: http://localhost:3010"
            echo "🛡️  管理后台: http://localhost:3010/admin"
            echo "📈 状态: pm2 status"
            echo "📜 日志: pm2 logs $app_name"

            # 等待5秒后显示状态
            echo ""
            echo "⏳ 等待服务器启动..."
            sleep 5
            echo "📈 当前服务器状态:"
            pm2 status
        else
            echo "❌ 服务器启动失败，请检查错误日志: pm2 logs $app_name"
        fi
    fi
fi

echo ""
echo "📋 === 部署摘要 ==="
echo "📍 项目目录: $PROJECT_DIR"
echo "🏷️  应用名称: $app_name"
echo "📋 当前分支: $(git branch --show-current)"
echo "📋 当前提交: $(git --no-pager rev-parse --short HEAD)"
echo "🕒 部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "✅ 部署完成！"
