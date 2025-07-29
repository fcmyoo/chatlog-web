/**
 * 测试结果处理器
 * 用于生成详细的测试报告和分析
 */

import fs from 'fs-extra';
import path from 'path';

class TestResultsProcessor {
  constructor() {
    this.reportDir = path.join(process.cwd(), 'coverage/reports');
  }

  /**
   * 处理测试结果
   */
  async process(results) {
    try {
      await fs.ensureDir(this.reportDir);
      
      // 生成测试摘要报告
      const summary = this.generateSummary(results);
      await this.saveReport('test-summary.json', summary);
      
      // 生成详细测试报告
      const detailedReport = this.generateDetailedReport(results);
      await this.saveReport('test-detailed.json', detailedReport);
      
      // 生成性能分析报告
      const performanceReport = this.generatePerformanceReport(results);
      await this.saveReport('test-performance.json', performanceReport);
      
      // 生成失败测试分析
      if (results.numFailedTests > 0) {
        const failureAnalysis = this.generateFailureAnalysis(results);
        await this.saveReport('test-failures.json', failureAnalysis);
      }
      
      console.log(`📊 测试报告已生成: ${this.reportDir}`);
      
      return results;
    } catch (error) {
      console.error('生成测试报告失败:', error);
      return results;
    }
  }

