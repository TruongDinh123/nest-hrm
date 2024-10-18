import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { MoreThan, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ApiKey } from '@app/common';
import User from '@app/common/entities/user.entity';

@Injectable()
export class ApiKeyService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {
    this.checkRedisConnection();
  }

  private async checkRedisConnection() {
    try {
      await this.cacheManager.set('test_key', 'test_value', 10);
      const testValue = await this.cacheManager.get('test_key');
      console.log('Redis connection successful. Test value:', testValue);
    } catch (error) {
      console.error('Redis connection failed:', error);
    }
  }

  private readonly API_KEY_PREFIX = 'api_key:';

  async createApiKey(user: User): Promise<string> {
    const key = uuidv4();
    const hashedKey = this.hashKey(key);
    const { id, name, email, role } = user;
    const apiKey = this.apiKeyRepository.create({
      key: hashedKey,
      user: { id, name, email, role },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await this.apiKeyRepository.save(apiKey);

    // Cache API key in redis:
    const cacheKey = this.API_KEY_PREFIX + hashedKey;

    const cacheValue = JSON.stringify({
      expiresAt: apiKey.expiresAt,
      user: { id, name, email, role },
    });

    try {
      await this.cacheManager.set(cacheKey, cacheValue, 3600000);
    } catch (error) {
      console.error('Error setting cache:', error);
    }

    return hashedKey;
  }

  async getValidApiKeyForUser(userId: number): Promise<string | null> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { userId, isActive: true, expiresAt: MoreThan(new Date()) },
    });
    return apiKey ? apiKey.key : null;
  }

  private cacheHits = 0;
  private dbHits = 0;

  async validateApiKey(apiKey: string) {
    const cacheKey = this.API_KEY_PREFIX + apiKey;

    const cachedApiKey = await this.cacheManager.get(cacheKey);
    if (cachedApiKey) {
      this.cacheHits++;
      console.log('Cache hit for API key:', this.cacheHits);

      const { expiresAt, user } = JSON.parse(cachedApiKey as string);

      if (new Date(expiresAt) < new Date()) {
        throw new UnauthorizedException('API key has expired');
      }
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify({ expiresAt, user }),
        3600000,
      );
      return user;
    }

    console.log('Cache miss, querying database...');
    this.dbHits++;
    console.log(`Total database hits: ${this.dbHits}`);

    const apiKeyCache = await this.apiKeyRepository.findOne({
      where: { key: apiKey, isActive: true },
    });

    if (!apiKeyCache) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKeyCache.expiresAt && apiKeyCache.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    await this.cacheManager.set(
      this.API_KEY_PREFIX + apiKey,
      JSON.stringify({
        expiresAt: apiKeyCache.expiresAt,
        user: apiKeyCache.user,
      }),
      3600000,
    );

    return apiKeyCache;
  }

  async deactivateApiKey(apiKey: string): Promise<void> {
    console.log('🚀 ~ apiKey:', apiKey);
    const apiKeyCurrent = await this.apiKeyRepository.findOne({
      where: { key: apiKey },
    });
    console.log('🚀 ~ apiKeyCurrent:', apiKeyCurrent);
    if (apiKey) {
      await this.apiKeyRepository.delete(apiKeyCurrent.id);
      await this.cacheManager.del(this.API_KEY_PREFIX + apiKey);
    }
  }

  async refreshApiKey(key: string): Promise<string> {
    const hashedKey = this.hashKey(key);
    const apiKey = await this.apiKeyRepository.findOne({
      where: { key: hashedKey, isActive: true },
    });
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Generate new key
    const newKey = uuidv4();
    const newHashedKey = this.hashKey(newKey);

    // Update database
    apiKey.key = newHashedKey;
    apiKey.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.apiKeyRepository.save(apiKey);

    // Update cache
    await this.cacheManager.del(this.API_KEY_PREFIX + hashedKey);
    await this.cacheManager.set(
      this.API_KEY_PREFIX + newHashedKey,
      JSON.stringify({ userId: apiKey.userId, expiresAt: apiKey.expiresAt }),
      3600000,
    );

    return newKey;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
