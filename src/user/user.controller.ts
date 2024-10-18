import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import UsersService from './user.service';
import { UpdateUserDto } from './dto/updateUser.dto';
import { GetUsersQueryDto } from './dto/pagination.dto';
import { Roles } from 'src/decorators/role.decorator';
import { UserRoles } from 'src/entities/user-role.entity';
import { RolesGuard } from 'src/authentication/role.guard';
import RequestWithUser from 'src/authentication/requestWithUser.interface';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRoles.USER, UserRoles.ADMIN, UserRoles.OWNER)
  @UseGuards(RolesGuard)
  @Get()
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return this.usersService.getAllUsers(query);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: number, @Body() userData: UpdateUserDto) {
    return this.usersService.updateUser(id, userData);
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN, UserRoles.OWNER)
  @UseGuards(RolesGuard)
  async deactivateUser(@Param('id') id: number, @Req() req: RequestWithUser) {
    return this.usersService.deactivateUser(id, req.user.id);
  }
}