  /**
   * 生成测试摘要
   */
  generateSummary(results) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.numTotalTests,
        passedTests: results.numPassedTests,
        failedTests: results.numFailedTests,
        skippedTests: results.numPendingTests,
        totalTestSuites: results.numTotalTestSuites,
        passedTestSuites: results.numPassedTestSuites,
        failedTestSuites: results.numFailedTestSuites,
        testRunTime: results.testResults.reduce((total, suite) => total + suite.perfStats.runtime, 0),
        success: results.success
      },
      coverage: this.extractCoverageInfo(results),
      performance: {
        averageTestTime: this.calculateAverageTestTime(results),
        slowestTests: this.findSlowestTests(results, 5),
        fastestTests: this.findFastestTests(results, 5)
      }
    };
  }

  /**
   * 生成详细测试报告
   */
  generateDetailedReport(results) {
    return {
      timestamp: new Date().toISOString(),
      testSuites: results.testResults.map(suite => ({
        name: suite.testFilePath.replace(process.cwd(), ''),
        status: suite.numFailingTests > 0 ? 'failed' : 'passed',
        runtime: suite.perfStats.runtime,
        tests: {
          total: suite.numTotalTests,
          passed: suite.numPassingTests,
          failed: suite.numFailingTests,
          pending: suite.numPendingTests
        },
        failureMessages: suite.failureMessage ? [suite.failureMessage] : [],
        coverage: suite.coverage || null
      }))
    };
  }

  /**
   * 生成性能分析报告
   */
  generatePerformanceReport(results) {
    const testTimes = [];
    
    results.testResults.forEach(suite => {
      suite.testResults.forEach(test => {
        testTimes.push({
          name: `${suite.testFilePath.split('/').pop()} > ${test.title}`,
          duration: test.duration || 0,
          status: test.status
        });
      });
    });

    testTimes.sort((a, b) => b.duration - a.duration);

    return {
      timestamp: new Date().toISOString(),
      performance: {
        totalRuntime: results.testResults.reduce((total, suite) => total + suite.perfStats.runtime, 0),
        averageTestTime: testTimes.reduce((sum, test) => sum + test.duration, 0) / testTimes.length,
        slowestTests: testTimes.slice(0, 10),
        testTimeDistribution: this.calculateTimeDistribution(testTimes),
        memoryUsage: process.memoryUsage(),
        recommendations: this.generatePerformanceRecommendations(testTimes)
      }
    };
  }

  /**
   * 生成失败测试分析
   */
  generateFailureAnalysis(results) {
    const failures = [];
    
    results.testResults.forEach(suite => {
      if (suite.numFailingTests > 0) {
        suite.testResults.forEach(test => {
          if (test.status === 'failed') {
            failures.push({
              suite: suite.testFilePath.replace(process.cwd(), ''),
              test: test.title,
              error: test.failureMessages[0] || 'Unknown error',
              duration: test.duration || 0,
              location: test.location || null
            });
          }
        });
      }
    });

    return {
      timestamp: new Date().toISOString(),
      failures: {
        count: failures.length,
        details: failures,
        patterns: this.analyzeFailurePatterns(failures),
        suggestions: this.generateFailureSuggestions(failures)
      }
    };
  }

  /**
   * 提取覆盖率信息
   */
  extractCoverageInfo(results) {
    // Jest会在全局对象中提供覆盖率信息
    if (global.__coverage__) {
      const coverage = global.__coverage__;
      const files = Object.keys(coverage);
      
      let totalStatements = 0;
      let coveredStatements = 0;
      let totalBranches = 0;
      let coveredBranches = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalLines = 0;
      let coveredLines = 0;

      files.forEach(file => {
        const fileCoverage = coverage[file];
        
        totalStatements += Object.keys(fileCoverage.s).length;
        coveredStatements += Object.values(fileCoverage.s).filter(count => count > 0).length;
        
        totalBranches += Object.keys(fileCoverage.b).length;
        coveredBranches += Object.values(fileCoverage.b).filter(branches => branches.some(count => count > 0)).length;
        
        totalFunctions += Object.keys(fileCoverage.f).length;
        coveredFunctions += Object.values(fileCoverage.f).filter(count => count > 0).length;
        
        totalLines += Object.keys(fileCoverage.l).length;
        coveredLines += Object.values(fileCoverage.l).filter(count => count > 0).length;
      });

      return {
        statements: { total: totalStatements, covered: coveredStatements, percentage: (coveredStatements / totalStatements * 100).toFixed(2) },
        branches: { total: totalBranches, covered: coveredBranches, percentage: (coveredBranches / totalBranches * 100).toFixed(2) },
        functions: { total: totalFunctions, covered: coveredFunctions, percentage: (coveredFunctions / totalFunctions * 100).toFixed(2) },
        lines: { total: totalLines, covered: coveredLines, percentage: (coveredLines / totalLines * 100).toFixed(2) }
      };
    }
    
    return null;
  }

  /**
   * 计算平均测试时间
   */
  calculateAverageTestTime(results) {
    const totalTests = results.numTotalTests;
    const totalTime = results.testResults.reduce((total, suite) => total + suite.perfStats.runtime, 0);
    return totalTests > 0 ? (totalTime / totalTests).toFixed(2) : 0;
  }

  /**
   * 查找最慢的测试
   */
  findSlowestTests(results, count = 5) {
    const tests = [];
    
    results.testResults.forEach(suite => {
      suite.testResults.forEach(test => {
        tests.push({
          name: `${suite.testFilePath.split('/').pop()} > ${test.title}`,
          duration: test.duration || 0
        });
      });
    });

    return tests.sort((a, b) => b.duration - a.duration).slice(0, count);
  }

  /**
   * 查找最快的测试
   */
  findFastestTests(results, count = 5) {
    const tests = [];
    
    results.testResults.forEach(suite => {
      suite.testResults.forEach(test => {
        if (test.duration > 0) {
          tests.push({
            name: `${suite.testFilePath.split('/').pop()} > ${test.title}`,
            duration: test.duration
          });
        }
      });
    });

    return tests.sort((a, b) => a.duration - b.duration).slice(0, count);
  }

  /**
   * 计算时间分布
   */
  calculateTimeDistribution(testTimes) {
    const ranges = [
      { min: 0, max: 100, label: '0-100ms' },
      { min: 100, max: 500, label: '100-500ms' },
      { min: 500, max: 1000, label: '500ms-1s' },
      { min: 1000, max: 5000, label: '1-5s' },
      { min: 5000, max: Infinity, label: '5s+' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: testTimes.filter(test => test.duration >= range.min && test.duration < range.max).length
    }));
  }

  /**
   * 生成性能建议
   */
  generatePerformanceRecommendations(testTimes) {
    const recommendations = [];
    const slowTests = testTimes.filter(test => test.duration > 1000);
    
    if (slowTests.length > 0) {
      recommendations.push(`发现 ${slowTests.length} 个慢测试（>1秒），建议优化或使用模拟对象`);
    }
    
    const verySlowTests = testTimes.filter(test => test.duration > 5000);
    if (verySlowTests.length > 0) {
      recommendations.push(`发现 ${verySlowTests.length} 个非常慢的测试（>5秒），强烈建议重构`);
    }
    
    return recommendations;
  }

  /**
   * 分析失败模式
   */
  analyzeFailurePatterns(failures) {
    const patterns = {};
    
    failures.forEach(failure => {
      const errorType = this.categorizeError(failure.error);
      patterns[errorType] = (patterns[errorType] || 0) + 1;
    });
    
    return patterns;
  }

  /**
   * 分类错误类型
   */
  categorizeError(error) {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('network') || error.includes('ECONNREFUSED')) return 'network';
    if (error.includes('assertion') || error.includes('expect')) return 'assertion';
    if (error.includes('mock') || error.includes('spy')) return 'mocking';
    return 'other';
  }

  /**
   * 生成失败建议
   */
  generateFailureSuggestions(failures) {
    const suggestions = [];
    
    const timeoutFailures = failures.filter(f => f.error.includes('timeout'));
    if (timeoutFailures.length > 0) {
      suggestions.push('考虑增加测试超时时间或优化异步操作');
    }
    
    const networkFailures = failures.filter(f => f.error.includes('network') || f.error.includes('ECONNREFUSED'));
    if (networkFailures.length > 0) {
      suggestions.push('检查网络模拟配置或外部服务依赖');
    }
    
    return suggestions;
  }

  /**
   * 保存报告
   */
  async saveReport(filename, data) {
    const filepath = path.join(this.reportDir, filename);
    await fs.writeJSON(filepath, data, { spaces: 2 });
  }
}

// 导出处理函数
export default (results) => {
  const processor = new TestResultsProcessor();
  return processor.process(results);
};