import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from 'socket.io';

@WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
export class PushGateway{
    @WebSocketServer()
    server: Server;

    push(r){
        return this.server.emit("newReservation",r)
    }
}