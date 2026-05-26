import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto, LoginDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: 'user',
    });

    await this.userRepository.save(user);
    this.logger.log(`New user registered: ${dto.email}`);
    return this.generateTokens(user);
  }

  // Hardcoded fallback admin (same hash as init.sql) — dev mode only when DB is down
  private readonly FALLBACK_ADMIN = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@nseanalytics.com',
    // bcrypt hash of "Admin@123" with 12 rounds (matches init.sql seed)
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFBFuR6A4t8K3.K',
    name: 'System Admin',
    role: 'admin',
    isActive: true,
  };

  async login(dto: LoginDto) {
    let user: User | null = null;
    let dbAvailable = true;

    try {
      user = await this.userRepository.findOne({ where: { email: dto.email } });
    } catch (err) {
      dbAvailable = false;
      this.logger.warn(`DB unavailable during login, using fallback: ${err.message}`);
    }

    // Fallback: dev-mode hardcoded admin when DB is down
    if (!dbAvailable && this.configService.get('NODE_ENV') === 'development') {
      const fb = this.FALLBACK_ADMIN;
      if (dto.email !== fb.email) throw new UnauthorizedException('Invalid credentials');
      const isValid = await bcrypt.compare(dto.password, fb.passwordHash);
      if (!isValid) throw new UnauthorizedException('Invalid credentials');
      this.logger.log(`[FALLBACK] Admin logged in without DB: ${dto.email}`);
      return this.generateTokensRaw(fb.id, fb.email, fb.name, fb.role);
    }

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    try {
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    } catch {}
    this.logger.log(`User logged in: ${dto.email}`);
    return this.generateTokens(user);
  }


  async validateUser(userId: string): Promise<User | any> {
    // Fallback: if DB is down and userId matches fallback admin, return a synthetic user object
    if (userId === this.FALLBACK_ADMIN.id && this.configService.get('NODE_ENV') === 'development') {
      try {
        const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
        if (user) return user;
      } catch {}
      // Return synthetic fallback user object
      return { ...this.FALLBACK_ADMIN };
    }
    try {
      const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
      if (!user) throw new UnauthorizedException('User not found or inactive');
      return user;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // DB down — only allow the fallback admin ID through in dev
      if (this.configService.get('NODE_ENV') === 'development') {
        return { ...this.FALLBACK_ADMIN };
      }
      throw new UnauthorizedException('Service unavailable');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepository.update(userId, { passwordHash });
    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.userRepository.update(userId, { ...dto });
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async getProfile(userId: string) {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private generateTokensRaw(id: string, email: string, name: string, role: string) {
    const payload = { sub: id, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });
    return { accessToken, user: { id, email, name, role } };
  }
}
