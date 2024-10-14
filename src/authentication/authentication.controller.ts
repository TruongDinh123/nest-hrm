import {
  Body,
  Req,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UnauthorizedException,
  Get,
  ClassSerializerInterceptor,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthenticationGuard } from './localAuthentication.guard';
import RequestWithUser from './requestWithUser.interface';
import { UsersService } from 'src/user/user.service';
import JwtAuthenticationGuard from './jwt-authentication.guard';
import JwtRefreshGuard from './jwt-refresh.guard';
import { EmailConfirmationService } from 'src/emailConfirmation/emailConfirmation.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';

@Controller('authentication')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly usersService: UsersService,
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {}

  @Post('register')
  async register(@Body() registrationData: RegisterDto) {
    const user = await this.authenticationService.register(registrationData);
    await this.emailConfirmationService.sendVerificationLink(
      registrationData.email,
    );
    return user;
  }

  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  async logIn(@Req() request: RequestWithUser) {
    const { user } = request;

    if (!user || !user.isEmailConfirmed) {
      throw new UnauthorizedException();
    }

    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAccessToken(user.id);

    const { cookie: refreshTokenCookie, token: refreshToken } =
      this.authenticationService.getCookieWithJwtRefreshToken(user.id);

    await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

    request.res?.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);

    return {
      user,
      accessTokenCookie,
      refreshTokenCookie,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { email } = resetPasswordDto;
    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }
    await this.emailConfirmationService.sendPasswordResetLink(email);
    return { message: 'Password reset email sent' };
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    const email =
      await this.emailConfirmationService.decodeConfirmationToken(token);

    const user = await this.usersService.getByEmail(email);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.updatePassword(user.id, hashedPassword);
    return { message: 'Password reset successful' };
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  authenticate(@Req() request: RequestWithUser) {
    return request.user;
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('log-out')
  @HttpCode(200)
  async logOut(@Req() request: RequestWithUser) {
    await this.usersService.removeRefreshToken(request.user.id);
    request.res.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookiesForLogOut(),
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  async refresh(@Req() request: RequestWithUser) {
    const accessTokenCookie =
      await this.authenticationService.getCookieWithJwtAccessToken(
        request.user.id,
      );

    request.res.setHeader('Set-Cookie', accessTokenCookie);
    return request.user;
  }
}
