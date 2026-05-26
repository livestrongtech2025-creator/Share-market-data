import { Controller, Get, Query, Param, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketDataService } from './market-data.service';
import { PaginationDto } from '../common/dto/pagination.dto';


@ApiTags('market-data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('lower-band-hitters')
  @ApiOperation({ summary: 'Get lower band hitters' })
  getLowerBandHitters(@Query() query: PaginationDto) {
    return this.marketDataService.getLowerBandHitters(query);
  }

  @Get('upper-band-hitters')
  @ApiOperation({ summary: 'Get upper band hitters' })
  getUpperBandHitters(@Query() query: PaginationDto) {
    return this.marketDataService.getUpperBandHitters(query);
  }

  @Get('volume-gainers')
  @ApiOperation({ summary: 'Get volume gainers' })
  getVolumeGainers(@Query() query: PaginationDto) {
    return this.marketDataService.getVolumeGainers(query);
  }

  @Get('most-active-equities')
  @ApiOperation({ summary: 'Get most active equities' })
  getMostActiveEquities(@Query() query: PaginationDto) {
    return this.marketDataService.getMostActiveEquities(query);
  }

  @Get('bhav-copy')
  @ApiOperation({ summary: 'Get bhav copy data with filters' })
  getBhavCopy(@Query() query: PaginationDto) {
    return this.marketDataService.getBhavCopy(query);
  }

  @Get('bhav-copy-series')
  @ApiOperation({ summary: 'Get distinct series values from bhav copy' })
  getBhavCopySeries() {
    return this.marketDataService.getBhavCopySeries();
  }

  @Get('available-dates/:table')
  @ApiOperation({ summary: 'Get available dates for a table' })
  getAvailableDates(@Param('table') table: string) {
    const allowedTables = ['lower_band_hitters', 'upper_band_hitters', 'volume_gainers', 'most_active_equities', 'bhav_copy'];
    if (!allowedTables.includes(table)) return [];
    return this.marketDataService.getAvailableDates(table);
  }

  @Get('export/:table')
  @ApiOperation({ summary: 'Export data as CSV' })
  @ApiQuery({ name: 'date', required: true })
  async exportCsv(
    @Param('table') table: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const allowedTables = ['lower_band_hitters', 'upper_band_hitters', 'volume_gainers', 'most_active_equities', 'bhav_copy'];
    if (!allowedTables.includes(table)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid table' });
    }

    const data = await this.marketDataService.exportToCsv(table, date);
    if (!data.length) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'No data found' });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${table}_${date}.csv`);
    return res.send(csvRows.join('\n'));
  }
}
