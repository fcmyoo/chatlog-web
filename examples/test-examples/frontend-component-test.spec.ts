import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ComponentFixtures } from '../../apps/frontend/src/test/fixtures/ComponentFixtures'
import { ApiTestDataGenerator } from '../../packages/shared/test/ApiTestDataGenerator'

/**
 * 前端组件测试示例
 * 展示如何使用ComponentFixtures进行Vue组件测试
 */
describe('前端组件测试示例', () => {
  let fixtures: ComponentFixtures

  beforeEach(() => {
    fixtures = new ComponentFixtures()
  })

  afterEach(async () => {
    await fixtures.cleanup()
  })

  describe('聊天组件测试', () => {
    it('应该正确渲染聊天消息列表', async () => {
      // 1. 生成测试数据
      const { chatData, mockChatComponent } = fixtures.setupChatComponentFixture(3)
      
      // 2. 挂载组件
      const wrapper = fixtures.mountComponentForTest(mockChatComponent, {
        props: { messages: chatData }
      })
      
      // 3. 验证渲染结果
      expect(wrapper.findAll('.message')).toHaveLength(3)
      expect(wrapper.text()).toContain('测试消息 1')
      expect(wrapper.text()).toContain('测试消息 2')
      expect(wrapper.text()).toContain('测试消息 3')
    })

    it('应该处理空消息列表', async () => {
      const { mockChatComponent } = fixtures.setupChatComponentFixture(0)
      
      const wrapper = fixtures.mountComponentForTest(mockChatComponent, {
        props: { messages: [] }
      })
      
      expect(wrapper.findAll('.message')).toHaveLength(0)
    })

    it('应该支持消息发送交互', async () => {
      const { chatData, mockChatComponent } = fixtures.setupChatComponentFixture(2)
      
      // 扩展组件以支持消息发送
      const extendedComponent = {
        ...mockChatComponent,
        template: `
          <div data-testid="chat-component">
            <div v-for="message in messages" :key="message.id" class="message">
              {{ message.content }}
            </div>
            <div class="input-area">
              <input v-model="newMessage" placeholder="输入消息..." />
              <button @click="sendMessage">发送</button>
            </div>
          </div>
        `,
        data() {
          return { newMessage: '' }
        },
        methods: {
          sendMessage() {
            if (this.newMessage.trim()) {
              this.$emit('send-message', this.newMessage)
              this.newMessage = ''
            }
          }
        }
      }
      
      const wrapper = fixtures.mountComponentForTest(extendedComponent, {
        props: { messages: chatData }
      })
      
      // 模拟用户输入和发送消息
      await fixtures.simulateUserInteractions(wrapper, [
        { type: 'input', selector: 'input', value: '新消息内容' },
        { type: 'click', selector: 'button' }
      ])
      
      // 验证事件被触发
      expect(wrapper.emitted('send-message')).toBeTruthy()
      expect(wrapper.emitted('send-message')[0]).toEqual(['新消息内容'])
    })
  })

  describe('分析结果组件测试', () => {
    it('应该正确显示分析结果', async () => {
      // 使用API测试数据生成器创建分析数据
      const analysisData = ApiTestDataGenerator.generateAnalysisResult({
        summary: '这是一个测试分析摘要',
        sentiment: 'positive',
        keywords: ['测试', '分析', '成功']
      })
      
      const { mockAnalysisComponent } = fixtures.setupAnalysisComponentFixture(analysisData)
      
      const wrapper = fixtures.mountComponentForTest(mockAnalysisComponent, {
        props: { analysisResult: analysisData }
      })
      
      expect(wrapper.text()).toContain('这是一个测试分析摘要')
      expect(wrapper.text()).toContain('positive')
      expect(wrapper.text()).toContain('测试')
      expect(wrapper.text()).toContain('分析')
      expect(wrapper.text()).toContain('成功')
    })

    it('应该处理不同的情感分析结果', async () => {
      const sentiments = ['positive', 'negative', 'neutral']
      
      for (const sentiment of sentiments) {
        const analysisData = ApiTestDataGenerator.generateAnalysisResult({ sentiment })
        const { mockAnalysisComponent } = fixtures.setupAnalysisComponentFixture(analysisData)
        
        const wrapper = fixtures.mountComponentForTest(mockAnalysisComponent, {
          props: { analysisResult: analysisData }
        })
        
        expect(wrapper.text()).toContain(sentiment)
        
        // 清理当前组件
        wrapper.unmount()
      }
    })
  })

  describe('表单组件测试', () => {
    it('应该正确处理表单提交', async () => {
      const formFields = [
        { name: 'title', type: 'text', label: '标题', required: true },
        { name: 'content', type: 'textarea', label: '内容', required: true },
        { name: 'priority', type: 'select', label: '优先级', options: ['高', '中', '低'] }
      ]
      
      const { mockFormComponent } = fixtures.setupFormComponentFixture(formFields)
      
      const wrapper = fixtures.mountComponentForTest(mockFormComponent, {
        props: { 
          fields: formFields,
          modelValue: {}
        }
      })
      
      // 模拟表单填写
      await fixtures.simulateUserInteractions(wrapper, [
        { type: 'input', selector: 'input[name="title"]', value: '测试标题' },
        { type: 'input', selector: 'textarea[name="content"]', value: '测试内容' },
        { type: 'input', selector: 'select[name="priority"]', value: '高' },
        { type: 'submit', selector: 'form' }
      ])
      
      // 验证表单提交事件
      expect(wrapper.emitted('submit')).toBeTruthy()
      const submitData = wrapper.emitted('submit')[0][0]
      expect(submitData).toEqual({
        title: '测试标题',
        content: '测试内容',
        priority: '高'
      })
    })

    it('应该支持表单验证', async () => {
      const { mockFormComponent } = fixtures.setupFormComponentFixture()
      
      const wrapper = fixtures.mountComponentForTest(mockFormComponent, {
        props: { 
          fields: [
            { name: 'email', type: 'text', label: '邮箱', required: true, validation: 'email' }
          ],
          modelValue: {}
        }
      })
      
      // 测试无效邮箱
      await fixtures.simulateUserInteractions(wrapper, [
        { type: 'input', selector: 'input[name="email"]', value: 'invalid-email' },
        { type: 'submit', selector: 'form' }
      ])
      
      // 根据实际的验证逻辑进行断言
      // 这里假设组件会显示验证错误
      expect(wrapper.text()).toContain('邮箱格式不正确')
    })
  })

  describe('API模拟测试', () => {
    it('应该正确模拟API调用', async () => {
      // 设置API模拟
      const mockApiResponse = ApiTestDataGenerator.generateApiResponse({
        users: [
          ApiTestDataGenerator.generateUser({ name: '用户1' }),
          ApiTestDataGenerator.generateUser({ name: '用户2' })
        ]
      })
      
      const mockApi = fixtures.setupApiMock('fetchUsers', mockApiResponse)
      
      // 创建使用API的组件
      const apiComponent = fixtures.setupMockComponent('ApiComponent', {
        template: `
          <div data-testid="api-component">
            <button @click="loadUsers">加载用户</button>
            <div v-for="user in users" :key="user.id" class="user">
              {{ user.name }}
            </div>
          </div>
        `,
        data() {
          return { users: [] }
        },
        methods: {
          async loadUsers() {
            const response = await mockApi()
            this.users = response.data.users
          }
        }
      })
      
      const wrapper = fixtures.mountComponentForTest(apiComponent)
      
      // 触发API调用
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()
      
      // 验证API被调用
      expect(mockApi).toHaveBeenCalledTimes(1)
      
      // 验证数据被正确渲染
      expect(wrapper.findAll('.user')).toHaveLength(2)
      expect(wrapper.text()).toContain('用户1')
      expect(wrapper.text()).toContain('用户2')
    })

    it('应该处理API错误', async () => {
      // 设置API错误模拟
      const mockApiError = ApiTestDataGenerator.generateApiError('网络错误', 500)
      const mockApi = fixtures.setupApiMock('fetchUsers', Promise.reject(mockApiError))
      
      const apiComponent = fixtures.setupMockComponent('ApiErrorComponent', {
        template: `
          <div data-testid="api-error-component">
            <button @click="loadUsers">加载用户</button>
            <div v-if="error" class="error">{{ error }}</div>
          </div>
        `,
        data() {
          return { error: null }
        },
        methods: {
          async loadUsers() {
            try {
              await mockApi()
            } catch (error) {
              this.error = error.message || '加载失败'
            }
          }
        }
      })
      
      const wrapper = fixtures.mountComponentForTest(apiComponent)
      
      // 触发API调用
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()
      
      // 验证错误处理
      expect(wrapper.find('.error').text()).toContain('加载失败')
    })
  })
})