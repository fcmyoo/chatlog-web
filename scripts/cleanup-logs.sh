#!/bin/bash

# AI服务日志清理脚本
# 定期清理过期的分析历史和日志文件

LOG_DIR="/mnt/e/code/GitHub/chatlog-web/apps/ai-service/logs"
STORAGE_DIR="/mnt/e/code/GitHub/chatlog-web/apps/ai-service/storage/analysis_history"

echo "🧹 开始清理AI服务日志和存储..."

# 清理7天前的日志文件
if [ -d "$LOG_DIR" ]; then
    find "$LOG_DIR" -name "*.log.*" -mtime +7 -delete
    echo "✅ 已清理7天前的日志文件"
fi

# 清理30天前的分析历史文件
if [ -d "$STORAGE_DIR" ]; then
    find "$STORAGE_DIR" -name "*.json" -mtime +30 -delete
    echo "✅ 已清理30天前的分析历史文件"
fi

# 显示当前存储使用情况
echo "📊 当前存储使用情况:"
du -sh "$LOG_DIR" 2>/dev/null || echo "日志目录不存在"
du -sh "$STORAGE_DIR" 2>/dev/null || echo "存储目录不存在"

echo "🎉 日志清理完成"