import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'
import type { AxiosResponse } from 'axios'
import apiClient from '@/api/ApiClient'
import unifiedApi from '@/api/unified'
import type { Contact, ChatRoom, Session, ChatLog, AIModel, AITask } from '@/types'

// 模拟axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('API Integration Tests', () => {
  beforeEach(() => {
    // 清理所有模拟
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 重置所有模拟
    vi.resetAllMocks()
  })

  describe('ApiClient', () => {
    describe('联系人API', () => {
      it('getContacts 应该正确解析CSV格式的联系人数据', async () => {
        const mockCsvData = `username,nickname,remark,avatar
user1,用户1,测试备注1,avatar1.jpg
user2,用户2,测试备注2,avatar2.jpg`

        const mockResponse: AxiosResponse = {
          data: mockCsvData,
          status: 200,
          statusText: 'OK',  
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.getContacts()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/contacts')
        expect(result.data).toHaveLength(2)
        expect(result.data[0]).toEqual({
          username: 'user1',
          nickname: '用户1',
          remark: '测试备注1',
          avatar: 'avatar1.jpg'
        })
      })

      it('searchContacts 应该正确传递搜索参数', async () => {
        const mockCsvData = `username,nickname,remark,avatar
searchuser,搜索用户,搜索备注,search.jpg`

        const mockResponse: AxiosResponse = {
          data: mockCsvData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.searchContacts('search')

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/search/contacts', {
          params: { keyword: 'search' }
        })
        expect(result.data).toHaveLength(1)
        expect(result.data[0].username).toBe('searchuser')
      })
    })

    describe('聊天室API', () => {
      it('getChatrooms 应该正确解析CSV格式的聊天室数据', async () => {
        const mockCsvData = `username,nickname,memberCount,description
chatroom1,测试群聊1,10,这是测试群聊1
chatroom2,测试群聊2,20,这是测试群聊2`

        const mockResponse: AxiosResponse = {
          data: mockCsvData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.getChatrooms()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/chatrooms')
        expect(result.data).toHaveLength(2)
        expect(result.data[0]).toEqual({
          username: 'chatroom1',
          nickname: '测试群聊1',
          memberCount: '10',
          description: '这是测试群聊1'
        })
      })
    })

    describe('会话API', () => {
      it('getSessions 应该正确解析文本格式的会话数据', async () => {
        const mockTextData = `会话ID: session1
联系人: user1
最后消息时间: 2024-01-01 12:00:00
消息数量: 100

会话ID: session2
联系人: user2  
最后消息时间: 2024-01-02 13:00:00
消息数量: 50`

        const mockResponse: AxiosResponse = {
          data: mockTextData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.getSessions()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/sessions')
        expect(result.data).toHaveLength(2)
        expect(result.data[0]).toEqual({
          sessionId: 'session1',
          contact: 'user1',
          lastMessageTime: '2024-01-01 12:00:00',
          messageCount: '100'
        })
      })
    })

    describe('聊天记录API', () => {
      it('getChatLogs 应该正确解析文本格式的聊天记录', async () => {
        const mockTextData = `[2024-01-01 12:00:00] user1: 你好
[2024-01-01 12:01:00] user2: 你好，很高兴认识你
[2024-01-01 12:02:00] user1: 我也很高兴认识你`

        const mockResponse: AxiosResponse = {
          data: mockTextData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.getChatLogs('user1', 1, 20)

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/chatlog', {
          params: {
            talker: 'user1',
            page: 1,
            limit: 20
          }
        })
        expect(result.data).toHaveLength(3)
        expect(result.data[0]).toEqual({
          time: '2024-01-01 12:00:00',
          sender: 'user1',
          content: '你好'
        })
      })

      it('getChatLogs 应该正确处理分页参数', async () => {
        const mockResponse: AxiosResponse = {
          data: '',
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        await apiClient.getChatLogs('user1', 2, 50)

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/chatlog', {
          params: {
            talker: 'user1',
            page: 2,
            limit: 50
          }
        })
      })
    })

    describe('错误处理', () => {
      it('API请求失败时应该正确抛出错误', async () => {
        const mockError = new Error('Network Error')
        mockedAxios.get.mockRejectedValueOnce(mockError)

        await expect(apiClient.getContacts()).rejects.toThrow('Network Error')
      })

      it('应该正确处理空响应数据', async () => {
        const mockResponse: AxiosResponse = {
          data: '',
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.getContacts()
        expect(result.data).toEqual([])
      })

      it('应该正确处理格式错误的CSV数据', async () => {
        const mockCsvData = `username,nickname
incomplete_row_data`

        const mockResponse: AxiosResponse = {
          data: mockCsvData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await apiClient.getContacts()
        // 应该优雅地处理格式错误的数据
        expect(result.data).toEqual([])
      })
    })
  })

  describe('Unified API', () => {
    describe('基础数据API', () => {
      it('getContacts 应该返回标准化的联系人数据', async () => {
        const mockContacts: Contact[] = [
          {
            id: '1',
            username: 'user1',
            nickname: '用户1',
            avatar: 'avatar1.jpg',
            remark: '测试备注'
          }
        ]

        const mockResponse: AxiosResponse = {
          data: mockContacts,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.getContacts()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/unified/contacts')
        expect(result.data).toEqual(mockContacts)
      })

      it('getChatrooms 应该返回标准化的聊天室数据', async () => {
        const mockChatrooms: ChatRoom[] = [
          {
            id: '1',
            username: 'chatroom1',
            nickname: '测试群聊',
            avatar: 'room1.jpg',
            memberCount: 10,
            description: '测试群聊描述'
          }
        ]

        const mockResponse: AxiosResponse = {
          data: mockChatrooms,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.getChatrooms()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/unified/chatrooms')
        expect(result.data).toEqual(mockChatrooms)
      })

      it('getSessions 应该返回标准化的会话数据', async () => {
        const mockSessions: Session[] = [
          {
            id: '1',
            sessionId: 'session1',
            contact: 'user1',
            lastMessageTime: '2024-01-01T12:00:00Z',
            messageCount: 100,
            unread: 0
          }
        ]

        const mockResponse: AxiosResponse = {
          data: mockSessions,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.getSessions()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/unified/sessions')
        expect(result.data).toEqual(mockSessions)
      })
    })

    describe('AI服务API', () => {
      it('getAIModels 应该返回可用的AI模型列表', async () => {
        const mockModels: AIModel[] = [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            provider: 'openai',
            status: 'active',
            capabilities: ['text-generation', 'analysis'],
            config: {
              maxTokens: 4096,
              temperature: 0.7
            }
          }
        ]

        const mockResponse: AxiosResponse = {
          data: mockModels,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.getAIModels()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/ai/models')
        expect(result.data).toEqual(mockModels)
      })

      it('createAITask 应该正确创建AI任务', async () => {
        const taskConfig = {
          name: '分析聊天记录',
          type: 'analysis' as const,
          modelId: 'gpt-4',
          config: { temperature: 0.7 }
        }

        const mockTask: AITask = {
          id: 'task-123',
          ...taskConfig,
          status: 'pending',
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z'
        }

        const mockResponse: AxiosResponse = {
          data: mockTask,
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any
        }

        mockedAxios.post.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.createAITask(taskConfig)

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/ai/tasks', taskConfig)
        expect(result.data).toEqual(mockTask)
      })

      it('getAITasks 应该返回任务列表', async () => {
        const mockTasks: AITask[] = [
          {
            id: 'task-123',
            name: '分析聊天记录',
            type: 'analysis',
            status: 'completed',
            modelId: 'gpt-4',
            config: {},
            createdAt: '2024-01-01T12:00:00Z',
            updatedAt: '2024-01-01T12:05:00Z',
            result: {
              summary: '分析完成',
              insights: ['洞察1', '洞察2']
            }
          }
        ]

        const mockResponse: AxiosResponse = {
          data: mockTasks,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.getAITasks()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/ai/tasks')
        expect(result.data).toEqual(mockTasks)
      })

      it('deleteAITask 应该正确删除任务', async () => {
        const mockResponse: AxiosResponse = {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.delete.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.deleteAITask('task-123')

        expect(mockedAxios.delete).toHaveBeenCalledWith('/api/ai/tasks/task-123')
        expect(result.data).toEqual({ success: true })
      })
    })

    describe('分析API', () => {
      it('getAnalytics 应该返回数据分析结果', async () => {
        const mockAnalytics = {
          messageCount: 1000,
          contactCount: 50,
          chatroomCount: 10,
          timeRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          },
          topContacts: [
            { name: '用户1', count: 100 },
            { name: '用户2', count: 80 }
          ]
        }

        const mockResponse: AxiosResponse = {
          data: mockAnalytics,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        const result = await unifiedApi.getAnalytics()

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics')
        expect(result.data).toEqual(mockAnalytics)
      })

      it('getAnalytics 应该支持日期范围参数', async () => {
        const mockResponse: AxiosResponse = {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        }

        mockedAxios.get.mockResolvedValueOnce(mockResponse)

        await unifiedApi.getAnalytics('2024-01-01', '2024-01-31')

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics', {
          params: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        })
      })
    })

    describe('HTTP状态码处理', () => {
      it('应该正确处理4xx错误', async () => {
        const mockError = {
          response: {
            status: 404,
            statusText: 'Not Found',
            data: { message: '资源未找到' }
          }
        }

        mockedAxios.get.mockRejectedValueOnce(mockError)

        await expect(unifiedApi.getContacts()).rejects.toMatchObject({
          response: {
            status: 404,
            statusText: 'Not Found'
          }
        })
      })

      it('应该正确处理5xx错误', async () => {
        const mockError = {
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: { message: '服务器内部错误' }
          }
        }

        mockedAxios.get.mockRejectedValueOnce(mockError)

        await expect(unifiedApi.getContacts()).rejects.toMatchObject({
          response: {
            status: 500,
            statusText: 'Internal Server Error'
          }
        })
      })

      it('应该正确处理网络错误', async () => {
        const mockError = new Error('Network Error')
        mockedAxios.get.mockRejectedValueOnce(mockError)

        await expect(unifiedApi.getContacts()).rejects.toThrow('Network Error')
      })
    })
  })

  describe('API集成测试', () => {
    it('应该能够完整地获取和处理联系人数据流', async () => {
      // 模拟完整的数据流：CSV -> 解析 -> 标准化
      const mockCsvData = `username,nickname,remark,avatar
user1,用户1,测试备注1,avatar1.jpg
user2,用户2,测试备注2,avatar2.jpg`

      const mockResponse: AxiosResponse = {
        data: mockCsvData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await apiClient.getContacts()

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        username: 'user1',
        nickname: '用户1',
        remark: '测试备注1',
        avatar: 'avatar1.jpg'
      })
    })

    it('应该能够处理复杂的搜索和分页场景', async () => {
      // 模拟搜索API调用
      const searchResponse: AxiosResponse = {
        data: 'username,nickname\nsearchuser,搜索用户',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockedAxios.get.mockResolvedValueOnce(searchResponse)

      const searchResult = await apiClient.searchContacts('search')
      expect(searchResult.data).toHaveLength(1)

      // 模拟聊天记录分页API调用
      const chatLogResponse: AxiosResponse = {
        data: '[2024-01-01 12:00:00] searchuser: 你好',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockedAxios.get.mockResolvedValueOnce(chatLogResponse)

      const chatLogResult = await apiClient.getChatLogs('searchuser', 1, 20)
      expect(chatLogResult.data).toHaveLength(1)
      expect(chatLogResult.data[0].sender).toBe('searchuser')
    })
  })
})