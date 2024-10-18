import {
  Controller,
  Post,
  ClassSerializerInterceptor,
  UseInterceptors,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import TokenVerificationDto from './tokenVerification.dto';
import { GoogleAuthenticationService } from './googleAuthentication.service';

@Controller('google-authentication')
@UseInterceptors(ClassSerializerInterceptor)
export class GoogleAuthenticationController {
  constructor(
    private readonly googleAuthenticationService: GoogleAuthenticationService,
  ) {}

  // @Post()
  // async authenticate(
  //   @Body() tokenData: TokenVerificationDto,
  //   @Req() request: Request,
  // ) {
  //   const { accessTokenCookie, refreshTokenCookie, user } =
  //     await this.googleAuthenticationService.authenticate(tokenData.token);

  //   request.res.setHeader('Set-Cookie', [
  //     accessTokenCookie,
  //     refreshTokenCookie,
  //   ]);

  //   return user;
  // }
}
