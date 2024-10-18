import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import RequestWithUser from '../strategy/requestWithUser.interface';
import { ROLES, UserRoles } from '@app/common';
import { UserService } from 'apps/user/src/user.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
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
