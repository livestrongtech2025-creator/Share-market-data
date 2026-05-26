import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsController } from './logs.controller';
import { JobLog } from '../jobs/entities/job-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobLog])],
  controllers: [LogsController],
})
export class LogsModule {}
