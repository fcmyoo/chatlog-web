declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DEEPSEEK_API_KEY: string;
      ENABLE_SCHEDULED_ANALYSIS: string;
      SCHEDULED_ANALYSIS_TIME: string;
      MAX_CONCURRENT_ANALYSIS: string;
      RETRY_ATTEMPTS: string;
      RETRY_DELAY: string;
    }
  }
}

export {};