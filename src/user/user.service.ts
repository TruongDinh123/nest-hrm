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
    const user = await this.usersRepository.findOne({
      where: {
        email: email,
        isActive: true,
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

  async createWithGoogle(email: string, name: string, roleId: number) {
    const newUser = await this.usersRepository.create({
      email,
      name,
      isRegisteredWithGoogle: true,
      roleId: roleId,
    });
    await this.usersRepository.save(newUser);
    return newUser;
  }

  async getAllUsers(query: GetUsersQueryDto) {
    const { search, page = 1, limit = 10 } = query;

    const allUsers = await this.usersRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'email'],
      relations: ['role'],
    });

    let filteredUsers = allUsers;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = allUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.role?.role.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const result = {
      users: paginatedUsers,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };

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
      select: ['id', 'name', 'email'],
      relations: ['role'],
    });
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
    return user;
  }
}

export default UsersService;
