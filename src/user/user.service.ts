import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import User from '../entities/user.entity';
import { Repository } from 'typeorm';
import CreateUserDto from './user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as cookie from 'cookie';

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

  async getAllUsers(lastId: number, lastCreatedAt: string, limit: number) {
    console.log('Fetching users with:', { lastId, lastCreatedAt, limit });

    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('(user.created_date > :lastCreatedAt)', { lastCreatedAt })
      .orWhere('(user.created_date = :lastCreatedAt AND user.id > :lastId)', {
        lastCreatedAt,
        lastId,
      })
      .orderBy('user.created_date', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .take(limit);

    console.log('Generated SQL:', query.getSql());
    console.log('Parameters:', query.getParameters());

    const results = await query.getMany();

    console.log(`Found ${results.length} users`);
    if (results.length > 0) {
      console.log('First user:', results[0]);
      console.log('Last user:', results[results.length - 1]);
    }

    const nextKey =
      results.length > 0
        ? {
            id: results[results.length - 1].id,
            createdAt: results[results.length - 1].createdAt,
          }
        : null;

    return {
      results,
      nextKey,
    };
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

  async logOut(user: User) {
    await this.usersRepository.update(user.id, {
      currentHashedRefreshToken: null,
    });
    const accessCookie = cookie.serialize(
      this.configService.get('ACCESS_COOKIE_NAME'),
      '',
      {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    );
    const refreshCookie = cookie.serialize(
      this.configService.get('REFRESH_COOKIE_NAME'),
      '',
      {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    );

    return { refreshCookie, accessCookie };
  }
}

export default UsersService;
