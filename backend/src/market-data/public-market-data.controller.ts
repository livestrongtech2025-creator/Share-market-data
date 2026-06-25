import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { MarketDataService } from './market-data.service';

@ApiTags('public-market-data')
@Controller('stock-history')
@UseGuards(ApiKeyGuard)
export class PublicMarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get(':symbol')
  @ApiOperation({ summary: 'Get last N days of bhav copy data for a symbol (API key auth via X-API-Key header)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Cross-app API key', required: true })
  @ApiQuery({ name: 'days', required: false, description: 'Calendar days to look back (default 7, max 90)' })
  getStockHistory(
    @Param('symbol') symbol: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.marketDataService.getStockHistory(symbol, Math.min(days, 90));
  }
}
