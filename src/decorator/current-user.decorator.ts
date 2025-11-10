import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific field is requested (e.g., @CurrentUser('email'))
    if (data && user) {
      return user[data];
    }

    return user;
  },
);
