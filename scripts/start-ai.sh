#!/bin/bash

# Chatlog Web AI服务启动脚本
# 这个脚本会同时启动前端Vue应用和后端AI服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印彩色日志
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# 检查依赖
check_dependencies() {
    log_step "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 16.0 或更高版本"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    log_info "Node.js 版本: $NODE_VERSION"
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    log_success "系统依赖检查通过"
}

# 检查环境配置
check_environment() {
    log_step "检查环境配置..."
    
    # 检查统一配置文件
    if [ ! -f "packages/config/.env.example" ]; then
        log_error "统一配置模板不存在，请检查packages/config/.env.example文件"
        exit 1
    fi
    
    # 检查.env文件
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，正在创建示例配置..."
        cp packages/config/.env.example .env
        log_warning "请编辑 .env 文件，填入正确的API密钥和配置"
    fi
    
    # 从.env文件读取配置
    if [ -f ".env" ]; then
        set -a; source .env; set +a
    fi
    
    # 检查Chatlog服务
    CHATLOG_URL="http://${CHATLOG_HOST:-127.0.0.1}:${CHATLOG_PORT:-5030}"
    log_info "检查Chatlog服务连接: $CHATLOG_URL"
    if curl -s "$CHATLOG_URL/api/v1/session" > /dev/null; then
        log_success "Chatlog服务连接正常"
    else
        log_warning "无法连接到Chatlog服务($CHATLOG_URL)，请确保chatlog服务已启动"
        log_info "启动命令: chatlog server"
    fi
}

# 安装依赖
install_dependencies() {
    log_step "安装项目依赖..."
    
    # 安装前端依赖
    if [ ! -d "apps/frontend/node_modules" ]; then
        log_info "安装前端依赖..."
        cd apps/frontend
        npm install
        cd ../..
        log_success "前端依赖安装完成"
    else
        log_info "前端依赖已存在，跳过安装"
    fi
    
    # 安装后端依赖
    if [ ! -d "apps/ai-service/node_modules" ]; then
        log_info "安装后端AI服务依赖..."
        cd apps/ai-service
        npm install
        cd ../..
        log_success "后端依赖安装完成"
    else
        log_info "后端依赖已存在，跳过安装"
    fi
}

# 启动服务
start_services() {
    log_step "启动Chatlog Web AI服务..."
    
    # 从.env文件读取配置
    if [ -f ".env" ]; then
        set -a; source .env; set +a
    fi
    
    # 创建必要的目录
    mkdir -p apps/ai-service/storage/analysis_history
    mkdir -p apps/ai-service/config
    
    # 复制环境变量到ai-service目录
    cp .env apps/ai-service/.env
    
    # 显示启动信息
    echo
    echo "=================================="
    echo "🤖 Chatlog Web AI 服务启动中..."
    echo "=================================="
    echo "前端地址: http://localhost:${FRONTEND_PORT:-8080}"
    echo "AI服务: http://localhost:${AI_PORT:-3001}"
    echo "Chatlog API: http://${CHATLOG_HOST:-127.0.0.1}:${CHATLOG_PORT:-5030}"
    echo "=================================="
    echo
    
    # 使用并发方式启动前端和后端
    if command -v concurrently &> /dev/null; then
        # 如果有concurrently，使用它
        npx concurrently \
            --names "🎨前端,🤖AI服务" \
            --prefix "[{name}]" \
            --prefix-colors "cyan,magenta" \
            "cd apps/frontend && npm run serve" \
            "cd apps/ai-service && npm start"
    else
        # 否则手动启动
        log_info "建议安装 concurrently 以获得更好的并发体验: npm install -g concurrently"
        echo
        log_info "启动前端服务..."
        cd apps/frontend && npm run serve &
        FRONTEND_PID=$!
        cd ../..
        
        log_info "启动AI后端服务..."
        cd apps/ai-service && npm start &
        BACKEND_PID=$!
        cd ../..
        
        # 等待用户中断
        wait $FRONTEND_PID $BACKEND_PID
    fi
}

# 开发模式启动
dev_mode() {
    log_step "开发模式启动..."
    
    # 创建开发环境的环境变量
    if [ ! -f "server/.env" ]; then
        cp .env.ai server/.env
    fi
    
    # 使用nodemon启动后端
    if command -v concurrently &> /dev/null; then
        npx concurrently \
            --names "🎨前端,🤖AI服务" \
            --prefix "[{name}]" \
            --prefix-colors "cyan,magenta" \
            "npm run serve" \
            "cd server && npm run dev"
    else
        npm run serve &
        cd server && npm run dev &
        wait
    fi
}

# 帮助信息
show_help() {
    echo "Chatlog Web AI服务启动脚本"
    echo
    echo "使用方法:"
    echo "  ./start-ai.sh [选项]"
    echo
    echo "选项:"
    echo "  --dev        开发模式启动（使用nodemon热重载）"
    echo "  --check      仅检查环境和依赖"
    echo "  --install    仅安装依赖"
    echo "  --help       显示此帮助信息"
    echo
    echo "首次使用:"
    echo "  1. 确保chatlog服务已启动: chatlog server"
    echo "  2. 编辑.env.ai文件，配置AI模型API密钥"
    echo "  3. 运行: ./start-ai.sh"
    echo
}

# 主函数
main() {
    echo
    echo "🤖 Chatlog Web AI 集成服务"
    echo "=========================="
    echo
    
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --check)
            check_dependencies
            check_environment
            log_success "环境检查完成"
            exit 0
            ;;
        --install)
            check_dependencies
            install_dependencies
            log_success "依赖安装完成"
            exit 0
            ;;
        --dev)
            check_dependencies
            check_environment
            install_dependencies
            dev_mode
            ;;
        *)
            check_dependencies
            check_environment
            install_dependencies
            start_services
            ;;
    esac
}

# 优雅退出处理
cleanup() {
    log_info "正在关闭服务..."
    # 杀死所有子进程
    jobs -p | xargs -r kill
    log_success "服务已关闭"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 运行主函数
main "$@"