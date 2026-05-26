import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(MarketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, data: any) {
    client.join(data.room || 'market');
    return { event: 'subscribed', data: { room: data.room } };
  }

  broadcastMarketUpdate(data: any) {
    this.server.to('market').emit('market-update', data);
  }

  broadcastAlert(alert: any) {
    this.server.emit('alert', alert);
  }

  broadcastIngestionComplete(summary: any) {
    this.server.emit('ingestion-complete', summary);
  }
}
