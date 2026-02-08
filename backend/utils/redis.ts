import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  console.warn('UPSTASH_REDIS_URL not set. Redis features will be disabled.');
}

// Create Redis connection for BullMQ
export const redis = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}) : null;

// Test connection
if (redis) {
  redis.on('connect', () => {
    console.log('✅ Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
  });
}

export default redis;
