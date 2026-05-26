import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { JobsController } from './jobs.controller';
import { JobLog } from './entities/job-log.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { AiModule } from '../ai/ai.module';
import { NotificationModule } from '../notifications/notification.module';
import { NseScraperService } from '../services/nse-scraper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobLog]),
    MarketDataModule,
    AiModule,
    NotificationModule,
  ],
  controllers: [JobsController],
  providers: [SchedulerService, NseScraperService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
