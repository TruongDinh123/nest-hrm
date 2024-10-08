import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import User from '../entities/user.entity';
import { Repository } from 'typeorm';
import CreateUserDto from './user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async getByEmail(email: string) {
    const user = await this.usersRepository.findOne({
      where: {
        email: email,
      },
    });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this email does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async getById(userId: number) {
    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async create(userData: CreateUserDto) {
    const newUser = await this.usersRepository.create(userData);
    await this.usersRepository.save(newUser);
    return newUser;
  }

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.usersRepository.update(userId, {
      currentHashedRefreshToken: currentHashedRefreshToken,
    });

    const updatedUser = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (
      !updatedUser ||
      updatedUser.currentHashedRefreshToken !== currentHashedRefreshToken
    ) {
      throw new Error('Failed to update refresh token');
    }

    return updatedUser;
  }

  async removeRefreshToken(userId: number) {
    return this.usersRepository.update(userId, {
      currentHashedRefreshToken: null,
    });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
    const user = await this.getById(userId);

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );

    if (isRefreshTokenMatching) {
      return user;
    }
  }
}

export default UsersService;
