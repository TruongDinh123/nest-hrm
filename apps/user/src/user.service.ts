import { BaseServiceAbstract, UserRoles } from '@app/common';
import User from '@app/common/entities/user.entity';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { UserRolesRepositoryInterface } from './interface/user-role.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { GetUsersQueryDto } from './dto/pagination.dto';
import RegisterDto from 'apps/authentication/src/dto/register.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { UsersRepositoryInterface } from './interface/users.interface';

@Injectable()
export class UserService extends BaseServiceAbstract<User> {
  constructor(
    @Inject('UsersRepositoryInterface')
    private readonly userRepository: UsersRepositoryInterface,
    @Inject('UserRolesRepositoryInterface')
    private readonly userRolesRepository: UserRolesRepositoryInterface,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    super(userRepository);
  }

  async getByEmail(email: string) {
    const user = await this.userRepository.findOneBy({
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
    const role = await this.userRolesRepository.findOneBy({
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

  async getAllUsers(query: GetUsersQueryDto) {
    const { search, page = 1, limit = 10 } = query;

    const allUsers = await this.userRepository.find({
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
    return this.userRepository.preload({
      email,
      isEmailConfirmed: true,
    });
  }

  async getById(userId: number) {
    const user = await this.userRepository.findOneBy({
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
    const newUser = await this.userRepository.create(userData);
    await this.userRepository.save(newUser);
    return newUser;
  }

  async updatePassword(userId: number, newPassword: string) {
    await this.userRepository.preload({
      id: userId,
      password: newPassword,
    });
    const updatePassword = await this.getById(userId);
    return updatePassword;
  }

  async updateUser(userId: number, userData: UpdateUserDto) {
    await this.userRepository.preload({
      id: userId,
      ...userData,
    });
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

    await this.userRepository.save(user);
    return user;
  }
}
