import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const MARKET_TABLES = [
  'users', 'lower_band_hitters', 'upper_band_hitters',
  'volume_gainers', 'most_active_equities', 'bhav_copy',
  'ai_stock_insights', 'ai_market_summary', 'ai_alerts', 'job_logs',
];

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

  @Get('db')
  async dbStatus() {
    const counts: Record<string, number | string> = {};
    for (const table of MARKET_TABLES) {
      try {
        const [{ count }] = await this.dataSource.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = Number(count);
      } catch (e: any) {
        counts[table] = `ERROR: ${e.message}`;
      }
    }
    return { timestamp: new Date().toISOString(), tables: counts };
  }
}
