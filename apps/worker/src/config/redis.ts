import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (env.NODE_ENV !== 'development') {
    console.error('Worker Redis error:', err);
  }
});

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
