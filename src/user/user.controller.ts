import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import UsersService from './user.service';
import JwtAuthenticationGuard from 'src/authentication/jwt-authentication.guard';
import { format } from 'date-fns';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  async getAllUsers(
    @Query('lastId') lastId: string = '0',
    @Query('lastCreatedAt') lastCreatedAt: string = new Date(0).toISOString(),
    @Query('limit') limit: string = '20',
  ) {
    console.log('Received request with:', { lastId, lastCreatedAt, limit });
    const formattedLastCreatedAt = format(
      new Date(lastCreatedAt),
      'yyyy-MM-dd HH:mm:ss.SSSSSS',
    );
    const users = await this.usersService.getAllUsers(
      parseInt(lastId, 10),
      formattedLastCreatedAt,
      parseInt(limit, 10),
    );
    return users;
  }
}
