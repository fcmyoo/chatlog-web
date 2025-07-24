<template>
  <div class="main-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: collapsed }">
      <div class="sidebar-header">
        <h1 v-if="!collapsed">聊天记录管理</h1>
        <el-icon v-else><ChatDotRound /></el-icon>
      </div>
      <el-menu
        :default-active="$route.path"
        :collapse="collapsed"
        class="sidebar-menu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/analytics">
          <el-icon><TrendCharts /></el-icon>
          <span>数据分析</span>
        </el-menu-item>
        <el-menu-item index="/ai-analysis">
          <el-icon><Magic /></el-icon>
          <span>AI智能分析</span>
        </el-menu-item>
        <el-menu-item index="/chatlog">
          <el-icon><ChatDotRound /></el-icon>
          <span>聊天记录</span>
        </el-menu-item>
        <el-menu-item index="/contacts">
          <el-icon><User /></el-icon>
          <span>联系人</span>
        </el-menu-item>
        <el-menu-item index="/chatrooms">
          <el-icon><UserFilled /></el-icon>
          <span>群聊</span>
        </el-menu-item>
        <el-menu-item index="/sessions">
          <el-icon><Message /></el-icon>
          <span>会话</span>
        </el-menu-item>
        <el-menu-item index="/media">
          <el-icon><Picture /></el-icon>
          <span>多媒体</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 顶部导航栏 -->
      <div class="navbar">
        <div class="navbar-left">
          <el-button
            link
            @click="collapsed = !collapsed"
            :icon="collapsed ? 'Expand' : 'Fold'"
          />
          <span class="page-title">{{ $route.meta.title }}</span>
        </div>
        <div class="navbar-right">
          <el-button link @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <!-- 页面内容 -->
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'

export default {
  name: 'Layout',
  setup () {
    const collapsed = ref(false)
    const store = useStore()
    const route = useRoute()

    const refreshData = () => {
      // 根据当前路由刷新对应数据
      const routeName = route.name
      switch (routeName) {
        case 'Contacts':
          store.dispatch('fetchContacts')
          break
        case 'ChatRooms':
          store.dispatch('fetchChatrooms')
          break
        case 'Sessions':
          store.dispatch('fetchSessions')
          break
        default:
          break
      }
    }

    return {
      collapsed,
      refreshData
    }
  }
}
</script>

<style scoped>
.sidebar-header {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #434a59;
}

.sidebar-header h1 {
  margin: 0;
  font-size: 18px;
  color: #409eff;
}

.sidebar-menu {
  border-right: none;
}

.navbar {
  justify-content: space-between;
}

.navbar-left {
  display: flex;
  align-items: center;
}

.page-title {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 600;
}

.navbar-right {
  display: flex;
  align-items: center;
}
</style>
