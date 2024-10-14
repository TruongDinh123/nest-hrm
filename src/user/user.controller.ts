import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import UsersService from './user.service';
import { UpdateUserDto } from './dto/updateUser.dto';
import { GetUsersQueryDto } from './dto/pagination.dto';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return this.usersService.getAllUsers(query);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: number, @Body() userData: UpdateUserDto) {
    return this.usersService.updateUser(id, userData);
  }

  @Delete(':id')
  async deactivateUser(@Param('id') id: number) {
    return this.usersService.deactivateUser(id);
  }
}
