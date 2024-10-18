import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import RequestWithUser from './requestWithUser.interface';
import { ROLES } from 'src/decorators/role.decorator';
import { UserRoles } from 'src/entities/user-role.entity';
import UsersService from 'src/user/user.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoles[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request: RequestWithUser = context.switchToHttp().getRequest();
    const user = await this.userService.getById(request.user.id);

    if (!user || !user.role) {
      return false;
    }

    return requiredRoles.includes(user.role.role as UserRoles);
  }
}
