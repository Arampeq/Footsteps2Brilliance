import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { EvaluationResult } from '../evaluation/evaluation.types';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

@Injectable()
export class EvaluationCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvaluationCacheService.name);
  private client: Redis;
  private available = false;
  private readonly ttlSeconds: number;

  constructor(private readonly config: ConfigService) {
    const redisUrl =
      this.config.get<string>('REDIS_URL')?.trim() || DEFAULT_REDIS_URL;
    this.ttlSeconds =
      Number.parseInt(
        this.config.get<string>('CACHE_TTL_SECONDS', '604800'),
        10,
      ) || 604800;

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
      this.available = false;
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.ping();
      this.available = true;
      this.logger.log(`Redis cache connected (TTL ${this.ttlSeconds}s)`);
    } catch (err) {
      this.logger.warn(`Redis unavailable — caching disabled: ${err}`);
      this.available = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  isActive(): boolean {
    return this.available;
  }

  normalizeBookUrl(url: string): string {
    return url.trim().replace(/\/$/, '');
  }

  buildKey(normalizedUrl: string): string {
    const id = normalizedUrl.split('/').pop() ?? normalizedUrl;
    return `eval:cab2s:${id}`;
  }

  async get(normalizedUrl: string): Promise<EvaluationResult | null> {
    if (!this.isActive()) return null;

    try {
      const raw = await this.client.get(this.buildKey(normalizedUrl));
      if (!raw) return null;
      return JSON.parse(raw) as EvaluationResult;
    } catch (err) {
      this.logger.warn(`Cache get failed: ${err}`);
      return null;
    }
  }

  async set(normalizedUrl: string, result: EvaluationResult): Promise<void> {
    if (!this.isActive()) return;

    try {
      const payload = { ...result };
      delete (payload as { cached?: boolean }).cached;
      await this.client.setex(
        this.buildKey(normalizedUrl),
        this.ttlSeconds,
        JSON.stringify(payload),
      );
    } catch (err) {
      this.logger.warn(`Cache set failed: ${err}`);
    }
  }
}
