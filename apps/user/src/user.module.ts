import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import User from '@app/common/entities/user.entity';
import { UserRole, UsersRepository } from '@app/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, UserRole])],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: 'UsersRepositoryInterface', useClass: UsersRepository },
  ],
})
export class UserModule {}
