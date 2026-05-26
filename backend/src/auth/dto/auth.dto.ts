import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@nseanalytics.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  notificationEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  notificationTelegram?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  notificationSlack?: boolean;
}
