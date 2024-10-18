import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserRoles } from '@app/common';
import User from '@app/common/entities/user.entity';
import { ApiKeyService } from './api-key/api-key.service';
import PostgresErrorCode from '@app/common/databases/postgresErrorCode.enum';
import { UserService } from '@apps/user/src/user.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UserService,
    private readonly configService: ConfigService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  public async register(registrationData: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    try {
      const userRole = await this.usersService.getRoleByName(UserRoles.USER);
      const createdUser = await this.usersService.create({
        ...registrationData,
        password: hashedPassword,
        roleId: userRole.id,
      });
      createdUser.password = undefined;
      return createdUser;
    } catch (error) {
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async login(user: User) {
    let apiKey = await this.apiKeyService.getValidApiKeyForUser(user.id);
    if (!apiKey) {
      apiKey = await this.apiKeyService.createApiKey(user);
    }
    const cookie = this.createApiKeyCookie(apiKey);
    return { cookie, user };
  }

  private createApiKeyCookie(apiKey: string) {
    return `ApiKey=${apiKey}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
  }

  public async getAuthenticatedUser(email: string, plainTextPassword: string) {
    try {
      const user = await this.usersService.getByEmail(email);
      await this.verifyPassword(plainTextPassword, user.password);
      return user;
    } catch (error) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );
    if (!isPasswordMatching) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async logout(apiKey: string) {
    await this.apiKeyService.deactivateApiKey(apiKey);
    return this.getCookiesForLogOut();
  }

  public getCookiesForLogOut() {
    return ['ApiKey=; HttpOnly; Path=/; Max-Age=0;'];
  }
}
