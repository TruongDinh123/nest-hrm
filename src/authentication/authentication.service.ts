import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import PostgresErrorCode from 'src/database/postgresErrorCodes.enum';
import TokenPayload from './tokenPayload.interface';
// import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRoles } from 'src/entities/user-role.entity';
import { ApiKeyService } from './api-key/api-key.service';
import User from 'src/entities/user.entity';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UsersService,
    // private readonly jwtService: JwtService,
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

  // public getCookieWithJwtAccessToken(userId: number) {
  //   const payload: TokenPayload = { userId };
  //   const token = this.jwtService.sign(payload, {
  //     secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
  //     expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
  //   });
  //   console.log('🚀 ~ token:', token);
  //   return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}`;
  // }

  // public getCookieWithJwtRefreshToken(userId: number) {
  //   const payload: TokenPayload = { userId };
  //   const token = this.jwtService.sign(payload, {
  //     secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
  //     expiresIn: `${this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}s`,
  //   });
  //   const cookie = `Refresh=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get(
  //     'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
  //   )}`;
  //   return {
  //     cookie,
  //     token,
  //   };
  // }

  public async logout(apiKey: string) {
    await this.apiKeyService.deactivateApiKey(apiKey);
    return this.getCookiesForLogOut();
  }

  public getCookiesForLogOut() {
    return ['ApiKey=; HttpOnly; Path=/; Max-Age=0;'];
  }
}
