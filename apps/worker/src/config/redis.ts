import { env } from './env.js';

export const parseRedisConnection = () => {
  try {
    const parsed = new URL(env.REDIS_URL);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port || '6379', 10),
      password: env.REDIS_PASSWORD || parsed.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    };
  }
};

export const bullmqRedisConnection = parseRedisConnection();
