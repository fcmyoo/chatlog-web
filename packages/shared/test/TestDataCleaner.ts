import * as fs from 'fs-extra'
import * as path from 'path'

// 声明全局类型以避免TypeScript错误
declare global {
  var jest: any
  var vi: any
}

/**
 * 测试数据清理工具类
 * 提供统一的测试数据清理和管理功能
 */
export class TestDataCleaner {
  private testDataPaths: Set<string> = new Set()
  private tempFiles: Set<string> = new Set()
  private mockObjects: Map<string, any> = new Map()
  private cleanupCallbacks: Array<() => Promise<void> | void> = []

  constructor(private options: {
    baseTestDataDir?: string
    autoCleanup?: boolean
    retainOnFailure?: boolean
  } = {}) {
    this.options = {
      baseTestDataDir: path.join(process.cwd(), 'test-data'),
      autoCleanup: true,
      retainOnFailure: false,
      ...options
    }

    // 如果启用自动清理，在进程退出时清理
    if (this.options.autoCleanup) {
      this.setupAutoCleanup()
    }
  }

  /**
   * 注册测试数据路径
   * @param dataPath - 数据路径
   */
  registerTestDataPath(dataPath: string): void {
    this.testDataPaths.add(path.resolve(dataPath))
  }

  /**
   * 注册临时文件
   * @param filePath - 文件路径
   */
  registerTempFile(filePath: string): void {
    this.tempFiles.add(path.resolve(filePath))
  }

  /**
   * 注册模拟对象
   * @param name - 对象名称
   * @param mockObject - 模拟对象
   */
  registerMockObject(name: string, mockObject: any): void {
    this.mockObjects.set(name, mockObject)
  }

