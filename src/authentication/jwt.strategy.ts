import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import UsersService from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request?.cookies?.Authentication;
          console.log('Extracted token:', token);
          return token;
        },
      ]),
      secretOrKey: configService.get('JWT_ACCESS_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request) {
    try {
      const token = request.cookies?.Authentication;
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const decodedToken = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      });

      if (!decodedToken.userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.userService.getById(decodedToken.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error in JwtStrategy validate:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
