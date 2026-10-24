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
  // Suppress uncaught exception in development if Redis isn't up immediately, but log it
  if (env.NODE_ENV === 'development') {
    // console.warn('Redis connection issue:', err.message);
  } else {
    console.error('Redis error:', err);
  }
});

export const REDIS_KEYS = {
  LATEST_RELEASE: 'emitmail:system:latest_release',
} as const;

export const SYSTEM_CACHE_TTL = {
  LATEST_RELEASE_SECONDS: 21600, // 6 hours (21,600s)
} as const;

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


