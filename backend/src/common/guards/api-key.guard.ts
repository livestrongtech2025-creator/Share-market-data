import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const expected = process.env.CROSS_APP_API_KEY;

    if (!expected || !apiKey || apiKey !== expected) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}
