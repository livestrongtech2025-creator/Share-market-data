import { Injectable, Logger } from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { format, parseISO } from 'date-fns';
import { LowerBandHitter, UpperBandHitter, VolumeGainer, MostActiveEquity, BhavCopy } from './entities/market-data.entity';
import { NseScraperService } from '../services/nse-scraper.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @InjectRepository(LowerBandHitter)
    private readonly lbhRepo: Repository<LowerBandHitter>,
    @InjectRepository(UpperBandHitter)
    private readonly ubhRepo: Repository<UpperBandHitter>,
    @InjectRepository(VolumeGainer)
    private readonly vgRepo: Repository<VolumeGainer>,
    @InjectRepository(MostActiveEquity)
    private readonly maeRepo: Repository<MostActiveEquity>,
    @InjectRepository(BhavCopy)
    private readonly bhavRepo: Repository<BhavCopy>,
    private readonly scraperService: NseScraperService,
    private readonly dataSource: DataSource,
  ) {}

  private parseNumber(val: any): number | undefined {
    if (val === null || val === undefined || val === '' || val === '-') return undefined;
    const cleaned = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  private parseBigInt(val: any): number | undefined {
    if (val === null || val === undefined || val === '' || val === '-') return undefined;
    const cleaned = String(val).replace(/,/g, '').trim();
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
  }

  private normalizeNseRecord(record: any): any {
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(record)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
      normalized[lowerKey] = value;
    }
    return normalized;
  }

  async ingestLowerBandHitters(date: Date, records: any[]): Promise<number> {
    if (!records.length) return 0;
    let inserted = 0;

    for (const record of records) {
      try {
        const norm = this.normalizeNseRecord(record);
        // NSE band-hitters API ships two shapes:
        //   Legacy: close (LTP), prev, vol, pctChange
        //   Current: ltp, change, pChange, totalTradedVol (LAKHS), turnover (CRORES)
        const ltp = this.parseNumber(norm.close || norm.ltp || norm.last_price || record.ltp);
        const prevCloseVal = this.parseNumber(norm.prev || norm.prev_close || norm.prevclose || record.prevClose);
        let vol = this.parseBigInt(norm.vol || norm.volume || norm.total_traded_quantity || record.totalTradedVolume);
        if (vol == null) {
          const ttvLakhs = this.parseNumber(norm.totaltradedvol || record.totalTradedVol);
          if (ttvLakhs != null) vol = Math.round(ttvLakhs * 1e5);
        }
        let value = this.parseNumber(norm.value || norm.total_traded_value || record.totalTradedValue);
        if (value == null) {
          const turnoverCr = this.parseNumber(norm.turnover || record.turnover);
          if (turnoverCr != null) value = parseFloat((turnoverCr * 1e7).toFixed(2));
        }
        if (value == null && ltp != null && vol != null) {
          value = parseFloat((ltp * vol).toFixed(2));
        }
        const entity = this.lbhRepo.create({
          sourceDate: date,
          symbol: (norm.symbol || norm.nsesymbol || record.symbol || '').trim(),
          series: (norm.series || record.series || '').trim(),
          openPrice: this.parseNumber(norm.open || norm.open_price || record.open),
          highPrice: this.parseNumber(norm.high || norm.high_price || record.high),
          lowPrice: this.parseNumber(norm.low || norm.low_price || record.low),
          prevClose: prevCloseVal,
          ltp,
          chng: this.parseNumber(norm.chng || norm.change || record.change)
            ?? (ltp != null && prevCloseVal != null ? parseFloat((ltp - prevCloseVal).toFixed(2)) : undefined),
          pctChng: this.parseNumber(norm.pctchange || norm.pct_chng || norm.per_change || record.pChange || record.pctChange),
          volume: vol,
          value,
          lowerBand: this.parseNumber(norm.lower_band || norm.lower_cp || norm.close || record.lowerCP) ?? ltp,
          week52High: this.parseNumber(norm.week_52_high || norm['_52wk_high'] || record['52WH']),
          week52Low: this.parseNumber(norm.week_52_low || norm['_52wk_low'] || record['52WL']),
          rawJson: record,
        });
        await this.lbhRepo.upsert(entity, { conflictPaths: ['symbol', 'sourceDate'] });
        inserted++;
      } catch (err) {
        this.logger.error(`Failed to insert lower band record: ${err.message}`);
      }
    }
    return inserted;
  }

  async ingestUpperBandHitters(date: Date, records: any[]): Promise<number> {
    if (!records.length) return 0;
    let inserted = 0;

    for (const record of records) {
      try {
        const norm = this.normalizeNseRecord(record);
        // NSE band-hitters API ships two shapes:
        //   Legacy: close (LTP), prev, vol, pctChange
        //   Current: ltp, change, pChange, totalTradedVol (LAKHS), turnover (CRORES)
        const ltp = this.parseNumber(norm.close || norm.ltp || norm.last_price || record.ltp);
        const prevCloseVal = this.parseNumber(norm.prev || norm.prev_close || norm.prevclose || record.prevClose);
        let vol = this.parseBigInt(norm.vol || norm.volume || record.totalTradedVolume);
        if (vol == null) {
          const ttvLakhs = this.parseNumber(norm.totaltradedvol || record.totalTradedVol);
          if (ttvLakhs != null) vol = Math.round(ttvLakhs * 1e5);
        }
        let value = this.parseNumber(norm.value || norm.total_traded_value || record.totalTradedValue);
        if (value == null) {
          const turnoverCr = this.parseNumber(norm.turnover || record.turnover);
          if (turnoverCr != null) value = parseFloat((turnoverCr * 1e7).toFixed(2));
        }
        if (value == null && ltp != null && vol != null) {
          value = parseFloat((ltp * vol).toFixed(2));
        }
        const entity = this.ubhRepo.create({
          sourceDate: date,
          symbol: (norm.symbol || norm.nsesymbol || record.symbol || '').trim(),
          series: (norm.series || record.series || '').trim(),
          openPrice: this.parseNumber(norm.open || norm.open_price || record.open),
          highPrice: this.parseNumber(norm.high || norm.high_price || record.high),
          lowPrice: this.parseNumber(norm.low || norm.low_price || record.low),
          prevClose: prevCloseVal,
          ltp,
          chng: this.parseNumber(norm.chng || norm.change || record.change)
            ?? (ltp != null && prevCloseVal != null ? parseFloat((ltp - prevCloseVal).toFixed(2)) : undefined),
          pctChng: this.parseNumber(norm.pctchange || norm.pct_chng || norm.per_change || record.pChange || record.pctChange),
          volume: vol,
          value,
          upperBand: this.parseNumber(norm.upper_band || norm.upper_cp || norm.uppercp || record.upperCP) ?? ltp,
          week52High: this.parseNumber(norm.week_52_high || norm['_52wk_high'] || record['52WH']),
          week52Low: this.parseNumber(norm.week_52_low || norm['_52wk_low'] || record['52WL']),
          rawJson: record,
        });
        await this.ubhRepo.upsert(entity, { conflictPaths: ['symbol', 'sourceDate'] });
        inserted++;
      } catch (err) {
        this.logger.error(`Failed to insert upper band record: ${err.message}`);
      }
    }
    return inserted;
  }

  async ingestVolumeGainers(date: Date, records: any[]): Promise<number> {
    if (!records.length) return 0;
    let inserted = 0;

    for (const record of records) {
      try {
        const norm = this.normalizeNseRecord(record);
        // NSE volume-gainers API: ltp, volume, pChange, turnover(Lakhs), week1AvgVolume, week1volChange
        const turnoverLacs = this.parseNumber(norm.turnover || record.turnover);
        const entity = this.vgRepo.create({
          sourceDate: date,
          symbol: (norm.symbol || record.symbol || '').trim(),
          series: (norm.series || record.series || '').trim(),
          openPrice: this.parseNumber(norm.open || norm.open_price || record.open),
          highPrice: this.parseNumber(norm.high || norm.high_price || record.high),
          lowPrice: this.parseNumber(norm.low || norm.low_price || record.low),
          prevClose: this.parseNumber(norm.prev_close || norm.prevclose || record.prevClose),
          ltp: this.parseNumber(norm.ltp || norm.last_price || record.ltp || record.lastPrice),
          chng: this.parseNumber(norm.chng || norm.change || record.change),
          pctChng: this.parseNumber(norm.pchange || norm.pct_chng || norm.pctchange || record.pChange || record.pctChange),
          volume: this.parseBigInt(norm.volume || norm.vol || record.totalTradedVolume),
          prevVolume: this.parseBigInt(norm.week1avgvolume || norm.prev_volume || norm.previous_volume || record.week1AvgVolume),
          volumeRatio: this.parseNumber(norm.week1volchange || norm.volume_ratio || record.week1volChange || record.volumeRatio),
          // turnover from NSE API is in Lakhs — convert to Rupees for consistent storage
          value: this.parseNumber(norm.value || record.totalTradedValue)
            ?? (turnoverLacs != null ? parseFloat((turnoverLacs * 1e5).toFixed(2)) : undefined),
          rawJson: record,
        });
        await this.vgRepo.upsert(entity, { conflictPaths: ['symbol', 'sourceDate'] });
        inserted++;
      } catch (err) {
        this.logger.error(`Failed to insert volume gainer record: ${err.message}`);
      }
    }
    return inserted;
  }

  async ingestMostActiveEquities(date: Date, records: any[]): Promise<number> {
    if (!records.length) return 0;
    let inserted = 0;

    for (const record of records) {
      try {
        const norm = this.normalizeNseRecord(record);
        // Most-active ships two shapes:
        //   Bhav-copy backfill: snake_case (OPEN_PRICE/HIGH_PRICE/...), TURNOVER_LACS in Lakhs.
        //   NSE live API: camelCase (dayHigh/dayLow/previousClose/lastPrice), totalTradedValue in Rupees.
        const turnoverLacs = this.parseNumber(norm.turnover_lacs);
        const liveTtv = this.parseNumber(norm.totaltradedvalue || record.totalTradedValue);
        const value =
          turnoverLacs != null ? parseFloat((turnoverLacs * 1e5).toFixed(2)) :
          liveTtv != null ? liveTtv :
          this.parseNumber(norm.total_traded_value || norm.value || record.value);
        const entity = this.maeRepo.create({
          sourceDate: date,
          symbol: (norm.symbol || record.symbol || '').trim(),
          series: (norm.series || record.series || '').trim(),
          openPrice: this.parseNumber(norm.open_price || norm.open || record.open),
          highPrice: this.parseNumber(norm.high_price || norm.high || norm.dayhigh || record.dayHigh),
          lowPrice: this.parseNumber(norm.low_price || norm.low || norm.daylow || record.dayLow),
          prevClose: this.parseNumber(norm.prev_close || norm.prevclose || norm.previousclose || record.prevClose || record.previousClose),
          ltp: this.parseNumber(norm.ltp || norm.last_price || norm.lastprice || norm.close_price || record.ltp || record.lastPrice),
          chng: this.parseNumber(norm.chng || norm.change || record.change),
          pctChng: this.parseNumber(norm.pct_chng || norm.pctchange || norm.pchange || record.pChange || record.pctChange),
          volume: this.parseBigInt(norm.total_traded_qty || norm.ttl_trd_qnty || norm.totaltradedqty || norm.totaltradedvolume || norm.quantitytraded || norm.volume || record.totalTradedVolume || record.quantityTraded),
          value,
          trades: this.parseBigInt(norm.total_trades || norm.no_of_trades || norm.numberoftrades || norm.trades || record.numberOfTrades || record.totalTrades),
          rawJson: record,
        });
        await this.maeRepo.upsert(entity, { conflictPaths: ['symbol', 'sourceDate'] });
        inserted++;
      } catch (err) {
        this.logger.error(`Failed to insert most active equity record: ${err.message}`);
      }
    }
    return inserted;
  }

  async ingestBhavCopy(date: Date, records: any[]): Promise<number> {
    if (!records.length) return 0;
    let inserted = 0;
    const batchSize = 500;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const entities = batch.map(record => {
        const norm = this.normalizeNseRecord(record);
        return this.bhavRepo.create({
          sourceDate: date,
          symbol: (norm.symbol || norm.sc_code || record.SYMBOL || '').trim(),
          series: (norm.series || norm.sc_group || record.SERIES || '').trim(),
          openPrice: this.parseNumber(norm.open || norm.open_price || record.OPEN),
          highPrice: this.parseNumber(norm.high || norm.high_price || record.HIGH),
          lowPrice: this.parseNumber(norm.low || norm.low_price || record.LOW),
          closePrice: this.parseNumber(norm.close || norm.close_price || record.CLOSE),
          lastPrice: this.parseNumber(norm.last || norm.last_price || record.LAST),
          prevClose: this.parseNumber(norm.prevclose || norm.prev_close || record.PREVCLOSE),
          avgPrice: this.parseNumber(norm.avg_price || record.AVG_PRICE),
          totalTradedQty: this.parseBigInt(norm.ttl_trd_qnty || norm.tottrdqty || norm.total_traded_qty || record.TOTTRDQTY),
          totalTradedValue: this.parseNumber(norm.turnover_lacs || norm.turnover || norm.tottrdval || norm.total_traded_value || record.TOTTRDVAL),
          totalTrades: this.parseBigInt(norm.no_of_trades || norm.totaltrades || norm.total_trades || record.TOTALTRADES),
          delivQty: this.parseBigInt(norm.deliv_qty || record.DELIV_QTY),
          delivPer: this.parseNumber(norm.deliv_per || record.DELIV_PER),
          isin: (norm.isin || record.ISIN || '').trim(),
          rawJson: record,
        });
      });

      try {
        await this.bhavRepo
          .createQueryBuilder()
          .insert()
          .into(BhavCopy)
          .values(entities)
          .orIgnore()
          .execute();
        inserted += entities.length;
      } catch (err) {
        this.logger.error(`Batch insert error: ${err.message}`);
        // Try one by one
        for (const entity of entities) {
          try {
            await this.bhavRepo.upsert(entity, { conflictPaths: ['symbol', 'series', 'sourceDate'] });
            inserted++;
          } catch {}
        }
      }
    }
    return inserted;
  }

  async getLowerBandHitters(query: PaginationDto): Promise<PaginatedResponse<LowerBandHitter>> {
    return this.getPaginatedData(this.lbhRepo, query, ['symbol', 'series']);
  }

  async getUpperBandHitters(query: PaginationDto): Promise<PaginatedResponse<UpperBandHitter>> {
    return this.getPaginatedData(this.ubhRepo, query, ['symbol', 'series']);
  }

  async getVolumeGainers(query: PaginationDto): Promise<PaginatedResponse<VolumeGainer>> {
    return this.getPaginatedData(this.vgRepo, query, ['symbol', 'series']);
  }

  async getMostActiveEquities(query: PaginationDto): Promise<PaginatedResponse<MostActiveEquity>> {
    return this.getPaginatedData(this.maeRepo, query, ['symbol', 'series']);
  }

  async getBhavCopy(query: PaginationDto): Promise<PaginatedResponse<BhavCopy>> {
    const qb = this.bhavRepo.createQueryBuilder('e');

    if (query.date) {
      qb.andWhere('e.sourceDate = :date', { date: query.date });
    } else if (query.startDate && query.endDate) {
      qb.andWhere('e.sourceDate BETWEEN :start AND :end', { start: query.startDate, end: query.endDate });
    }

    if (query.search) {
      qb.andWhere('(e.symbol ILIKE :search OR e.isin ILIKE :search)', { search: `%${query.search}%` });
    }

    if (query.series) {
      qb.andWhere('e.series = :series', { series: query.series.trim().toUpperCase() });
    }

    if (query.minClose !== undefined && query.minClose !== null) {
      qb.andWhere('e.closePrice >= :minClose', { minClose: query.minClose });
    }

    if (query.maxClose !== undefined && query.maxClose !== null) {
      qb.andWhere('e.closePrice <= :maxClose', { maxClose: query.maxClose });
    }

    if (query.minVolume !== undefined && query.minVolume !== null) {
      qb.andWhere('e.totalTradedQty >= :minVolume', { minVolume: query.minVolume });
    }

    if (query.maxVolume !== undefined && query.maxVolume !== null) {
      qb.andWhere('e.totalTradedQty <= :maxVolume', { maxVolume: query.maxVolume });
    }

    // Percent change filter — formula: (closePrice - prevClose) * 100 / prevClose. Positive ⇒ price rose.
    const pctDropExpr = '((e.close_price - e.prev_close) * 100.0 / NULLIF(e.prev_close, 0))';
    if (query.minPctDrop !== undefined && query.minPctDrop !== null) {
      qb.andWhere(`${pctDropExpr} >= :minPctDrop`, { minPctDrop: query.minPctDrop });
    }
    if (query.maxPctDrop !== undefined && query.maxPctDrop !== null) {
      qb.andWhere(`${pctDropExpr} <= :maxPctDrop`, { maxPctDrop: query.maxPctDrop });
    }

    // Turnover input is Crores; totalTradedValue is stored as Lakhs → 1 Cr = 100 Lakhs.
    if (query.minTurnoverCr !== undefined && query.minTurnoverCr !== null) {
      qb.andWhere('e.totalTradedValue >= :minTurnover', { minTurnover: query.minTurnoverCr * 100 });
    }

    if (query.minDelivPer !== undefined && query.minDelivPer !== null) {
      qb.andWhere('e.delivPer >= :minDelivPer', { minDelivPer: query.minDelivPer });
    }

    // Same-symbol previous trading day turnover (for turnover-multiple column / filter / sort).
    const prevTtvExpr = `(
      SELECT b2.total_traded_value FROM bhav_copy b2
      WHERE b2.symbol = e.symbol
        AND b2.series = e.series
        AND b2.source_date < e.source_date
      ORDER BY b2.source_date DESC
      LIMIT 1
    )`;
    const turnoverMultipleExpr = `(e.total_traded_value / NULLIF(${prevTtvExpr}, 0))`;
    qb.addSelect(prevTtvExpr, 'e_prev_ttv');

    if (query.minTurnoverMultiple !== undefined && query.minTurnoverMultiple !== null) {
      qb.andWhere(`${turnoverMultipleExpr} >= :minTurnoverMultiple`, { minTurnoverMultiple: query.minTurnoverMultiple });
    }

    const sortField = query.sortBy || 'sourceDate';
    const sortOrder = query.sortOrder || 'DESC';
    if (sortField === 'turnoverMultiple') {
      qb.orderBy(turnoverMultipleExpr, sortOrder as 'ASC' | 'DESC', 'NULLS LAST');
    } else {
      qb.orderBy(`e.${sortField}`, sortOrder as 'ASC' | 'DESC');
    }

    const total = await qb.getCount();
    qb.skip(query.skip).take(query.limit || 20);

    const { entities, raw } = await qb.getRawAndEntities();
    const data = entities.map((entity, i) => {
      const prev = raw[i]?.e_prev_ttv;
      const prevNum = prev != null && prev !== '' ? Number(prev) : null;
      const currNum = entity.totalTradedValue != null ? Number(entity.totalTradedValue) : null;
      const multiple = prevNum != null && prevNum > 0 && currNum != null ? currNum / prevNum : null;
      return Object.assign(entity, {
        prevTotalTradedValue: prevNum,
        turnoverMultiple: multiple,
      });
    });
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async getBhavCopySeries(): Promise<string[]> {
    const result = await this.bhavRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.series', 'series')
      .where("e.series IS NOT NULL AND e.series != ''")
      .orderBy('e.series', 'ASC')
      .getRawMany();
    return result.map(r => r.series).filter(Boolean);
  }

  private async getPaginatedData<T extends ObjectLiteral>(
    repo: Repository<T>,
    query: PaginationDto,
    searchFields: string[],
  ): Promise<PaginatedResponse<T>> {
    const qb = repo.createQueryBuilder('e');

    if (query.date) {
      qb.andWhere('e.sourceDate = :date', { date: query.date });
    } else if (query.startDate && query.endDate) {
      qb.andWhere('e.sourceDate BETWEEN :start AND :end', {
        start: query.startDate,
        end: query.endDate,
      });
    }

    if (query.search && searchFields.length) {
      const conditions = searchFields.map(f => `e.${f} ILIKE :search`).join(' OR ');
      qb.andWhere(`(${conditions})`, { search: `%${query.search}%` });
    }

    if (query.series) {
      qb.andWhere('e.series = :series', { series: query.series.trim().toUpperCase() });
    }
    if (query.minClose != null) {
      qb.andWhere('e.ltp >= :minLtp', { minLtp: query.minClose });
    }
    if (query.maxClose != null) {
      qb.andWhere('e.ltp <= :maxLtp', { maxLtp: query.maxClose });
    }
    if (query.minVolume != null) {
      qb.andWhere('e.volume >= :minVol', { minVol: query.minVolume });
    }
    if (query.maxVolume != null) {
      qb.andWhere('e.volume <= :maxVol', { maxVol: query.maxVolume });
    }

    const sortField = query.sortBy || 'sourceDate';
    const sortOrder = query.sortOrder || 'DESC';
    qb.orderBy(`e.${sortField}`, sortOrder as 'ASC' | 'DESC');

    qb.skip(query.skip).take(query.limit || 20);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async getAvailableDates(table: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT DISTINCT source_date::text FROM ${table} ORDER BY source_date DESC LIMIT 90`,
    );
    return result.map((r: any) => r.source_date);
  }

  async exportToCsv(table: string, date: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT * FROM ${table} WHERE source_date = $1 ORDER BY symbol`,
      [date],
    );
  }

  async getStockHistory(symbol: string, days: number): Promise<any[]> {
    const safeDays = Math.min(days, 90);
    const rows: any[] = await this.dataSource.query(
      `SELECT
         e.source_date          AS date,
         e.series,
         e.total_traded_value   AS turnover,
         ROUND(
           e.total_traded_value::numeric / NULLIF((
             SELECT b2.total_traded_value FROM bhav_copy b2
             WHERE UPPER(b2.symbol) = UPPER(e.symbol)
               AND b2.series = e.series
               AND b2.source_date < e.source_date
             ORDER BY b2.source_date DESC
             LIMIT 1
           ), 0),
           2
         )                      AS "turnoverXPrev",
         e.deliv_per            AS "deliveryPct"
       FROM bhav_copy e
       WHERE UPPER(e.symbol) = UPPER($1)
         AND e.source_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
       ORDER BY e.source_date DESC`,
      [symbol, safeDays],
    );

    return rows.map(r => ({
      date: r.date,
      series: r.series,
      turnover: r.turnover != null ? Number(r.turnover) : null,
      turnoverXPrev: r.turnoverXPrev != null ? Number(r.turnoverXPrev) : null,
      deliveryPct: r.deliveryPct != null ? Number(r.deliveryPct) : null,
    }));
  }
}
