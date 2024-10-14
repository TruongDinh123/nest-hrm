import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import User from '../entities/user.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import CreateUserDto from './user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { GetAllUsersParams } from './pagination.dto';

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

  async createWithGoogle(email: string, name: string) {
    const newUser = await this.usersRepository.create({
      email,
      name,
      isRegisteredWithGoogle: true,
    });
    await this.usersRepository.save(newUser);
    return newUser;
  }

  async getAllUsers(params: GetAllUsersParams) {
    const { lastId, lastCreatedAt, limit, offset, searchTerm } = params;
    const queryBuilder = this.createBaseQueryBuilder(searchTerm);
    const totalCount = await queryBuilder.getCount();

    if (offset !== undefined) {
      return this.getOffsetBasedPagination(
        queryBuilder,
        offset,
        limit,
        totalCount,
      );
    }

    return this.getCursorBasedPagination(
      queryBuilder,
      lastId,
      lastCreatedAt,
      limit,
      totalCount,
    );
  }

  async markEmailAsConfirmed(email: string) {
    return this.usersRepository.update(
      { email },
      {
        isEmailConfirmed: true,
      },
    );
  }

  private createBaseQueryBuilder(searchTerm?: string) {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');
    if (searchTerm) {
      queryBuilder.where(
        '(user.name LIKE :searchTerm OR user.email LIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` },
      );
    }
    return queryBuilder;
  }

  private async getOffsetBasedPagination(
    queryBuilder: SelectQueryBuilder<User>,
    offset: number,
    limit: number,
    totalCount: number,
  ) {
    const results = await queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('user.createdAt', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .getMany();

    return this.paginationResult(results, totalCount, limit, null);
  }

  private async getCursorBasedPagination(
    queryBuilder: SelectQueryBuilder<User>,
    lastId: number,
    lastCreatedAt: Date,
    limit: number,
    totalCount: number,
  ) {
    queryBuilder
      .andWhere(
        '(user.createdAt > :lastCreatedAt OR (user.createdAt = :lastCreatedAt AND user.id > :lastId))',
      )
      .setParameters({ lastCreatedAt, lastId })
      .orderBy('user.createdAt', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .take(limit + 1);

    const results = await queryBuilder.getMany();
    const hasMore = results.length > limit;
    if (hasMore) {
      results.pop();
    }

    const nextKey = hasMore
      ? this.getNextKey(results[results.length - 1])
      : null;

    return this.paginationResult(results, totalCount, limit, nextKey);
  }

  private getNextKey(lastUser: User) {
    return {
      id: lastUser.id,
      createdAt: lastUser.createdAt,
    };
  }

  private paginationResult(
    results: User[],
    totalCount: number,
    limit: number,
    nextKey: any,
  ) {
    return {
      results,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      nextKey,
    };
  }

  async getById(userId: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
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
    return await this.usersRepository.update(userId, {
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

  async updatePassword(userId: number, newPassword: string) {
    await this.usersRepository.update(userId, {
      password: newPassword,
    });
  }
}

export default UsersService;
