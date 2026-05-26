import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { MarketDataService } from '../market-data/market-data.service';
import { NseScraperService } from '../services/nse-scraper.service';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../notifications/notification.service';
import { JobLog } from './entities/job-log.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly IST_TIMEZONE = 'Asia/Kolkata';

  constructor(
    @InjectRepository(JobLog)
    private readonly jobLogRepo: Repository<JobLog>,
    private readonly scraperService: NseScraperService,
    private readonly marketDataService: MarketDataService,
    private readonly aiService: AiService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  // Run at 6:30 PM IST Mon-Fri
  @Cron('30 18 * * 1-5', { timeZone: 'Asia/Kolkata' })
  async runDailyIngestion() {
    const jobLog = await this.createJobLog('daily-nse-ingestion', 'scheduler');
    const startTime = Date.now();

    try {
      this.logger.log('Starting daily NSE data ingestion...');
      const istNow = toZonedTime(new Date(), this.IST_TIMEZONE);
      const today = new Date(format(istNow, 'yyyy-MM-dd'));

      // Step 1: Fetch all data
      this.logger.log('Step 1: Fetching NSE data...');
      const allData = await this.scraperService.fetchAllData(today);

      let totalInserted = 0;

      // Step 2: Ingest market data
      this.logger.log('Step 2: Ingesting market data...');
      const [lbh, ubh, vg, mae, bhav] = await Promise.allSettled([
        this.marketDataService.ingestLowerBandHitters(today, allData.lowerBand),
        this.marketDataService.ingestUpperBandHitters(today, allData.upperBand),
        this.marketDataService.ingestVolumeGainers(today, allData.volumeGainers),
        this.marketDataService.ingestMostActiveEquities(today, allData.mostActive),
        this.marketDataService.ingestBhavCopy(today, allData.bhavCopy),
      ]);

      const inserted = [lbh, ubh, vg, mae, bhav].map(r =>
        r.status === 'fulfilled' ? r.value : 0
      );
      totalInserted = inserted.reduce((a, b) => a + b, 0);

      this.logger.log(`Ingested: LBH=${inserted[0]}, UBH=${inserted[1]}, VG=${inserted[2]}, MAE=${inserted[3]}, Bhav=${inserted[4]}`);

      // Step 3: Generate AI insights
      this.logger.log('Step 3: Generating AI market summary...');
      try {
        await this.aiService.generateMarketSummary(today);
      } catch (err) {
        this.logger.error(`AI summary failed: ${err.message}`);
      }

      // Step 4: Generate alerts
      this.logger.log('Step 4: Generating alerts...');
      await this.generateAlerts(today, allData);

      // Step 5: Send success notification
      const duration = Date.now() - startTime;
      await this.updateJobLog(jobLog.id, 'completed', totalInserted, 0, duration);

      await this.notificationService.sendAlert(
        'Daily NSE data ingestion completed',
        `Date: ${format(today, 'dd-MM-yyyy')}\nTotal records: ${totalInserted}\nDuration: ${Math.round(duration / 1000)}s`,
        'info',
      );

      this.logger.log(`Daily ingestion completed in ${Math.round(duration / 1000)}s. Records: ${totalInserted}`);
    } catch (err) {
      const duration = Date.now() - startTime;
      await this.updateJobLog(jobLog.id, 'failed', 0, 0, duration, err.message);

      await this.notificationService.sendAlert(
        'NSE data ingestion FAILED',
        `Error: ${err.message}`,
        'error',
      );

      this.logger.error(`Daily ingestion failed: ${err.message}`, err.stack);
    }
  }

  async runManualIngestion(date?: Date): Promise<{ success: boolean; message: string; records: number }> {
    const jobLog = await this.createJobLog('manual-nse-ingestion', 'manual');
    const startTime = Date.now();
    const targetDate = date || new Date();

    try {
      const allData = await this.scraperService.fetchAllData(targetDate);
      const [lbh, ubh, vg, mae, bhav] = await Promise.allSettled([
        this.marketDataService.ingestLowerBandHitters(targetDate, allData.lowerBand),
        this.marketDataService.ingestUpperBandHitters(targetDate, allData.upperBand),
        this.marketDataService.ingestVolumeGainers(targetDate, allData.volumeGainers),
        this.marketDataService.ingestMostActiveEquities(targetDate, allData.mostActive),
        this.marketDataService.ingestBhavCopy(targetDate, allData.bhavCopy),
      ]);

      const inserted = [lbh, ubh, vg, mae, bhav].map(r => r.status === 'fulfilled' ? r.value : 0);
      const total = inserted.reduce((a, b) => a + b, 0);

      try { await this.aiService.generateMarketSummary(targetDate); } catch {}

      const duration = Date.now() - startTime;
      await this.updateJobLog(jobLog.id, 'completed', total, 0, duration);

      return { success: true, message: 'Ingestion completed', records: total };
    } catch (err) {
      const duration = Date.now() - startTime;
      await this.updateJobLog(jobLog.id, 'failed', 0, 0, duration, err.message);
      return { success: false, message: err.message, records: 0 };
    }
  }

  private async generateAlerts(date: Date, data: any): Promise<void> {
    // Circuit hitters alert
    if (data.upperBand.length > 0) {
      await this.aiService.createAlert(
        undefined as any, 'circuit_upper',
        `${data.upperBand.length} stocks hit upper circuit on ${format(date, 'dd-MM-yyyy')}`,
        'high', { symbols: data.upperBand.slice(0, 10).map((s: any) => s.symbol) }
      );
    }
    if (data.lowerBand.length > 0) {
      await this.aiService.createAlert(
        undefined as any, 'circuit_lower',
        `${data.lowerBand.length} stocks hit lower circuit on ${format(date, 'dd-MM-yyyy')}`,
        'high', { symbols: data.lowerBand.slice(0, 10).map((s: any) => s.symbol) }
      );
    }
    // Volume spike alert
    const highVolumeStocks = data.volumeGainers.filter((v: any) => {
      const ratio = parseFloat(v.volumeRatio || v.volume_ratio || '0');
      return ratio > 5;
    });
    if (highVolumeStocks.length > 0) {
      for (const stock of highVolumeStocks.slice(0, 5)) {
        await this.aiService.createAlert(
          stock.symbol || stock.nsesymbol, 'volume_spike',
          `Unusual volume spike detected - ${(stock.volumeRatio || stock.volume_ratio || 0)}x normal volume`,
          'medium', stock
        );
      }
    }
  }

  private async createJobLog(name: string, type: string): Promise<JobLog> {
    const log = this.jobLogRepo.create({ jobName: name, jobType: type, status: 'running' });
    return this.jobLogRepo.save(log);
  }

  private async updateJobLog(id: string, status: string, inserted: number, failed: number, duration: number, error?: string): Promise<void> {
    await this.jobLogRepo.update(id, {
      status, recordsInserted: inserted, recordsFailed: failed,
      durationMs: duration, completedAt: new Date(), errorMessage: error,
    });
  }
}
