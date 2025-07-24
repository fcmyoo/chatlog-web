const fs = require('fs-extra');
const path = require('path');

/**
 * 数据库测试夹具类
 * 提供数据库测试环境的设置和清理功能
 */
class DatabaseTestFixtures {
  constructor(options = {}) {
    this.testDataDir = options.testDataDir || path.join(__dirname, '../../../test-data');
    this.collections = new Map();
    this.mockDatabase = new Map();
    this.transactions = [];
    this.seedData = new Map();
  }

  /**
   * 初始化测试数据库
   */
  async initialize() {
    await fs.ensureDir(this.testDataDir);
    this.mockDatabase.clear();
    this.collections.clear();
    this.transactions = [];
  }

  /**
   * 创建模拟集合
   * @param {string} collectionName - 集合名称
   * @param {Array} initialData - 初始数据
   * @returns {Object} 模拟集合对象
   */
  createMockCollection(collectionName, initialData = []) {
    const collection = {
      name: collectionName,
      data: new Map(),
      indexes: new Map(),
      
      // 插入文档
      insertOne: async (doc) => {
        const id = doc._id || this.generateId();
        const document = { ...doc, _id: id, createdAt: new Date(), updatedAt: new Date() };
        collection.data.set(id, document);
        return { insertedId: id, acknowledged: true };
      },

      // 插入多个文档
      insertMany: async (docs) => {
        const insertedIds = [];
        for (const doc of docs) {
          const result = await collection.insertOne(doc);
          insertedIds.push(result.insertedId);
        }
        return { insertedIds, acknowledged: true };
      },

      // 查找文档
      findOne: async (filter = {}) => {
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            return doc;
          }
        }
        return null;
      },

