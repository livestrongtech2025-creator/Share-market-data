import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { NseScraperService } from '../services/nse-scraper.service';
import { LowerBandHitter, UpperBandHitter, VolumeGainer, MostActiveEquity, BhavCopy } from './entities/market-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LowerBandHitter, UpperBandHitter, VolumeGainer, MostActiveEquity, BhavCopy]),
  ],
  controllers: [MarketDataController],
  providers: [MarketDataService, NseScraperService],
  exports: [MarketDataService, NseScraperService],
})
export class MarketDataModule {}
