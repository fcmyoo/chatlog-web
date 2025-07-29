#!/bin/bash

# 测试覆盖率报告生成脚本
# 生成综合测试覆盖率报告，包含单元测试和集成测试

echo "🧪 开始生成测试覆盖率报告..."

# 创建覆盖率报告目录
mkdir -p coverage

# 清理之前的覆盖率数据
echo "🧹 清理之前的覆盖率数据..."
rm -rf coverage/*

# 运行单元测试并生成覆盖率
echo "📊 运行单元测试并生成覆盖率..."
npm run test:coverage -- --reporter=verbose

# 检查覆盖率阈值
if [ $? -eq 0 ]; then
    echo "✅ 单元测试覆盖率达到要求"
else
    echo "❌ 单元测试覆盖率未达到要求"
    echo "请检查以下文件的测试覆盖率:"
    echo "- 函数覆盖率应 >= 80%"
    echo "- 语句覆盖率应 >= 80%"
    echo "- 分支覆盖率应 >= 80%"
    echo "- 行覆盖率应 >= 80%"
fi

# 生成详细的HTML报告
echo "📋 生成HTML覆盖率报告..."
echo "HTML报告位置: ./coverage/index.html"

# 生成覆盖率摘要
echo "📈 生成覆盖率摘要..."
echo "==================== 测试覆盖率摘要 ====================" > coverage/summary.txt
echo "生成时间: $(date)" >> coverage/summary.txt
echo "项目: Chatlog Web Frontend" >> coverage/summary.txt
echo "" >> coverage/summary.txt

# 如果有lcov报告，生成徽章数据
if [ -f "coverage/lcov.info" ]; then
    echo "🏆 生成覆盖率徽章数据..."
    
    # 提取覆盖率百分比（简化版本）
    if command -v lcov >/dev/null 2>&1; then
        COVERAGE_PERCENT=$(lcov --summary coverage/lcov.info 2>/dev/null | grep "lines" | grep -o '[0-9.]*%' | head -1)
        echo "当前覆盖率: $COVERAGE_PERCENT" >> coverage/summary.txt
    fi
fi

# 列出覆盖率不足的文件
echo "" >> coverage/summary.txt
echo "需要改进覆盖率的文件:" >> coverage/summary.txt
echo "查看 HTML 报告获取详细信息" >> coverage/summary.txt

# 显示摘要
cat coverage/summary.txt

echo ""
echo "🎉 测试覆盖率报告生成完成!"
echo "📂 查看详细报告:"
echo "   - HTML报告: open coverage/index.html"
echo "   - JSON报告: coverage/coverage-final.json"
echo "   - 文本摘要: coverage/summary.txt"
echo ""

# 在浏览器中打开HTML报告（可选）
if command -v xdg-open >/dev/null 2>&1; then
    echo "正在尝试打开HTML报告..."
    xdg-open coverage/index.html >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
    echo "正在尝试打开HTML报告..."
    open coverage/index.html >/dev/null 2>&1 || true
fi