import {
  Body,
  Req,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Get,
  ClassSerializerInterceptor,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { Public } from '@app/common';
import { LocalAuthenticationGuard } from './guard/localAuthentication.guard';
import RequestWithUser from './strategy/requestWithUser.interface';
import { EmailConfirmationService } from './emailConfirmation/emailConfirmation.service';
import { UserService } from '@apps/user/src/user.service';

@Controller('authentication')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly usersService: UserService,
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() registrationData: RegisterDto) {
    const user = await this.authenticationService.register(registrationData);
    await this.emailConfirmationService.sendVerificationLink(
      registrationData.email,
    );
    return user;
  }

  @Public()
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  @HttpCode(200)
  async login(@Req() request: RequestWithUser) {
    const { user } = request;
    const result = await this.authenticationService.login(user);
    request.res.setHeader('Set-Cookie', result.cookie);
    return user;
  }

  @Public()
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

  @Public()
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

  @Get()
  authenticate(@Req() request: RequestWithUser) {
    return request.user;
  }

  @Post('log-out')
  @HttpCode(200)
  async logOut(@Req() request: RequestWithUser) {
    const cookies = await this.authenticationService.logout(
      request.cookies['ApiKey'],
    );

    request.res.setHeader('Set-Cookie', cookies);

    return { message: 'Logout successful' };
  }
}
