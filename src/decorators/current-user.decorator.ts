import { createParamDecorator } from '@nestjs/common';

import { ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext) => {
    return context.switchToHttp().getRequest().user;
  },
);
