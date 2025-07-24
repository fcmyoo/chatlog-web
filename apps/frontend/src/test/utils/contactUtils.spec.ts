import { describe, it, expect } from 'vitest'
import { formatContactName, isChatRoom, filterRealContacts } from '@/utils/contactUtils'

describe('contactUtils', () => {
  describe('formatContactName', () => {
    it('应该优先返回备注名', () => {
      const contact = {
        UserName: 'user123',
        NickName: '昵称',
        Remark: '备注名',
        Alias: '别名'
      }
      expect(formatContactName(contact)).toBe('备注名')
    })

    it('应该在没有备注时返回昵称', () => {
      const contact = {
        UserName: 'user123',
        NickName: '昵称',
        Remark: '',
        Alias: '别名'
      }
      expect(formatContactName(contact)).toBe('昵称')
    })

    it('应该在没有备注和昵称时返回别名', () => {
      const contact = {
        UserName: 'user123',
        NickName: '',
        Remark: '',
        Alias: '别名'
      }
      expect(formatContactName(contact)).toBe('别名')
    })

    it('应该在没有其他信息时返回用户名', () => {
      const contact = {
        UserName: 'user123',
        NickName: '',
        Remark: '',
        Alias: ''
      }
      expect(formatContactName(contact)).toBe('user123')
    })

    it('应该在所有信息都为空时返回默认文本', () => {
      const contact = {
        UserName: '',
        NickName: '',
        Remark: '',
        Alias: ''
      }
      expect(formatContactName(contact)).toBe('未知联系人')
    })
  })

  describe('isChatRoom', () => {
    it('应该识别包含@chatroom的聊天群', () => {
      expect(isChatRoom('group123@chatroom')).toBe(true)
    })

    it('应该识别包含@openim的聊天群', () => {
      expect(isChatRoom('user@openim')).toBe(true)
    })

    it('应该识别包含@kefu.openim的客服群', () => {
      expect(isChatRoom('service@kefu.openim')).toBe(true)
    })

    it('应该识别包含@im.chatroom的聊天群', () => {
      expect(isChatRoom('room@im.chatroom')).toBe(true)
    })

    it('应该正确识别普通用户', () => {
      expect(isChatRoom('normaluser123')).toBe(false)
    })

    it('应该处理空字符串', () => {
      expect(isChatRoom('')).toBe(false)
    })
  })

  describe('filterRealContacts', () => {
    it('应该过滤掉聊天群，保留真实联系人', () => {
      const contacts = [
        { UserName: 'user1', NickName: 'User 1' },
        { UserName: 'group@chatroom', NickName: 'Group Chat' },
        { UserName: 'user2', NickName: 'User 2' },
        { UserName: 'service@openim', NickName: 'Service' }
      ]

      const result = filterRealContacts(contacts)
      
      expect(result).toHaveLength(2)
      expect(result[0].UserName).toBe('user1')
      expect(result[1].UserName).toBe('user2')
    })

    it('应该处理空数组', () => {
      expect(filterRealContacts([])).toEqual([])
    })

    it('应该处理全部为聊天群的情况', () => {
      const contacts = [
        { UserName: 'group1@chatroom', NickName: 'Group 1' },
        { UserName: 'group2@openim', NickName: 'Group 2' }
      ]

      const result = filterRealContacts(contacts)
      expect(result).toHaveLength(0)
    })
  })
})