import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatService } from './chat.service';
import { AiStockInsight, AiMarketSummary, AiAlert } from './entities/ai.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiStockInsight, AiMarketSummary, AiAlert])],
  controllers: [AiController],
  providers: [AiService, ChatService],
  exports: [AiService, ChatService],
})
export class AiModule {}

