import { Controller, Get, Query } from '@nestjs/common';
import UsersService from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(
    @Query('lastId') lastId?: number,
    @Query('lastCreatedAt') lastCreatedAt?: string,
    @Query('limit') limit = 10,
    @Query('offset') offset?: number,
    @Query('searchTerm') searchTerm?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const params = {
      lastId: lastId ? Number(lastId) : undefined,
      lastCreatedAt: lastCreatedAt ? new Date(lastCreatedAt) : undefined,
      limit: Number(limit),
      offset: offset ? Number(offset) : undefined,
      searchTerm,
      sortOrder,
    };

    return this.usersService.getAllUsers(params);
  }
}
