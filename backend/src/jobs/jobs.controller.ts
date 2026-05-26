import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SchedulerService } from './scheduler.service';

class TriggerJobDto {
  @IsOptional() @IsString() date?: string;
}

@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
@Controller('admin')
export class JobsController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('trigger-ingestion')
  @ApiOperation({ summary: 'Manually trigger data ingestion (Admin)' })
  triggerIngestion(@Body() body: TriggerJobDto) {
    const date = body.date ? new Date(body.date) : new Date();
    return this.schedulerService.runManualIngestion(date);
  }
}
