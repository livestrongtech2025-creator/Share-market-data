import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatService } from './chat.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly chatService: ChatService,
  ) {}

  @Get('market-summary')
  @ApiOperation({ summary: 'Get AI market summary' })
  getMarketSummary(@Query('date') date?: string) {
    return this.aiService.getMarketSummary(date);
  }

  @Get('stock-insights')
  @ApiOperation({ summary: 'Get all AI stock insights' })
  getStockInsights(@Query() query: PaginationDto) {
    return this.aiService.getStockInsights(query);
  }

  @Get('stock-insights/:symbol')
  @ApiOperation({ summary: 'Get AI insight for specific stock' })
  getStockInsight(@Param('symbol') symbol: string, @Query('date') date?: string) {
    return this.aiService.getStockInsight(symbol, date);
  }

  @Get('signals')
  @ApiOperation({ summary: 'Get AI trading signals' })
  getSignals(@Query() query: PaginationDto) {
    return this.aiService.getSignals(query);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get AI alerts' })
  getAlerts(@Query() query: PaginationDto) {
    return this.aiService.getAlerts(query);
  }

  @Get('alerts/unread-count')
  @ApiOperation({ summary: 'Get unread alerts count' })
  getUnreadCount() {
    return this.aiService.getUnreadAlertsCount().then(count => ({ count }));
  }

  @Post('alerts/:id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  markRead(@Param('id') id: string) {
    return this.aiService.markAlertRead(id).then(() => ({ success: true }));
  }

  @Get('watchlist-alerts')
  @ApiOperation({ summary: 'Get watchlist alerts' })
  getWatchlistAlerts(@Query() query: PaginationDto) {
    return this.aiService.getAlerts(query);
  }

  @Post('chat/ask')
  @ApiOperation({ summary: 'AI chat — ask about NSE market data' })
  async chat(@Body() body: { message: string; history?: any[] }) {
    return this.chatService.chat(body.message, body.history || []);
  }
}
