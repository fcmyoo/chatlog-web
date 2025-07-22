<template>
  <div class="analytics">
    <!-- 数据总览卡片 -->
    <div class="analytics-header">
      <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.1s;">
        <div class="stat-icon gradient-1">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <h3>{{ totalMessages.toLocaleString() }}</h3>
          <p>总消息数</p>
          <span class="stat-trend" :class="totalMessages > 0 ? 'up' : 'neutral'">
            {{ totalMessages > 0 ? '✓ 已加载' : '⏳ 加载中' }}
          </span>
        </div>
      </div>
      
      <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.2s;">
        <div class="stat-icon gradient-2">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <h3>{{ activeUsers }}</h3>
          <p>活跃用户</p>
          <span class="stat-trend" :class="activeUsers > 0 ? 'up' : 'neutral'">
            {{ activeUsers > 0 ? '✓ 已分析' : '⏳ 分析中' }}
          </span>
        </div>
      </div>
      
      <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.3s;">
        <div class="stat-icon gradient-3">
          <el-icon><ChatRound /></el-icon>
        </div>
        <div class="stat-content">
          <h3>{{ averageDaily }}</h3>
          <p>日均消息</p>
          <span class="stat-trend" :class="averageDaily > 0 ? 'up' : 'neutral'">
            {{ averageDaily > 0 ? '✓ 已计算' : '⏳ 计算中' }}
          </span>
        </div>
      </div>
      
      <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.4s;">
        <div class="stat-icon gradient-4">
          <el-icon><PieChart /></el-icon>
        </div>
        <div class="stat-content">
          <h3>{{ responseRate }}%</h3>
          <p>响应率</p>
          <span class="stat-trend" :class="responseRate > 0 ? 'up' : 'neutral'">
            {{ responseRate > 0 ? '✓ 已完成' : '⏳ 处理中' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <!-- 消息趋势图 -->
      <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.5s;">
        <div class="chart-header">
          <h3>消息趋势分析</h3>
          <div class="chart-controls">
            <el-radio-group v-model="trendPeriod" size="small" @change="updateTrendChart">
              <el-radio-button label="7d">7天</el-radio-button>
              <el-radio-button label="30d">30天</el-radio-button>
              <el-radio-button label="90d">90天</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="trendChartOption" 
            style="height: 400px;"
            :loading="chartLoading"
          />
        </div>
      </div>

      <!-- 用户活跃度热力图 -->
      <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.6s;">
        <div class="chart-header">
          <h3>用户活跃度热力图</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="heatmapOption" 
            style="height: 400px;"
            :loading="chartLoading"
          />
        </div>
      </div>

      <!-- 聊天类型分布 -->
      <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.7s;">
        <div class="chart-header">
          <h3>聊天类型分布</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="pieChartOption" 
            style="height: 400px;"
            :loading="chartLoading"
          />
        </div>
      </div>

      <!-- 词云图 -->
      <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.8s;">
        <div class="chart-header">
          <h3>高频词汇</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="wordCloudOption" 
            style="height: 400px;"
            :loading="chartLoading"
          />
        </div>
      </div>

      <!-- 时间分布图 -->
      <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.9s;">
        <div class="chart-header">
          <h3>24小时聊天活跃度</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="timeDistributionOption" 
            style="height: 400px;"
            :loading="chartLoading"
          />
        </div>
      </div>

      <!-- 群聊活跃度排行 -->
      <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 1.0s;">
        <div class="chart-header">
          <h3>群聊活跃度排行</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="groupRankingOption" 
            style="height: 400px;"
            :loading="chartLoading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  HeatmapChart,
  ScatterChart
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import api from '@/api'
import { ElMessage } from 'element-plus'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  HeatmapChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent
])