  /**
   * 注册清理回调函数
   * @param callback - 清理回调函数
   */
  registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.push(callback)
  }

  /**
   * 创建临时测试文件
   * @param filename - 文件名
   * @param content - 文件内容
   * @param subDir - 子目录
   * @returns 文件路径
   */
  async createTempTestFile(filename: string, content: any, subDir?: string): Promise<string> {
    const dir = subDir 
      ? path.join(this.options.baseTestDataDir!, subDir)
      : this.options.baseTestDataDir!
    
    await fs.ensureDir(dir)
    const filePath = path.join(dir, filename)
    
    if (typeof content === 'object') {
      await fs.writeJson(filePath, content, { spaces: 2 })
    } else {
      await fs.writeFile(filePath, content, 'utf8')
    }
    
    this.registerTempFile(filePath)
    this.registerTestDataPath(dir)
    
    return filePath
  }

  /**
   * 创建临时测试目录
   * @param dirName - 目录名
   * @param subDir - 父目录
   * @returns 目录路径
   */
  async createTempTestDir(dirName: string, subDir?: string): Promise<string> {
    const parentDir = subDir 
      ? path.join(this.options.baseTestDataDir!, subDir)
      : this.options.baseTestDataDir!
    
    const dirPath = path.join(parentDir, dirName)
    await fs.ensureDir(dirPath)
    
    this.registerTestDataPath(dirPath)
    
    return dirPath
  }

  /**
   * 清理指定的测试文件
   * @param filePath - 文件路径
   */
  async cleanupTestFile(filePath: string): Promise<void> {
    try {
      const resolvedPath = path.resolve(filePath)
      if (await fs.pathExists(resolvedPath)) {
        await fs.remove(resolvedPath)
        console.log(`已清理测试文件: ${resolvedPath}`)
      }
      this.tempFiles.delete(resolvedPath)
    } catch (error) {
      console.warn(`清理测试文件失败: ${filePath}`, error)
    }
  }

  /**
   * 清理指定的测试目录
   * @param dirPath - 目录路径
   */
  async cleanupTestDir(dirPath: string): Promise<void> {
    try {
      const resolvedPath = path.resolve(dirPath)
      if (await fs.pathExists(resolvedPath)) {
        await fs.remove(resolvedPath)
        console.log(`已清理测试目录: ${resolvedPath}`)
      }
      this.testDataPaths.delete(resolvedPath)
    } catch (error) {
      console.warn(`清理测试目录失败: ${dirPath}`, error)
    }
  }

  /**
   * 清理所有临时文件
   */
  async cleanupTempFiles(): Promise<void> {
    console.log(`开始清理 ${this.tempFiles.size} 个临时文件...`)
    
    const cleanupPromises = Array.from(this.tempFiles).map(async (filePath) => {
      await this.cleanupTestFile(filePath)
    })
    
    await Promise.allSettled(cleanupPromises)
    this.tempFiles.clear()
  }

  /**
   * 清理所有测试数据目录
   */
  async cleanupTestDataDirs(): Promise<void> {
    console.log(`开始清理 ${this.testDataPaths.size} 个测试数据目录...`)
    
    const cleanupPromises = Array.from(this.testDataPaths).map(async (dirPath) => {
      await this.cleanupTestDir(dirPath)
    })
    
    await Promise.allSettled(cleanupPromises)
    this.testDataPaths.clear()
  }

  /**
   * 清理所有模拟对象
   */
  cleanupMockObjects(): void {
    console.log(`开始清理 ${this.mockObjects.size} 个模拟对象...`)
    
    for (const [name, mockObject] of this.mockObjects) {
      try {
        // 如果是Jest模拟，清理它
        if (typeof mockObject?.mockClear === 'function') {
          mockObject.mockClear()
        }
        if (typeof mockObject?.mockReset === 'function') {
          mockObject.mockReset()
        }
        if (typeof mockObject?.mockRestore === 'function') {
          mockObject.mockRestore()
        }
        
        // 如果是Vitest模拟，清理它
        if (typeof mockObject?.mockClear === 'function') {
          mockObject.mockClear()
        }
        if (typeof mockObject?.mockReset === 'function') {
          mockObject.mockReset()
        }
        if (typeof mockObject?.mockRestore === 'function') {
          mockObject.mockRestore()
        }
        
        console.log(`已清理模拟对象: ${name}`)
      } catch (error) {
        console.warn(`清理模拟对象失败: ${name}`, error)
      }
    }
    
    this.mockObjects.clear()
  }

  /**
   * 执行自定义清理回调
   */
  async executeCleanupCallbacks(): Promise<void> {
    console.log(`开始执行 ${this.cleanupCallbacks.length} 个清理回调...`)
    
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback()
      } catch (error) {
        console.warn('执行清理回调失败:', error)
      }
    }
    
    this.cleanupCallbacks = []
  }

  /**
   * 清理Jest/Vitest全局模拟
   */
  cleanupGlobalMocks(): void {
    try {
      // 清理Jest模拟
      if (typeof jest !== 'undefined') {
        jest.clearAllMocks()
        jest.resetAllMocks()
        jest.restoreAllMocks()
        console.log('已清理Jest全局模拟')
      }
      
      // 清理Vitest模拟
      if (typeof vi !== 'undefined') {
        vi.clearAllMocks()
        vi.resetAllMocks()
        vi.restoreAllMocks()
        console.log('已清理Vitest全局模拟')
      }
    } catch (error) {
      console.warn('清理全局模拟失败:', error)
    }
  }

  /**
   * 清理环境变量
   * @param envVars - 要清理的环境变量名数组
   */
  cleanupEnvironmentVariables(envVars: string[]): void {
    console.log(`开始清理 ${envVars.length} 个环境变量...`)
    
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        delete process.env[envVar]
        console.log(`已清理环境变量: ${envVar}`)
      }
    }
  }

  /**
   * 执行完整清理
   * @param options - 清理选项
   */
  async cleanup(options: {
    files?: boolean
    dirs?: boolean
    mocks?: boolean
    callbacks?: boolean
    globalMocks?: boolean
    envVars?: string[]
  } = {}): Promise<void> {
    const {
      files = true,
      dirs = true,
      mocks = true,
      callbacks = true,
      globalMocks = true,
      envVars = []
    } = options

    console.log('开始执行测试数据清理...')
    
    try {
      // 执行自定义清理回调
      if (callbacks) {
        await this.executeCleanupCallbacks()
      }
      
      // 清理临时文件
      if (files) {
        await this.cleanupTempFiles()
      }
      
      // 清理测试数据目录
      if (dirs) {
        await this.cleanupTestDataDirs()
      }
      
      // 清理模拟对象
      if (mocks) {
        this.cleanupMockObjects()
      }
      
      // 清理全局模拟
      if (globalMocks) {
        this.cleanupGlobalMocks()
      }
      
      // 清理环境变量
      if (envVars.length > 0) {
        this.cleanupEnvironmentVariables(envVars)
      }
      
      console.log('测试数据清理完成')
    } catch (error) {
      console.error('测试数据清理过程中发生错误:', error)
      throw error
    }
  }

  /**
   * 重置清理器状态
   */
  reset(): void {
    this.testDataPaths.clear()
    this.tempFiles.clear()
    this.mockObjects.clear()
    this.cleanupCallbacks = []
  }

  /**
   * 获取清理统计信息
   */
  getCleanupStats(): {
    tempFiles: number
    testDataPaths: number
    mockObjects: number
    cleanupCallbacks: number
  } {
    return {
      tempFiles: this.tempFiles.size,
      testDataPaths: this.testDataPaths.size,
      mockObjects: this.mockObjects.size,
      cleanupCallbacks: this.cleanupCallbacks.length
    }
  }

  /**
   * 设置自动清理
   */
  private setupAutoCleanup(): void {
    const cleanupHandler = async () => {
      if (!this.options.retainOnFailure || process.exitCode === 0) {
        await this.cleanup()
      }
    }

    // 监听进程退出事件
    process.on('exit', () => {
      // 同步清理（进程退出时不能使用异步）
      try {
        this.cleanupGlobalMocks()
        this.cleanupMockObjects()
      } catch (error) {
        console.warn('自动清理失败:', error)
      }
    })

    // 监听未捕获异常
    process.on('uncaughtException', async (error) => {
      console.error('未捕获异常，执行清理:', error)
      await cleanupHandler()
      process.exit(1)
    })

    // 监听未处理的Promise拒绝
    process.on('unhandledRejection', async (reason) => {
      console.error('未处理的Promise拒绝，执行清理:', reason)
      await cleanupHandler()
      process.exit(1)
    })

    // 监听SIGINT信号（Ctrl+C）
    process.on('SIGINT', async () => {
      console.log('\n收到SIGINT信号，执行清理...')
      await cleanupHandler()
      process.exit(0)
    })

    // 监听SIGTERM信号
    process.on('SIGTERM', async () => {
      console.log('收到SIGTERM信号，执行清理...')
      await cleanupHandler()
      process.exit(0)
    })
  }
}

/**
 * 创建全局测试数据清理器实例
 */
export const globalTestDataCleaner = new TestDataCleaner()

/**
 * 便捷的清理函数
 */
export const cleanupTestData = async (options?: Parameters<TestDataCleaner['cleanup']>[0]) => {
  await globalTestDataCleaner.cleanup(options)
}

export default TestDataCleaner