import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist } from './entities/watchlist.entity';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
  ) {}

  async create(userId: string, name: string, description?: string): Promise<Watchlist> {
    const wl = this.watchlistRepo.create({ userId, name, description, symbols: [] });
    return this.watchlistRepo.save(wl);
  }

  async getUserWatchlists(userId: string): Promise<Watchlist[]> {
    return this.watchlistRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async addSymbol(userId: string, watchlistId: string, symbol: string): Promise<Watchlist> {
    const wl = await this.watchlistRepo.findOne({ where: { id: watchlistId } });
    if (!wl) throw new NotFoundException('Watchlist not found');
    if (wl.userId !== userId) throw new ForbiddenException();
    if (!wl.symbols.includes(symbol.toUpperCase())) {
      wl.symbols = [...wl.symbols, symbol.toUpperCase()];
      await this.watchlistRepo.save(wl);
    }
    return wl;
  }

  async removeSymbol(userId: string, watchlistId: string, symbol: string): Promise<Watchlist> {
    const wl = await this.watchlistRepo.findOne({ where: { id: watchlistId } });
    if (!wl) throw new NotFoundException('Watchlist not found');
    if (wl.userId !== userId) throw new ForbiddenException();
    wl.symbols = wl.symbols.filter(s => s !== symbol.toUpperCase());
    return this.watchlistRepo.save(wl);
  }

  async delete(userId: string, watchlistId: string): Promise<void> {
    const wl = await this.watchlistRepo.findOne({ where: { id: watchlistId } });
    if (!wl) throw new NotFoundException();
    if (wl.userId !== userId) throw new ForbiddenException();
    await this.watchlistRepo.delete(watchlistId);
  }
}
