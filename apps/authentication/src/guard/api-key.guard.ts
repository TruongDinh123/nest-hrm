import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../api-key/api-key.service';
import { IS_PUBLIC_KEY } from '@app/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.cookies['ApiKey'];
    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    return this.validateApiKey(apiKey, request);
  }

  private async validateApiKey(apiKey: string, request: any): Promise<boolean> {
    try {
      const validApiKey = await this.apiKeyService.validateApiKey(apiKey);
      console.log('🚀 ~ validApiKey:', validApiKey);
      request['user'] = {
        userId: validApiKey.id,
        name: validApiKey.name,
        email: validApiKey.email,
        role: validApiKey.role,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
