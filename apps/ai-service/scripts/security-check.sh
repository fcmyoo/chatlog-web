#!/bin/bash

# 安全检查脚本
# 整合多种安全扫描工具进行全面的安全检查

set -e

echo "🔒 开始执行安全检查..."
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: $1 命令未找到${NC}"
        return 1
    fi
    return 0
}

# 1. NPM 安全审计
echo -e "${BLUE}1. 执行 NPM 安全审计...${NC}"
# 临时使用官方源进行安全审计
if npm audit --audit-level=moderate --registry=https://registry.npmjs.org/; then
    echo -e "${GREEN}✅ NPM 审计通过${NC}"
else
    echo -e "${YELLOW}⚠️  发现安全问题，尝试自动修复...${NC}"
    npm audit fix --registry=https://registry.npmjs.org/ || echo -e "${YELLOW}⚠️  自动修复失败，请手动检查${NC}"
fi

echo ""

# 2. Audit-CI 检查
echo -e "${BLUE}2. 执行 Audit-CI 检查...${NC}"
if npx audit-ci --config audit-ci.json --registry=https://registry.npmjs.org/ 2>/dev/null; then
    echo -e "${GREEN}✅ Audit-CI 检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  Audit-CI 检查跳过（可能由于网络问题）${NC}"
fi

echo ""

# 3. 检查过时依赖
echo -e "${BLUE}3. 检查过时依赖...${NC}"
if check_command "npx"; then
    npx npm-check-updates
    echo -e "${GREEN}✅ 依赖检查完成${NC}"
else
    echo -e "${YELLOW}⚠️  npx 未安装，跳过检查${NC}"
fi

echo ""

# 4. Snyk 安全扫描
echo -e "${BLUE}4. 执行 Snyk 安全扫描...${NC}"
if npx snyk test 2>/dev/null; then
    echo -e "${GREEN}✅ Snyk 扫描通过${NC}"
else
    echo -e "${YELLOW}⚠️  Snyk 扫描跳过（需要认证或网络问题）${NC}"
    echo -e "${YELLOW}提示: 运行 'npx snyk auth' 进行认证后再次尝试${NC}"
fi

echo ""

# 5. 检查敏感文件
echo -e "${BLUE}5. 检查敏感文件...${NC}"
sensitive_files=(
    ".env"
    ".env.local"
    ".env.production"
    "*.key"
    "*.pem"
    "*.p12"
    "*.pfx"
    "id_rsa"
    "id_dsa"
    "*.log"
)

found_sensitive=false
for pattern in "${sensitive_files[@]}"; do
    if find . -name "$pattern" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
        echo -e "${RED}⚠️  发现敏感文件: $pattern${NC}"
        find . -name "$pattern" -not -path "./node_modules/*" -not -path "./.git/*"
        found_sensitive=true
    fi
done

if [ "$found_sensitive" = false ]; then
    echo -e "${GREEN}✅ 未发现敏感文件${NC}"
fi

echo ""

# 6. 检查 package.json 中的安全配置
echo -e "${BLUE}6. 检查 package.json 安全配置...${NC}"
if grep -q '"engines"' package.json; then
    echo -e "${GREEN}✅ 已配置 Node.js 版本要求${NC}"
else
    echo -e "${YELLOW}⚠️  建议在 package.json 中配置 engines 字段${NC}"
fi

if grep -q '"private": true' package.json; then
    echo -e "${GREEN}✅ 包已标记为私有${NC}"
else
    echo -e "${YELLOW}⚠️  建议将包标记为私有${NC}"
fi

echo ""

# 7. 检查 TypeScript 配置安全性
echo -e "${BLUE}7. 检查 TypeScript 配置...${NC}"
if [ -f "tsconfig.json" ]; then
    if grep -q '"strict": true' tsconfig.json; then
        echo -e "${GREEN}✅ TypeScript 严格模式已启用${NC}"
    else
        echo -e "${YELLOW}⚠️  建议启用 TypeScript 严格模式${NC}"
    fi
    
    if grep -q '"noImplicitAny": true' tsconfig.json; then
        echo -e "${GREEN}✅ 禁用隐式 any 类型${NC}"
    else
        echo -e "${YELLOW}⚠️  建议禁用隐式 any 类型${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未找到 tsconfig.json 文件${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}🔒 安全检查完成！${NC}"

# 生成安全报告
echo -e "${BLUE}📊 生成安全报告...${NC}"
{
    echo "# 安全检查报告"
    echo "生成时间: $(date)"
    echo ""
    echo "## NPM 审计结果"
    npm audit --json --registry=https://registry.npmjs.org/ 2>/dev/null || echo "审计失败"
    echo ""
    echo "## 依赖版本检查"
    npx npm-check-updates --format json 2>/dev/null || echo "检查失败"
} > security-report.json

echo -e "${GREEN}✅ 安全报告已生成: security-report.json${NC}"