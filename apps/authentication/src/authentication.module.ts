import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { PassportModule } from '@nestjs/passport';
import { AuthenticationController } from './authentication.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfirmationModule } from './emailConfirmation/emailConfirmation.module';
import { ApiKey } from '@app/common';
import { ApiKeyService } from './api-key/api-key.service';
import { LocalStrategy } from './strategy/local.strategy';
import { UserModule } from '@apps/user/src/user.module';

@Module({
  imports: [
    UserModule,
    PassportModule,
    ConfigModule,
    EmailConfirmationModule,
    TypeOrmModule.forFeature([ApiKey]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      }),
    }),
  ],
  providers: [AuthenticationService, ApiKeyService, LocalStrategy],
  controllers: [AuthenticationController],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
