import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from '@hapi/joi';
// import { GoogleAuthenticationModule } from './googleAuthentication/googleAuthentication.module';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from './user/src/user.module';
import { AuthenticationModule } from './authentication/src/authentication.module';
import { DatabaseModule } from '@app/common';
import { ApiKeyModule } from './authentication/src/api-key/api-key.module';
import { ApiKeyGuard } from './authentication/src/guard/api-key.guard';
import { EmailConfirmationModule } from './authentication/src/emailConfirmation/emailConfirmation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        PORT: Joi.number(),

        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.string().required(),

        JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().required(),

        JWT_VERIFICATION_TOKEN_SECRET: Joi.string().required(),
        JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: Joi.string().required(),

        ACCESS_COOKIE_NAME: Joi.string().required(),
        REFRESH_COOKIE_NAME: Joi.string().required(),

        PASSWORD_RESET_URL: Joi.string().required(),

        EMAIL_CONFIRMATION_URL: Joi.string().required(),
        EMAIL_SERVICE: Joi.string().required(),
        EMAIL_USER: Joi.string().required(),
        EMAIL_PASSWORD: Joi.string().required(),

        GOOGLE_AUTH_CLIENT_ID: Joi.string().required(),
        GOOGLE_AUTH_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),

        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
      }),
    }),
    DatabaseModule,
    AuthenticationModule,
    ApiKeyModule,
    // GoogleAuthenticationModule,
    EmailConfirmationModule,
    UserModule,
  ],
  controllers: [],
  providers: [ConfigService, { provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
