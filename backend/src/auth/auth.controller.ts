import { Controller, Post, Get, Put, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout() {
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
