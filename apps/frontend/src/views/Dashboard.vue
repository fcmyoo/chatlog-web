<template>
  <div class="dashboard">
    <div class="stats-cards">
      <div class="stats-card">
        <div class="stats-icon">
          <el-icon><User /></el-icon>
        </div>
        <div class="stats-content">
          <h3>{{ contactsCount }}</h3>
          <p>联系人总数</p>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">
          <el-icon><UserFilled /></el-icon>
        </div>
        <div class="stats-content">
          <h3>{{ chatroomsCount }}</h3>
          <p>群聊总数</p>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">
          <el-icon><Message /></el-icon>
        </div>
        <div class="stats-content">
          <h3>{{ sessionsCount }}</h3>
          <p>会话总数</p>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="stats-content">
          <h3>{{ activeSessions }}</h3>
          <p>最近活跃会话数</p>
        </div>
      </div>
    </div>

    <!-- 数据可视化卡片 -->
    <div class="chart-overview">
      <div class="card chart-card">
        <div class="card-header">
          <h3>7天消息趋势</h3>
          <el-button
            link
            @click="$router.push('/analytics')"
            style="color: #409eff"
          >
            查看详细分析 →
          </el-button>
        </div>
        <div class="card-body">
          <v-chart
            :option="trendChartOption"
            style="height: 200px;"
            :loading="chartLoading"
          />
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <h3>聊天类型分布</h3>
        </div>
        <div class="card-body">
          <v-chart
            :option="pieChartOption"
            style="height: 200px;"
            :loading="chartLoading"
          />
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="card">
        <div class="card-header">
          <h3>最近会话</h3>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else>
            <div
              v-for="session in recentSessions"
              :key="session.id"
              class="session-item"
            >
              <div class="session-avatar">
                <el-avatar :size="40">
                  {{ session.name ? session.name.charAt(0) : '?' }}
                </el-avatar>
              </div>
              <div class="session-info">
                <div class="session-name">{{ session.name || '未知' }}</div>
                <div class="session-time">{{ formatTime(session.lastMessageTime) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>快速操作</h3>
        </div>
        <div class="card-body">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-button
                type="primary"
                size="large"
                @click="$router.push('/chatlog')"
                style="width: 100%"
              >
                <el-icon><ChatDotRound /></el-icon>
                查看聊天记录
              </el-button>
            </el-col>
            <el-col :span="8">
              <el-button
                type="success"
                size="large"
                @click="$router.push('/analytics')"
                style="width: 100%"
              >
                <el-icon><TrendCharts /></el-icon>
                数据分析
              </el-button>
            </el-col>
            <el-col :span="8">
              <el-button
                type="warning"
                size="large"
                @click="$router.push('/media')"
                style="width: 100%"
              >
                <el-icon><Picture /></el-icon>
                多媒体文件
              </el-button>
            </el-col>
          </el-row>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import dayjs from 'dayjs'
import api from '@/api'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

export default {
  name: 'Dashboard',
  components: {
    VChart
  },
  setup () {
    const store = useStore()
    const recentChatLogsCount = ref(0)
    const statsLoading = ref(false)
    const chartLoading = ref(true)

    const loading = computed(() => store.getters.isLoading || statsLoading.value)
    const contacts = computed(() => store.getters.getContacts)
    const chatrooms = computed(() => store.getters.getChatrooms)
    const sessions = computed(() => store.getters.getSessions)

    const contactsCount = computed(() => contacts.value.length)
    const chatroomsCount = computed(() => chatrooms.value.length)
    const sessionsCount = computed(() => sessions.value.length)

    // 最近活跃会话数（以会话数代替聊天记录总数）
    const activeSessions = computed(() => {
      const now = dayjs()
      const sevenDaysAgo = now.subtract(7, 'day')

      return sessions.value.filter(session => {
        if (!session.lastMessageTime) return false
        const lastTime = dayjs(session.lastMessageTime)
        return lastTime.isAfter(sevenDaysAgo)
      }).length
    })

    const recentSessions = computed(() => {
      return sessions.value.slice(0, 10)
    })

    // 趋势图配置
    const trendChartOption = ref({
      backgroundColor: 'transparent',
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
        top: '10%',
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
            color: '#409eff'
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

    // 饼图配置
    const pieChartOption = ref({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#409eff',
        textStyle: {
          color: '#fff'
        },
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '0%',
        left: 'center',
        itemWidth: 10,
        itemHeight: 10
      },
      series: [
        {
          name: '聊天类型',
          type: 'pie',
          radius: ['30%', '60%'],
          center: ['50%', '40%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 1048, name: '文本', itemStyle: { color: '#409eff' } },
            { value: 735, name: '图片', itemStyle: { color: '#67c23a' } },
            { value: 580, name: '语音', itemStyle: { color: '#e6a23c' } },
            { value: 484, name: '其他', itemStyle: { color: '#f56c6c' } }
          ]
        }
      ]
    })

    // 初始化图表数据
    const initChartData = async () => {
      try {
        // 获取最近7天的聊天记录作为样本
        const endDate = dayjs()
        const startDate = endDate.subtract(7, 'day')

        const allLogs = []
        const activeSessions = sessions.value.slice(0, 5) // 取前5个会话作为样本

        for (const session of activeSessions) {
          try {
            const response = await api.getChatLogs({
              talker: session.id || session.name,
              time: `${startDate.format('YYYY-MM-DD')}~${endDate.format('YYYY-MM-DD')}`,
              limit: 200
            })

            if (response.data && Array.isArray(response.data)) {
              allLogs.push(...response.data)
            }
          } catch (error) {
            console.warn(`获取会话 ${session.name} 聊天记录失败:`, error.message)
          }
        }

        // 生成趋势数据
        const dates = []
        const data = []
        const dailyCount = {}

        // 统计每日消息数
        allLogs.forEach(log => {
          const date = dayjs(log.time).format('YYYY-MM-DD')
          dailyCount[date] = (dailyCount[date] || 0) + 1
        })

        // 生成7天数据
        for (let i = 6; i >= 0; i--) {
          const date = dayjs().subtract(i, 'day')
          const dateStr = date.format('YYYY-MM-DD')
          const displayDate = date.format('MM-DD')

          dates.push(displayDate)
          data.push(dailyCount[dateStr] || 0)
        }

        trendChartOption.value.xAxis.data = dates
        trendChartOption.value.series[0].data = data

        // 更新饼图数据
        const typeCount = {
          text: 0,
          image: 0,
          voice: 0,
          other: 0
        }

        allLogs.forEach(log => {
          const content = log.content || ''
          if (content.includes('[图片]') || content.includes('image')) {
            typeCount.image++
          } else if (content.includes('[语音]') || content.includes('voice')) {
            typeCount.voice++
          } else if (content.includes('[视频]') || content.includes('[文件]')) {
            typeCount.other++
          } else {
            typeCount.text++
          }
        })

        pieChartOption.value.series[0].data = [
          { value: typeCount.text, name: '文本', itemStyle: { color: '#409eff' } },
          { value: typeCount.image, name: '图片', itemStyle: { color: '#67c23a' } },
          { value: typeCount.voice, name: '语音', itemStyle: { color: '#e6a23c' } },
          { value: typeCount.other, name: '其他', itemStyle: { color: '#f56c6c' } }
        ]
      } catch (error) {
        console.error('初始化图表数据失败:', error)
        // 使用模拟数据作为后备
        const dates = []
        const data = []
        for (let i = 6; i >= 0; i--) {
          const date = dayjs().subtract(i, 'day').format('MM-DD')
          dates.push(date)
          data.push(0) // 显示0而不是随机数据
        }

        trendChartOption.value.xAxis.data = dates
        trendChartOption.value.series[0].data = data
      } finally {
        chartLoading.value = false
      }
    }

    // 获取一个样本聊天记录统计
    const fetchSampleChatLogs = async () => {
      if (sessions.value.length === 0) {
        recentChatLogsCount.value = 0
        return
      }

      statsLoading.value = true
      try {
        // 获取最近3天的数据作为样本
        const endDate = dayjs()
        const startDate = endDate.subtract(3, 'day')

        // 获取第一个活跃会话的聊天记录
        const activeSession = sessions.value.find(s => s.lastMessageTime) || sessions.value[0]
        if (activeSession) {
          const response = await api.getChatLogs({
            talker: activeSession.id || activeSession.name,
            time: `${startDate.format('YYYY-MM-DD')}~${endDate.format('YYYY-MM-DD')}`,
            limit: 500
          })

          recentChatLogsCount.value = response.data.length
        }
      } catch (error) {
        console.error('获取样本聊天记录失败:', error)
        recentChatLogsCount.value = 0
      } finally {
        statsLoading.value = false
      }
    }

    const formatTime = (time) => {
      return dayjs(time).format('YYYY-MM-DD HH:mm')
    }

    onMounted(async () => {
      try {
        // 先获取基础数据
        await Promise.all([
          store.dispatch('fetchContacts'),
          store.dispatch('fetchChatrooms'),
          store.dispatch('fetchSessions')
        ])

        // 然后获取样本聊天记录
        await fetchSampleChatLogs()

        // 最后初始化图表数据（使用真实数据）
        await initChartData()
      } catch (error) {
        console.error('初始化Dashboard失败:', error)
      }
    })

    return {
      loading,
      contactsCount,
      chatroomsCount,
      sessionsCount,
      activeSessions,
      recentChatLogsCount,
      recentSessions,
      formatTime,
      chartLoading,
      trendChartOption,
      pieChartOption
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stats-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  display: flex;
  align-items: center;
}

.stats-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
}

.stats-icon .el-icon {
  font-size: 24px;
  color: white;
}

.stats-content h3 {
  margin: 0 0 5px 0;
  font-size: 32px;
  font-weight: 600;
  color: #333;
}

.stats-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.chart-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.card-body {
  padding: 0;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #e4e7ed;
}

.session-item:last-child {
  border-bottom: none;
}

.session-avatar {
  margin-right: 15px;
}

.session-info {
  flex: 1;
}

.session-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.session-time {
  color: #909399;
  font-size: 12px;
}

.loading {
  padding: 20px;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .chart-overview {
    grid-template-columns: 1fr;
  }

  .dashboard-content {
    grid-template-columns: 1fr;
  }
}
</style>
