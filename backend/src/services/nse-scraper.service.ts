import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { format } from 'date-fns';
import { parse } from 'csv-parse/sync';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
];

const NSE_ENDPOINTS = {
  lowerBand: 'https://www.nseindia.com/api/lhrhitters?index=lband',
  upperBand: 'https://www.nseindia.com/api/lhrhitters?index=uband',
  volumeGainers: 'https://www.nseindia.com/api/live-analysis-volume-gainers',
  mostActive: 'https://www.nseindia.com/api/live-analysis-most-act-traded-securities',
};

@Injectable()
export class NseScraperService {
  private readonly logger = new Logger(NseScraperService.name);
  private client: AxiosInstance;
  private jar: CookieJar;
  private sessionInitialized = false;

  constructor(private readonly configService: ConfigService) {
    this.jar = new CookieJar();
    this.client = wrapper(
      axios.create({
        jar: this.jar,
        timeout: configService.get<number>('NSE_REQUEST_TIMEOUT', 30000),
        withCredentials: true,
      }),
    );
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    };
  }

  private getApiHeaders(): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      Referer: 'https://www.nseindia.com/',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  async initSession(): Promise<void> {
    try {
      this.logger.log('Initializing NSE session...');
      await this.client.get('https://www.nseindia.com', {
        headers: this.getHeaders(),
      });
      await this.delay(2000);
      await this.client.get('https://www.nseindia.com/market-data/most-active-equities', {
        headers: this.getHeaders(),
      });
      await this.delay(1500);
      this.sessionInitialized = true;
      this.logger.log('NSE session initialized successfully');
    } catch (err) {
      this.logger.error(`Failed to initialize NSE session: ${err.message}`);
      this.sessionInitialized = false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
    if (!this.sessionInitialized) await this.initSession();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.delay(1000 + Math.random() * 1000);
        const response = await this.client.get<T>(url, {
          headers: this.getApiHeaders(),
        });
        return response.data;
      } catch (err) {
        this.logger.warn(`Attempt ${attempt}/${retries} failed for ${url}: ${err.message}`);
        if (attempt === retries) throw err;
        await this.delay(configService_retry_delay(attempt));
        if (attempt === 2) {
          this.sessionInitialized = false;
          await this.initSession();
        }
      }
    }
    throw new Error(`All ${retries} attempts failed for ${url}`);
  }

  async fetchLowerBandHitters(): Promise<any[]> {
    try {
      this.logger.log('Fetching Lower Band Hitters...');
      const data = await this.fetchWithRetry<any>(NSE_ENDPOINTS.lowerBand);
      const records = data?.data || data || [];
      this.logger.log(`Fetched ${records.length} lower band hitters`);
      return records;
    } catch (err) {
      this.logger.error(`Failed to fetch lower band hitters: ${err.message}`);
      return [];
    }
  }

  async fetchUpperBandHitters(): Promise<any[]> {
    try {
      this.logger.log('Fetching Upper Band Hitters...');
      const data = await this.fetchWithRetry<any>(NSE_ENDPOINTS.upperBand);
      const records = data?.data || data || [];
      this.logger.log(`Fetched ${records.length} upper band hitters`);
      return records;
    } catch (err) {
      this.logger.error(`Failed to fetch upper band hitters: ${err.message}`);
      return [];
    }
  }

  async fetchVolumeGainers(): Promise<any[]> {
    try {
      this.logger.log('Fetching Volume Gainers...');
      const data = await this.fetchWithRetry<any>(NSE_ENDPOINTS.volumeGainers);
      const records = data?.data || data || [];
      this.logger.log(`Fetched ${records.length} volume gainers`);
      return records;
    } catch (err) {
      this.logger.error(`Failed to fetch volume gainers: ${err.message}`);
      return [];
    }
  }

  async fetchMostActiveEquities(): Promise<any[]> {
    try {
      this.logger.log('Fetching Most Active Equities...');
      const data = await this.fetchWithRetry<any>(NSE_ENDPOINTS.mostActive);
      const records = data?.data || data || [];
      this.logger.log(`Fetched ${records.length} most active equities`);
      return records;
    } catch (err) {
      this.logger.error(`Failed to fetch most active equities: ${err.message}`);
      return [];
    }
  }

  async fetchBhavCopy(date?: Date): Promise<any[]> {
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'ddMMyyyy');
    const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${dateStr}.csv`;

    try {
      this.logger.log(`Fetching Bhav Copy for date: ${dateStr}`);
      const response = await this.client.get(url, {
        headers: {
          ...this.getApiHeaders(),
          Accept: 'text/csv,application/csv,*/*',
          Referer: 'https://www.nseindia.com/',
        },
        responseType: 'text',
        timeout: 60000,
      });

      const csvContent = response.data as string;
      if (!csvContent || csvContent.trim().length === 0) {
        this.logger.warn('Empty Bhav Copy response');
        return [];
      }

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });

      this.logger.log(`Fetched ${records.length} bhav copy records`);
      return records;
    } catch (err) {
      this.logger.error(`Failed to fetch Bhav Copy for ${dateStr}: ${err.message}`);
      return [];
    }
  }

  async fetchAllData(date?: Date): Promise<{
    lowerBand: any[];
    upperBand: any[];
    volumeGainers: any[];
    mostActive: any[];
    bhavCopy: any[];
  }> {
    await this.initSession();

    const [lowerBand, upperBand, volumeGainers, mostActive, bhavCopy] = await Promise.allSettled([
      this.fetchLowerBandHitters(),
      this.fetchUpperBandHitters(),
      this.fetchVolumeGainers(),
      this.fetchMostActiveEquities(),
      this.fetchBhavCopy(date),
    ]);

    return {
      lowerBand: lowerBand.status === 'fulfilled' ? lowerBand.value : [],
      upperBand: upperBand.status === 'fulfilled' ? upperBand.value : [],
      volumeGainers: volumeGainers.status === 'fulfilled' ? volumeGainers.value : [],
      mostActive: mostActive.status === 'fulfilled' ? mostActive.value : [],
      bhavCopy: bhavCopy.status === 'fulfilled' ? bhavCopy.value : [],
    };
  }
}

function configService_retry_delay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000);
}
