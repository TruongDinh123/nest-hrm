import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from 'src/entities/key-token.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      }),
    }),
    TypeOrmModule.forFeature([ApiKey]),
  ],
  providers: [ApiKeyService],
  controllers: [],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
