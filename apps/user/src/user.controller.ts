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
import { UpdateUserDto } from './dto/updateUser.dto';
import { GetUsersQueryDto } from './dto/pagination.dto';
import { UserService } from './user.service';
import { Roles, UserRoles } from '@app/common';
import { RolesGuard } from 'apps/authentication/src/guard/role.guard';
import RequestWithUser from 'apps/authentication/src/strategy/requestWithUser.interface';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UserService) {}

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