export default {
  name: 'Analytics',
  components: {
    VChart
  },
  setup() {
    const chartLoading = ref(true)
    const trendPeriod = ref('30d')
    
    // 统计数据
    const totalMessages = ref(0)
    const activeUsers = ref(0)
    const averageDaily = ref(0)
    const responseRate = ref(0)
    
    // 原始数据
    const allChatLogs = ref([])
    const contacts = ref([])
    const chatrooms = ref([])
    const sessions = ref([])

    // 消息趋势图
    const trendChartOption = ref({
      backgroundColor: 'transparent',
      title: {
        text: '消息量趋势',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [],
        axisLine: {
          lineStyle: {
            color: '#e1e8f0'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#e1e8f0'
          }
        }
      },
      series: [
        {
          name: '消息数',
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                {
                  offset: 0,
                  color: '#409eff'
                },
                {
                  offset: 1,
                  color: '#67c23a'
                }
              ]
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(64, 158, 255, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(64, 158, 255, 0.05)'
                }
              ]
            }
          },
          data: []
        }
      ]
    })

    // 用户活跃度热力图
    const heatmapOption = ref({
      backgroundColor: 'transparent',
      title: {
        text: '用户活跃度热力图',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        }
      },
      grid: {
        height: '50%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: ['周日', '周六', '周五', '周四', '周三', '周二', '周一'],
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%',
        inRange: {
          color: ['#e0f3ff', '#409eff', '#1890ff', '#096dd9']
        }
      },
      series: [
        {
          name: '活跃度',
          type: 'heatmap',
          data: [],
          label: {
            show: true
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    })

    // 饼图配置
    const pieChartOption = ref({
      backgroundColor: 'transparent',
      title: {
        text: '聊天类型分布',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        },
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '5%',
        left: 'center'
      },
      series: [
        {
          name: '聊天类型',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 30,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 1048, name: '文本消息', itemStyle: { color: '#409eff' } },
            { value: 735, name: '图片', itemStyle: { color: '#67c23a' } },
            { value: 580, name: '语音', itemStyle: { color: '#e6a23c' } },
            { value: 484, name: '视频', itemStyle: { color: '#f56c6c' } },
            { value: 300, name: '文件', itemStyle: { color: '#909399' } }
          ]
        }
      ]
    })

    // 词云图（使用散点图模拟）
    const wordCloudOption = ref({
      backgroundColor: 'transparent',
      title: {
        text: '高频词汇',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        show: false
      },
      yAxis: {
        show: false
      },
      series: [
        {
          type: 'scatter',
          symbolSize: function (data) {
            return Math.sqrt(data[2]) * 5
          },
          label: {
            show: true,
            formatter: function (param) {
              return param.data[3]
            },
            color: '#409eff',
            fontSize: function (param) {
              return Math.sqrt(param.data[2]) * 2 + 10
            }
          },
          itemStyle: {
            opacity: 0
          },
          data: [
            [10, 20, 50, '聊天'],
            [30, 40, 40, '工作'],
            [50, 60, 35, '学习'],
            [70, 30, 30, '生活'],
            [20, 70, 25, '娱乐'],
            [80, 80, 20, '技术'],
            [60, 20, 45, '项目'],
            [40, 80, 35, '会议']
          ]
        }
      ]
    })

    // 时间分布图 - 改为横向柱状图
    const timeDistributionOption = ref({
      backgroundColor: 'transparent',
      title: {
        text: '24小时聊天分布',
        left: 'center',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        },
        formatter: '{b}: {c}条消息'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['0时', '2时', '4时', '6时', '8时', '10时', '12时', '14时', '16时', '18时', '20时', '22时'],
        axisLine: {
          lineStyle: {
            color: '#e1e8f0'
          }
        },
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '消息数量',
        axisLine: {
          lineStyle: {
            color: '#e1e8f0'
          }
        }
      },
      series: [
        {
          type: 'bar',
          data: [15, 8, 5, 12, 45, 65, 80, 85, 70, 75, 90, 60],
          name: '消息数量',
          barWidth: '60%',
          itemStyle: {
            color: function (params) {
              const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#c45656']
              return colors[params.dataIndex % colors.length]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    })

    // 群聊活跃度排行
    const groupRankingOption = ref({
      backgroundColor: 'transparent',
      title: {
        text: '群聊活跃度TOP10',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#e1e8f0'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: ['技术讨论群', '项目组', '同事聊天', '前端小组', '产品讨论', '设计团队', '测试组', '运营群', '管理层', 'HR群'],
        axisLine: {
          lineStyle: {
            color: '#e1e8f0'
          }
        }
      },
      series: [
        {
          name: '消息数',
          type: 'bar',
          data: [2847, 2156, 1998, 1875, 1654, 1432, 1298, 1156, 998, 876],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                {
                  offset: 0,
                  color: '#409eff'
                },
                {
                  offset: 1,
                  color: '#67c23a'
                }
              ]
            }
          }
        }
      ]
    })

    // 更新趋势图
    const updateTrendChart = () => {
      if (allChatLogs.value.length > 0) {
        generateTrendData(allChatLogs.value)
      }
    }

    // 获取基础数据
    const fetchBasicData = async () => {
      try {
        const [contactsRes, chatroomsRes, sessionsRes] = await Promise.all([
          api.getContacts(),
          api.getChatrooms(), 
          api.getSessions()
        ])
        
        contacts.value = contactsRes.data || []
        chatrooms.value = chatroomsRes.data || []
        sessions.value = sessionsRes.data || []
        
        console.log('基础数据获取成功:', {
          contacts: contacts.value.length,
          chatrooms: chatrooms.value.length, 
          sessions: sessions.value.length
        })
      } catch (error) {
        console.error('获取基础数据失败:', error)
        ElMessage.error('获取基础数据失败: ' + error.message)
      }
    }

    // 获取聊天记录数据
    const fetchChatLogsData = async () => {
      try {
        // 获取最近90天的数据用于分析
        const endDate = dayjs()
        const startDate = endDate.subtract(90, 'day')
        
        const allLogs = []
        
        // 获取所有活跃会话的聊天记录
        const activeSessions = sessions.value.slice(0, 10) // 取前10个会话
        
        for (const session of activeSessions) {
          try {
            const response = await api.getChatLogs({
              talker: session.id || session.name,
              time: `${startDate.format('YYYY-MM-DD')}~${endDate.format('YYYY-MM-DD')}`,
              limit: 1000
            })
            
            if (response.data && Array.isArray(response.data)) {
              allLogs.push(...response.data.map(log => ({
                ...log,
                talker: session.name || session.id,
                talkerId: session.id
              })))
            }
          } catch (error) {
            console.warn(`获取会话 ${session.name} 聊天记录失败:`, error.message)
          }
        }
        
        allChatLogs.value = allLogs
        console.log('聊天记录数据获取成功:', allLogs.length, '条记录')
        
        return allLogs
      } catch (error) {
        console.error('获取聊天记录失败:', error)
        ElMessage.error('获取聊天记录失败: ' + error.message)
        return []
      }
    }

    // 分析数据并更新统计信息
    const analyzeData = (chatLogs) => {
      if (!chatLogs || chatLogs.length === 0) {
        return
      }

      // 总消息数
      totalMessages.value = chatLogs.length
      
      // 活跃用户数（去重发送者）
      const uniqueSenders = new Set(chatLogs.map(log => log.senderId || log.senderName))
      activeUsers.value = uniqueSenders.size
      
      // 计算日均消息数
      const daysSpan = 90 // 90天数据
      averageDaily.value = Math.round(chatLogs.length / daysSpan)
      
      // 模拟响应率计算（基于消息分布）
      responseRate.value = Math.min(95, Math.max(60, Math.round((uniqueSenders.size / Math.max(1, sessions.value.length)) * 100)))
    }

    // 生成趋势图数据
    const generateTrendData = (chatLogs) => {
      const days = trendPeriod.value === '7d' ? 7 : trendPeriod.value === '30d' ? 30 : 90
      const dates = []
      const data = []
      const dailyCount = {}
      
      // 统计每日消息数
      chatLogs.forEach(log => {
        const date = dayjs(log.time).format('YYYY-MM-DD')
        dailyCount[date] = (dailyCount[date] || 0) + 1
      })
      
      // 生成指定天数的数据
      for (let i = days - 1; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day')
        const dateStr = date.format('YYYY-MM-DD')
        const displayDate = date.format('MM-DD')
        
        dates.push(displayDate)
        data.push(dailyCount[dateStr] || 0)
      }
      
      trendChartOption.value.xAxis.data = dates
      trendChartOption.value.series[0].data = data
    }

    // 生成热力图数据
    const generateHeatmapData = (chatLogs) => {
      const heatData = {}
      
      // 统计每小时每天的消息数
      chatLogs.forEach(log => {
        const time = dayjs(log.time)
        const hour = Math.floor(time.hour() / 2) * 2 // 每2小时一个时间段
        const day = time.day() // 0=周日, 1=周一...
        
        const key = `${hour}-${day}`
        heatData[key] = (heatData[key] || 0) + 1
      })
      
      // 转换为ECharts热力图格式
      const data = []
      const maxValue = Math.max(...Object.values(heatData), 1)
      
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 12; hour++) {
          const actualHour = hour * 2
          const value = heatData[`${actualHour}-${day}`] || 0
          const normalizedValue = Math.round((value / maxValue) * 100)
          data.push([hour, day, normalizedValue])
        }
      }
      
      heatmapOption.value.series[0].data = data
    }

    // 生成聊天类型分布数据
    const generateTypeDistribution = (chatLogs) => {
      const typeCount = {
        text: 0,
        image: 0, 
        voice: 0,
        video: 0,
        file: 0
      }
      
      chatLogs.forEach(log => {
        const content = log.content || ''
        if (content.includes('[图片]') || content.includes('image')) {
          typeCount.image++
        } else if (content.includes('[语音]') || content.includes('voice')) {
          typeCount.voice++
        } else if (content.includes('[视频]') || content.includes('video')) {
          typeCount.video++
        } else if (content.includes('[文件]') || content.includes('file')) {
          typeCount.file++
        } else {
          typeCount.text++
        }
      })
      
      pieChartOption.value.series[0].data = [
        { value: typeCount.text, name: '文本消息', itemStyle: { color: '#409eff' } },
        { value: typeCount.image, name: '图片', itemStyle: { color: '#67c23a' } },
        { value: typeCount.voice, name: '语音', itemStyle: { color: '#e6a23c' } },
        { value: typeCount.video, name: '视频', itemStyle: { color: '#f56c6c' } },
        { value: typeCount.file, name: '文件', itemStyle: { color: '#909399' } }
      ]
    }

    // 生成时间分布数据
    const generateTimeDistribution = (chatLogs) => {
      const timeCount = new Array(12).fill(0) // 0时-22时，每2小时一个时间段
      
      chatLogs.forEach(log => {
        const hour = dayjs(log.time).hour()
        const timeSlot = Math.floor(hour / 2)
        if (timeSlot < 12) {
          timeCount[timeSlot]++
        }
      })
      
      timeDistributionOption.value.series[0].data = timeCount
    }

    // 生成群聊排行数据
    const generateGroupRanking = (chatLogs) => {
      const groupCount = {}
      const groupNames = []
      
      chatLogs.forEach(log => {
        const talker = log.talker || log.talkerId || '未知群聊'
        groupCount[talker] = (groupCount[talker] || 0) + 1
      })
      
      // 排序并取前10
      const sortedGroups = Object.entries(groupCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
      
      const names = sortedGroups.map(([name]) => name)
      const data = sortedGroups.map(([,count]) => count)
      
      groupRankingOption.value.yAxis.data = names
      groupRankingOption.value.series[0].data = data
    }

    // 生成词云数据
    const generateWordCloudData = (chatLogs) => {
      const words = {}
      const commonWords = ['的', '了', '是', '我', '你', '他', '她', '在', '有', '和', '也', '不', '就', '都', '要', '会', '这', '那', '一个', '什么', '怎么', '可以', '好的', '知道', '没有', '觉得', '应该']
      
      chatLogs.forEach(log => {
        const content = log.content || ''
        // 简单的中文分词（实际项目中建议使用专业分词库）
        const chars = content.replace(/[^\u4e00-\u9fa5]/g, '')
        for (let i = 0; i < chars.length - 1; i++) {
          const word = chars.substr(i, 2)
          if (word.length === 2 && !commonWords.includes(word)) {
            words[word] = (words[word] || 0) + 1
          }
        }
      })
      
      // 取前8个高频词
      const sortedWords = Object.entries(words)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
      
      const wordCloudData = sortedWords.map(([word, count], index) => [
        Math.random() * 100, // x位置
        Math.random() * 100, // y位置  
        count, // 词频
        word // 词汇
      ])
      
      wordCloudOption.value.series[0].data = wordCloudData
    }

    // 更新所有图表数据
    const updateAllCharts = (chatLogs) => {
      if (!chatLogs || chatLogs.length === 0) {
        ElMessage.warning('暂无聊天记录数据')
        return
      }
      
      analyzeData(chatLogs)
      generateTrendData(chatLogs)
      generateHeatmapData(chatLogs) 
      generateTypeDistribution(chatLogs)
      generateTimeDistribution(chatLogs)
      generateGroupRanking(chatLogs)
      generateWordCloudData(chatLogs)
    }

    onMounted(async () => {
      chartLoading.value = true
      
      try {
        // 1. 获取基础数据（联系人、群聊、会话）
        await fetchBasicData()
        
        // 2. 获取聊天记录数据
        const chatLogs = await fetchChatLogsData()
        
        // 3. 分析数据并更新图表
        updateAllCharts(chatLogs)
        
        console.log('数据分析完成')
        
      } catch (error) {
        console.error('加载分析数据失败:', error)
        ElMessage.error('加载数据失败，请检查后端服务是否正常运行')
      } finally {
        chartLoading.value = false
      }
    })

    return {
      chartLoading,
      trendPeriod,
      totalMessages,
      activeUsers,
      averageDaily,
      responseRate,
      trendChartOption,
      heatmapOption,
      pieChartOption,
      wordCloudOption,
      timeDistributionOption,
      groupRankingOption,
      updateTrendChart
    }
  }
}
</script>

<style scoped>
.analytics {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 80px);
}

.analytics-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(45deg, #409eff, #67c23a);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.gradient-1 {
  background: linear-gradient(45deg, #409eff, #67c23a);
}

.gradient-2 {
  background: linear-gradient(45deg, #67c23a, #e6a23c);
}

.gradient-3 {
  background: linear-gradient(45deg, #e6a23c, #f56c6c);
}

.gradient-4 {
  background: linear-gradient(45deg, #f56c6c, #909399);
}

.stat-content h3 {
  margin: 0 0 5px 0;
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-content p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
}

.stat-trend {
  font-size: 12px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
}

.stat-trend.up {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.stat-trend.down {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.stat-trend.neutral {
  color: #909399;
  background: rgba(144, 147, 153, 0.1);
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 15px;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-controls {
  display: flex;
  gap: 10px;
}

.chart-content {
  position: relative;
}

/* 动画样式 */
@import 'animate.css';

/* 响应式设计 */
@media (max-width: 768px) {
  .analytics-header {
    grid-template-columns: 1fr;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 20px;
  }
  
  .chart-card {
    padding: 20px;
  }
}
</style> 