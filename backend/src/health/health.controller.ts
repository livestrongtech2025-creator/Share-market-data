import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async check() {
    const dbOk = await this.dataSource.query('SELECT 1').then(() => true).catch(() => false);
    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'connected' : 'error',
    };
  }
}
