const axios = require('axios');
const ConfigManager = require('../config/ConfigManager');

class DataService {
  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * 获取聊天数据
   */
  async getChatData(groupName, timeRange = '2024-01-01~2025-12-31') {
    try {
      const config = this.configManager.getChatlogConfig();
      const [startDate, endDate] = timeRange.split('~');

      console.log(`📡 正在从Chatlog API获取数据...`);
      console.log(`🔍 群聊: ${groupName}, 时间范围: ${timeRange}`);

      // 构建请求参数
      const params = {
        talker: groupName,
        start_time: startDate,
        end_time: endDate,
        limit: 10000 // 限制返回数量，避免数据过大
      };

      // 调用Chatlog API
      const response = await axios.get(`${config.baseURL}/api/v1/chatlog`, {
        params,
        timeout: config.timeout,
        headers: {
          'Accept': 'text/plain,application/json'
        }
      });

      console.log(`📊 API响应状态: ${response.status}`);
      console.log(`📝 响应数据类型: ${typeof response.data}`);

      // 解析聊天数据
      const chatData = this.parseChatData(response.data, groupName);
      
      console.log(`✅ 成功解析 ${chatData.length} 条聊天记录`);
      return chatData;

    } catch (error) {
      console.error('获取聊天数据失败:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到Chatlog服务，请确认服务是否正在运行 (端口5030)');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请检查网络连接或缩小查询范围');
      } else if (error.response?.status === 404) {
        throw new Error('找不到指定的群聊数据，请检查群聊名称是否正确');
      } else {
        throw new Error(`数据获取失败: ${error.message}`);
      }
    }
  }

  /**
   * 解析聊天数据
   */
  parseChatData(rawData, groupName) {
    if (!rawData) {
      console.warn('解析聊天数据: 输入数据为空');
      return [];
    }

    let textData = rawData;
    
    // 处理不同类型的输入数据
    if (typeof rawData === 'object') {
      if (Array.isArray(rawData)) {
        console.log('数据已经是数组格式，直接返回');
        return this.normalizeArrayData(rawData, groupName);
      } else {
        console.log('数据是对象格式，尝试转换为字符串');
        textData = JSON.stringify(rawData);
      }
    } else if (typeof rawData !== 'string') {
      console.warn('数据类型异常，尝试转换为字符串');
      textData = String(rawData);
    }

    return this.parseTextData(textData, groupName);
  }

  /**
   * 规范化数组数据
   */
  normalizeArrayData(data, groupName) {
    return data.map(item => ({
      senderName: item.senderName || item.sender || item.from || '未知用户',
      senderId: item.senderId || item.id || '',
      content: item.content || item.message || item.text || '',
      time: item.time || item.timestamp || item.date || new Date().toISOString(),
      timestamp: item.timestamp || new Date(item.time || Date.now()).getTime(),
      talkerName: groupName,
      groupName: groupName
    }));
  }

  /**
   * 解析文本格式数据
   */
  parseTextData(textData, groupName) {
    const lines = textData.trim().split('\n');
    const chatData = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // 解析格式：发送者(发送者ID) 时间
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/);
        if (match) {
          const [, senderName, senderId, time] = match;
          let content = '';

          // 读取消息内容（下一行）
          if (i + 1 < lines.length) {
            content = lines[i + 1].trim();
            i++; // 跳过内容行
          }

          // 过滤掉空内容或系统消息
          if (content && !this.isSystemMessage(content)) {
            chatData.push({
              senderName: senderName.trim(),
              senderId: senderId.trim(),
              time: time.trim(),
              content: content,
              timestamp: this.parseTimestamp(time.trim()),
              talkerName: groupName,
              groupName: groupName
            });
          }
        }
      }
    }

    return chatData;
  }

  /**
   * 判断是否为系统消息
   */
  isSystemMessage(content) {
    const systemPatterns = [
      /^\[系统消息\]/,
      /^系统:/,
      /撤回了一条消息/,
      /加入了群聊/,
      /退出了群聊/,
      /^拍了拍/,
      /^@所有人/
    ];

    return systemPatterns.some(pattern => pattern.test(content));
  }

  /**
   * 解析时间戳
   */
  parseTimestamp(timeString) {
    try {
      const date = new Date(timeString);
      return isNaN(date.getTime()) ? Date.now() : date.getTime();
    } catch (error) {
      console.warn('时间解析失败:', timeString);
      return Date.now();
    }
  }

  /**
   * 获取群聊列表
   */
  async getChatrooms() {
    try {
      const config = this.configManager.getChatlogConfig();
      
      console.log('📡 获取群聊列表...');
      
      const response = await axios.get(`${config.baseURL}/api/v1/chatroom`, {
        timeout: config.timeout
      });

      const chatrooms = this.parseChatrooms(response.data);
      console.log(`✅ 获取到 ${chatrooms.length} 个群聊`);
      
      return chatrooms;

    } catch (error) {
      console.error('获取群聊列表失败:', error.message);
      throw new Error(`获取群聊列表失败: ${error.message}`);
    }
  }

  /**
   * 解析群聊数据
   */
  parseChatrooms(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      console.warn('群聊数据格式异常');
      return [];
    }

    const lines = rawData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const chatrooms = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const room = {};

      headers.forEach((header, index) => {
        room[header] = values[index] || '';
      });

      if (room.nickname || room.name) {
        chatrooms.push({
          id: room.username || room.id || '',
          name: room.nickname || room.name || '未知群聊',
          displayName: room.nickname || room.name || '未知群聊',
          username: room.username || '',
          memberCount: parseInt(room.member_count) || 0
        });
      }
    }

    return chatrooms;
  }

  /**
   * 获取联系人列表
   */
  async getContacts() {
    try {
      const config = this.configManager.getChatlogConfig();
      
      console.log('📡 获取联系人列表...');
      
      const response = await axios.get(`${config.baseURL}/api/v1/contact`, {
        timeout: config.timeout
      });

      const contacts = this.parseContacts(response.data);
      console.log(`✅ 获取到 ${contacts.length} 个联系人`);
      
      return contacts;

    } catch (error) {
      console.error('获取联系人列表失败:', error.message);
      throw new Error(`获取联系人列表失败: ${error.message}`);
    }
  }

  /**
   * 解析联系人数据
   */
  parseContacts(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      console.warn('联系人数据格式异常');
      return [];
    }

    const lines = rawData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const contacts = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const contact = {};

      headers.forEach((header, index) => {
        contact[header] = values[index] || '';
      });

      if (contact.nickname || contact.remark) {
        contacts.push({
          id: contact.username || contact.id || '',
          name: contact.remark || contact.nickname || '未知联系人',
          nickname: contact.nickname || '',
          remark: contact.remark || '',
          username: contact.username || ''
        });
      }
    }

    return contacts;
  }

  /**
   * 获取会话列表
   */
  async getSessions() {
    try {
      const config = this.configManager.getChatlogConfig();
      
      console.log('📡 获取会话列表...');
      
      const response = await axios.get(`${config.baseURL}/api/v1/session`, {
        timeout: config.timeout
      });

      const sessions = this.parseSessions(response.data);
      console.log(`✅ 获取到 ${sessions.length} 个会话`);
      
      return sessions;

    } catch (error) {
      console.error('获取会话列表失败:', error.message);
      throw new Error(`获取会话列表失败: ${error.message}`);
    }
  }

  /**
   * 解析会话数据
   */
  parseSessions(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      console.warn('会话数据格式异常');
      return [];
    }

    const lines = rawData.trim().split('\n').filter(line => line.trim());
    const sessions = [];

    for (const line of lines) {
      if (line.trim()) {
        // 解析格式：群名称(群ID) 时间
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/);
        if (match) {
          const [, name, id, lastMessageTime] = match;
          sessions.push({
            id: id.trim(),
            name: name.trim(),
            displayName: name.trim(),
            lastMessageTime: lastMessageTime.trim(),
            timestamp: this.parseTimestamp(lastMessageTime.trim())
          });
        }
      }
    }

    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 测试Chatlog连接
   */
  async testConnection() {
    try {
      const config = this.configManager.getChatlogConfig();
      
      console.log('🔗 测试Chatlog连接...');
      
      const response = await axios.get(`${config.baseURL}/api/v1/session`, {
        timeout: 5000
      });

      return {
        success: true,
        message: 'Chatlog连接成功',
        baseURL: config.baseURL,
        status: response.status
      };

    } catch (error) {
      console.error('Chatlog连接测试失败:', error.message);
      
      return {
        success: false,
        error: error.message,
        baseURL: this.configManager.getChatlogConfig().baseURL
      };
    }
  }
}

module.exports = DataService;