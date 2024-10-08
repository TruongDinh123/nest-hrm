import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import User from '../entities/user.entity';
import { UsersService } from './user.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [],
  exports: [UsersService],
})
export class UsersModule {}