      // 查找多个文档
      find: async (filter = {}, options = {}) => {
        let results = [];
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            results.push(doc);
          }
        }

        // 应用排序
        if (options.sort) {
          results = this.applySorting(results, options.sort);
        }

        // 应用分页
        if (options.skip) {
          results = results.slice(options.skip);
        }
        if (options.limit) {
          results = results.slice(0, options.limit);
        }

        return {
          toArray: async () => results,
          count: async () => results.length
        };
      },

      // 更新文档
      updateOne: async (filter, update) => {
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            const updatedDoc = this.applyUpdate(doc, update);
            updatedDoc.updatedAt = new Date();
            collection.data.set(id, updatedDoc);
            return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
          }
        }
        return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
      },

      // 更新多个文档
      updateMany: async (filter, update) => {
        let matchedCount = 0;
        let modifiedCount = 0;
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            matchedCount++;
            const updatedDoc = this.applyUpdate(doc, update);
            updatedDoc.updatedAt = new Date();
            collection.data.set(id, updatedDoc);
            modifiedCount++;
          }
        }
        return { matchedCount, modifiedCount, acknowledged: true };
      },

      // 删除文档
      deleteOne: async (filter) => {
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            collection.data.delete(id);
            return { deletedCount: 1, acknowledged: true };
          }
        }
        return { deletedCount: 0, acknowledged: true };
      },

      // 删除多个文档
      deleteMany: async (filter) => {
        let deletedCount = 0;
        const toDelete = [];
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            toDelete.push(id);
          }
        }
        for (const id of toDelete) {
          collection.data.delete(id);
          deletedCount++;
        }
        return { deletedCount, acknowledged: true };
      },

      // 计数
      countDocuments: async (filter = {}) => {
        let count = 0;
        for (const [id, doc] of collection.data) {
          if (this.matchesFilter(doc, filter)) {
            count++;
          }
        }
        return count;
      },

      // 清空集合
      drop: async () => {
        collection.data.clear();
        return true;
      }
    };

    // 插入初始数据
    if (initialData.length > 0) {
      collection.insertMany(initialData);
    }

    this.collections.set(collectionName, collection);
    return collection;
  }

  /**
   * 获取模拟集合
   * @param {string} collectionName - 集合名称
   * @returns {Object} 模拟集合对象
   */
  getCollection(collectionName) {
    return this.collections.get(collectionName);
  }

  /**
   * 创建种子数据
   * @param {string} collectionName - 集合名称
   * @param {Array} data - 种子数据
   */
  async seedCollection(collectionName, data) {
    const collection = this.getCollection(collectionName) || this.createMockCollection(collectionName);
    await collection.insertMany(data);
    this.seedData.set(collectionName, data);
  }

  /**
   * 生成测试用户数据
   * @param {number} count - 用户数量
   * @returns {Array} 用户数据数组
   */
  generateTestUsers(count = 5) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push({
        _id: this.generateId(),
        username: `testuser${i + 1}`,
        email: `testuser${i + 1}@example.com`,
        displayName: `测试用户${i + 1}`,
        role: i === 0 ? 'admin' : 'user',
        status: 'active',
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastLogin: new Date()
      });
    }
    return users;
  }

  /**
   * 生成测试聊天数据
   * @param {number} count - 聊天数量
   * @returns {Array} 聊天数据数组
   */
  generateTestChats(count = 10) {
    const chats = [];
    for (let i = 0; i < count; i++) {
      chats.push({
        _id: this.generateId(),
        title: `测试聊天${i + 1}`,
        participants: [`user${Math.floor(Math.random() * 5) + 1}`, 'assistant'],
        messageCount: Math.floor(Math.random() * 50) + 1,
        status: 'active',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        lastActivity: new Date()
      });
    }
    return chats;
  }

  /**
   * 生成测试消息数据
   * @param {string} chatId - 聊天ID
   * @param {number} count - 消息数量
   * @returns {Array} 消息数据数组
   */
  generateTestMessages(chatId, count = 20) {
    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        _id: this.generateId(),
        chatId,
        content: `测试消息内容${i + 1}`,
        sender: i % 2 === 0 ? 'user' : 'assistant',
        type: 'text',
        timestamp: new Date(Date.now() - (count - i) * 60000),
        metadata: {
          platform: 'web',
          version: '1.0.0'
        }
      });
    }
    return messages;
  }

  /**
   * 生成测试分析数据
   * @param {string} chatId - 聊天ID
   * @returns {Object} 分析数据对象
   */
  generateTestAnalysis(chatId) {
    return {
      _id: this.generateId(),
      chatId,
      summary: '这是一个测试分析摘要',
      sentiment: 'positive',
      keywords: ['测试', '分析', '聊天'],
      topics: ['技术讨论', '产品开发'],
      statistics: {
        messageCount: 20,
        wordCount: 300,
        averageLength: 15
      },
      createdAt: new Date(),
      status: 'completed'
    };
  }

  /**
   * 保存测试数据到文件
   * @param {string} filename - 文件名
   * @param {Object} data - 数据对象
   */
  async saveTestData(filename, data) {
    const filePath = path.join(this.testDataDir, filename);
    await fs.writeJson(filePath, data, { spaces: 2 });
  }

  /**
   * 从文件加载测试数据
   * @param {string} filename - 文件名
   * @returns {Object} 数据对象
   */
  async loadTestData(filename) {
    const filePath = path.join(this.testDataDir, filename);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  }

  /**
   * 清理所有测试数据
   */
  async cleanup() {
    // 清空所有集合
    for (const [name, collection] of this.collections) {
      await collection.drop();
    }
    
    // 清理文件系统中的测试数据
    if (await fs.pathExists(this.testDataDir)) {
      await fs.remove(this.testDataDir);
    }
    
    // 重置内存状态
    this.collections.clear();
    this.mockDatabase.clear();
    this.transactions = [];
    this.seedData.clear();
  }

  /**
   * 重置到初始状态
   */
  async reset() {
    await this.cleanup();
    await this.initialize();
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查文档是否匹配过滤器
   * @param {Object} doc - 文档对象
   * @param {Object} filter - 过滤器对象
   * @returns {boolean} 是否匹配
   */
  matchesFilter(doc, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 应用更新操作
   * @param {Object} doc - 原文档
   * @param {Object} update - 更新操作
   * @returns {Object} 更新后的文档
   */
  applyUpdate(doc, update) {
    const updatedDoc = { ...doc };
    
    if (update.$set) {
      Object.assign(updatedDoc, update.$set);
    }
    
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        updatedDoc[key] = (updatedDoc[key] || 0) + value;
      }
    }
    
    if (update.$push) {
      for (const [key, value] of Object.entries(update.$push)) {
        if (!updatedDoc[key]) updatedDoc[key] = [];
        updatedDoc[key].push(value);
      }
    }
    
    return updatedDoc;
  }

  /**
   * 应用排序
   * @param {Array} results - 结果数组
   * @param {Object} sort - 排序对象
   * @returns {Array} 排序后的结果
   */
  applySorting(results, sort) {
    return results.sort((a, b) => {
      for (const [key, direction] of Object.entries(sort)) {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return direction === 1 ? -1 : 1;
        if (aVal > bVal) return direction === 1 ? 1 : -1;
      }
      return 0;
    });
  }
}

module.exports = DatabaseTestFixtures;