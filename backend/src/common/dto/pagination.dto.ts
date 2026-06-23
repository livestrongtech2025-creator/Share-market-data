import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Date filter YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  // Bhav Copy specific filters
  @ApiPropertyOptional({ description: 'Filter by exact series (e.g. EQ, BE, SM)' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ description: 'Minimum close price' })
  @IsOptional()
  @Type(() => Number)
  minClose?: number;

  @ApiPropertyOptional({ description: 'Maximum close price' })
  @IsOptional()
  @Type(() => Number)
  maxClose?: number;

  @ApiPropertyOptional({ description: 'Minimum total traded quantity' })
  @IsOptional()
  @Type(() => Number)
  minVolume?: number;

  @ApiPropertyOptional({ description: 'Maximum total traded quantity' })
  @IsOptional()
  @Type(() => Number)
  maxVolume?: number;

  // Computed: (prevClose - closePrice) * 100 / prevClose — positive when price fell.
  @ApiPropertyOptional({ description: 'Minimum % drop ((prevClose - close) * 100 / prevClose)' })
  @IsOptional()
  @Type(() => Number)
  minPctDrop?: number;

  @ApiPropertyOptional({ description: 'Maximum % drop ((prevClose - close) * 100 / prevClose)' })
  @IsOptional()
  @Type(() => Number)
  maxPctDrop?: number;

  @ApiPropertyOptional({ description: 'Minimum turnover in Crores (totalTradedValue stored as Lakhs, so Cr * 100)' })
  @IsOptional()
  @Type(() => Number)
  minTurnoverCr?: number;

  @ApiPropertyOptional({ description: 'Minimum delivery percentage (delivPer >= value)' })
  @IsOptional()
  @Type(() => Number)
  minDelivPer?: number;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }
}

export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPrevPage = page > 1;
  }
}
