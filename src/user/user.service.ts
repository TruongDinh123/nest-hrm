import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import User from '../entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from './dto/updateUser.dto';
import { Cache } from 'cache-manager';
import { GetUsersQueryDto } from './dto/pagination.dto';
import { UserRole, UserRoles } from 'src/entities/user-role.entity';
import RegisterDto from 'src/authentication/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserRole)
    private rolesRepository: Repository<UserRole>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async getByEmail(email: string) {
    console.log('🚀 ~ email:', email);
    const user = await this.usersRepository.findOne({
      where: {
        email: email,
        isActive: true,
      },
    });
    console.log('🚀 ~ user:', user);
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this email does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async getRoleByName(roleName: UserRoles) {
    const role = await this.rolesRepository.findOne({
      where: { role: roleName },
    });
    if (role) {
      return role;
    }
    throw new HttpException(
      'Role with this name does not exist',
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

  private generateUserCacheKey(
    search?: string,
    page?: number,
    limit?: number,
  ): string {
    return `users_${search || 'all'}_${page || 1}_${limit || 10}`;
  }

  async getAllUsers(query: GetUsersQueryDto) {
    const { search, page = 1, limit = 10 } = query;
    const cacheKey = this.generateUserCacheKey(search, page, limit);

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('user.name LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await queryBuilder
      .where('user.isActive = :isActive', { isActive: true })
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheManager.set(cacheKey, result, 3600000);

    return result;
  }

  async markEmailAsConfirmed(email: string) {
    return this.usersRepository.update(
      { email },
      {
        isEmailConfirmed: true,
      },
    );
  }

  async getById(userId: number) {
    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
        isActive: true,
      },
      relations: ['role'],
    });
    console.log('🚀 ~ user:', user);
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async create(userData: RegisterDto) {
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

  async updateUser(userId: number, userData: UpdateUserDto) {
    await this.usersRepository.update(userId, userData);
    const updateUser = await this.getById(userId);
    await this.invalidateUserCache();
    return updateUser;
  }

  async deactivateUser(userId: number, requestUserId: number) {
    const user = await this.getById(userId);

    if (user.id === requestUserId) {
      throw new HttpException(
        'You are not allowed to deactivate yourself',
        HttpStatus.FORBIDDEN,
      );
    }

    user.isActive = false;
    user.currentHashedRefreshToken = null;

    await this.usersRepository.save(user);
    await this.invalidateUserCache();
    return user;
  }

  private async invalidateUserCache(): Promise<void> {
    const keys = await this.cacheManager.store.keys();
    const userCacheKeys = keys.filter((key) => key.startsWith('users_'));
    await Promise.all(userCacheKeys.map((key) => this.cacheManager.del(key)));
  }
}

export default UsersService;
