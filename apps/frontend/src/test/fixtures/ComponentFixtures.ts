import { VueWrapper } from '@vue/test-utils'
import { createTestRouter, createTestStore, mountComponent } from '../utils/testHelpers'
import { testDataGenerator } from '../utils/testHelpers'

/**
 * 前端组件测试夹具类
 * 提供Vue组件测试环境的设置和清理功能
 */
export class ComponentFixtures {
  private mockComponents: Map<string, any> = new Map()
  private mountedWrappers: VueWrapper<any>[] = []
  private mockApis: Map<string, any> = new Map()

  /**
   * 设置模拟组件
   * @param componentName - 组件名称
   * @param mockImplementation - 模拟实现
   * @returns 模拟组件
   */
  setupMockComponent(componentName: string, mockImplementation: any = {}) {
    const mockComponent = {
      name: componentName,
      template: `<div data-testid="${componentName.toLowerCase()}">${componentName} Mock</div>`,
      ...mockImplementation
    }
    this.mockComponents.set(componentName, mockComponent)
    return mockComponent
  }

  /**
   * 获取模拟组件
   * @param componentName - 组件名称
   * @returns 模拟组件
   */
  getMockComponent(componentName: string) {
    return this.mockComponents.get(componentName)
  }

  /**
   * 挂载组件用于测试
   * @param component - 要挂载的组件
   * @param options - 挂载选项
   * @returns Vue包装器
   */
  mountComponentForTest(component: any, options: any = {}) {
    const wrapper = mountComponent(component, options)
    this.mountedWrappers.push(wrapper)
    return wrapper
  }

  /**
   * 设置聊天组件夹具
   * @param messageCount - 消息数量
   * @returns 聊天数据和挂载的组件
   */
  setupChatComponentFixture(messageCount: number = 5) {
    const chatData = Array.from({ length: messageCount }, (_, i) => 
      testDataGenerator.createChatData({
        id: i + 1,
        content: `测试消息 ${i + 1}`,
        sender: i % 2 === 0 ? 'user' : 'assistant'
      })
    )

    const mockChatComponent = this.setupMockComponent('ChatComponent', {
      props: ['messages'],
      template: `
        <div data-testid="chat-component">
          <div v-for="message in messages" :key="message.id" class="message">
            {{ message.content }}
          </div>
        </div>
      `
    })

    return { chatData, mockChatComponent }
  }

  /**
   * 设置分析结果组件夹具
   * @param overrides - 覆盖的属性
   * @returns 分析数据和挂载的组件
   */
  setupAnalysisComponentFixture(overrides: any = {}) {
    const analysisData = testDataGenerator.createAnalysisResult(overrides)

    const mockAnalysisComponent = this.setupMockComponent('AnalysisComponent', {
      props: ['analysisResult'],
      template: `
        <div data-testid="analysis-component">
          <h3>{{ analysisResult.summary }}</h3>
          <p>情感: {{ analysisResult.sentiment }}</p>
          <div class="keywords">
            <span v-for="keyword in analysisResult.keywords" :key="keyword">
              {{ keyword }}
            </span>
          </div>
        </div>
      `
    })

    return { analysisData, mockAnalysisComponent }
  }

  /**
   * 设置表单组件夹具
   * @param formFields - 表单字段配置
   * @returns 表单配置和模拟组件
   */
  setupFormComponentFixture(formFields: any[] = []) {
    const defaultFields = [
      { name: 'title', type: 'text', label: '标题', required: true },
      { name: 'content', type: 'textarea', label: '内容', required: true },
      { name: 'tags', type: 'select', label: '标签', options: ['重要', '普通', '紧急'] }
    ]

    const fields = formFields.length > 0 ? formFields : defaultFields

    const mockFormComponent = this.setupMockComponent('FormComponent', {
      props: ['fields', 'modelValue'],
      emits: ['update:modelValue', 'submit'],
      template: `
        <form data-testid="form-component" @submit.prevent="$emit('submit', modelValue)">
          <div v-for="field in fields" :key="field.name" class="form-field">
            <label>{{ field.label }}</label>
            <input 
              v-if="field.type === 'text'" 
              :value="modelValue[field.name]"
              @input="updateField(field.name, $event.target.value)"
            />
            <textarea 
              v-else-if="field.type === 'textarea'"
              :value="modelValue[field.name]"
              @input="updateField(field.name, $event.target.value)"
            ></textarea>
            <select 
              v-else-if="field.type === 'select'"
              :value="modelValue[field.name]"
              @change="updateField(field.name, $event.target.value)"
            >
              <option v-for="option in field.options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
          <button type="submit">提交</button>
        </form>
      `,
      methods: {
        updateField(fieldName: string, value: any) {
          this.$emit('update:modelValue', { ...this.modelValue, [fieldName]: value })
        }
      }
    })

    return { fields, mockFormComponent }
  }

  /**
   * 设置API模拟
   * @param apiName - API名称
   * @param mockResponse - 模拟响应
   */
  setupApiMock(apiName: string, mockResponse: any) {
    const mockApi = vi.fn().mockResolvedValue(mockResponse)
    this.mockApis.set(apiName, mockApi)
    return mockApi
  }

  /**
   * 获取API模拟
   * @param apiName - API名称
   * @returns 模拟API函数
   */
  getApiMock(apiName: string) {
    return this.mockApis.get(apiName)
  }

  /**
   * 设置路由夹具
   * @param routes - 路由配置
   * @returns 测试路由器
   */
  setupRouterFixture(routes: any[] = []) {
    return createTestRouter(routes)
  }

  /**
   * 设置状态管理夹具
   * @param modules - Vuex模块
   * @returns 测试Store
   */
  setupStoreFixture(modules: any = {}) {
    return createTestStore(modules)
  }

  /**
   * 模拟用户交互
   * @param wrapper - Vue包装器
   * @param interactions - 交互配置
   */
  async simulateUserInteractions(wrapper: VueWrapper<any>, interactions: any[]) {
    for (const interaction of interactions) {
      switch (interaction.type) {
        case 'click':
          await wrapper.find(interaction.selector).trigger('click')
          break
        case 'input':
          await wrapper.find(interaction.selector).setValue(interaction.value)
          break
        case 'submit':
          await wrapper.find(interaction.selector).trigger('submit')
          break
        default:
          console.warn(`未知的交互类型: ${interaction.type}`)
      }
      await wrapper.vm.$nextTick()
    }
  }

  /**
   * 清理所有测试数据和模拟对象
   */
  async cleanup() {
    // 卸载所有挂载的组件
    for (const wrapper of this.mountedWrappers) {
      if (wrapper && typeof wrapper.unmount === 'function') {
        wrapper.unmount()
      }
    }
    this.mountedWrappers = []

    // 清理模拟对象
    this.mockComponents.clear()
    this.mockApis.clear()

    // 清理Vitest模拟
    vi.clearAllMocks()
  }

  /**
   * 重置所有夹具到初始状态
   */
  async reset() {
    await this.cleanup()
    this.mockComponents = new Map()
    this.mockApis = new Map()
    this.mountedWrappers = []
  }
}

export default ComponentFixtures