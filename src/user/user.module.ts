import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import User from '../entities/user.entity';
import { UsersService } from './user.service';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user.controller';
import { JwtStrategy } from 'src/authentication/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService, JwtStrategy],
  controllers: [UserController],
  exports: [UsersService],
})
export class UsersModule {}
