import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WatchlistService } from './watchlist.service';

class CreateWatchlistDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}

class AddSymbolDto {
  @IsString() symbol: string;
}

@ApiTags('watchlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('watchlists')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  getWatchlists(@Request() req: any) {
    return this.watchlistService.getUserWatchlists(req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() body: CreateWatchlistDto) {
    return this.watchlistService.create(req.user.id, body.name, body.description);
  }

  @Post(':id/symbols')
  addSymbol(@Request() req: any, @Param('id') id: string, @Body() body: AddSymbolDto) {
    return this.watchlistService.addSymbol(req.user.id, id, body.symbol);
  }

  @Delete(':id/symbols/:symbol')
  removeSymbol(@Request() req: any, @Param('id') id: string, @Param('symbol') symbol: string) {
    return this.watchlistService.removeSymbol(req.user.id, id, symbol);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.watchlistService.delete(req.user.id, id).then(() => ({ success: true }));
  }
}
