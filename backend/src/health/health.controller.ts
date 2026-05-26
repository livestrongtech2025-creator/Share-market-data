import { Controller, Get, Optional } from '@nestjs/common';
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
  constructor(
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  @Get()
  async check() {
    let dbOk = false;
    try {
      if (this.dataSource?.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbOk = true;
      }
    } catch {}
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'connected' : 'unavailable',
    };
  }

  @Get('db')
  async dbStatus() {
    if (!this.dataSource?.isInitialized) {
      return { timestamp: new Date().toISOString(), error: 'Database not connected' };
    }
    const counts: Record<string, number | string> = {};
    for (const table of MARKET_TABLES) {
      try {
        const [{ count }] = await this.dataSource.query(
          `SELECT COUNT(*) as count FROM ${table}`,
        );
        counts[table] = Number(count);
      } catch (e: any) {
        counts[table] = `ERROR: ${e.message}`;
      }
    }
    return { timestamp: new Date().toISOString(), tables: counts };
  }
}
