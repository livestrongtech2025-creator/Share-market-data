import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobLog } from '../jobs/entities/job-log.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('logs')
export class LogsController {
  constructor(
    @InjectRepository(JobLog)
    private readonly jobLogRepo: Repository<JobLog>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get job execution logs' })
  async getLogs(@Query() query: PaginationDto): Promise<PaginatedResponse<JobLog>> {
    const qb = this.jobLogRepo.createQueryBuilder('l').orderBy('l.startedAt', 'DESC');
    if (query.search) qb.where('l.jobName ILIKE :s', { s: `%${query.search}%` });
    qb.skip(query.skip).take(query.limit || 20);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get job statistics' })
  async getStats() {
    const total = await this.jobLogRepo.count();
    const completed = await this.jobLogRepo.count({ where: { status: 'completed' } });
    const failed = await this.jobLogRepo.count({ where: { status: 'failed' } });
    const recent = await this.jobLogRepo.findOne({ where: {}, order: { startedAt: 'DESC' } });
    return { total, completed, failed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0, lastRun: recent?.startedAt };
  }
}
