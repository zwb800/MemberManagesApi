import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {io} from 'socket.io-client'

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{ 
      //   httpsOptions:{
      //   pfx:fs.readFileSync('../MemberManages/192.168.2.138.pfx')
      // }
  });
  app.enableCors()

  const socket = io('wss://service-em8ysfmx-1305763203.sh.apigw.tencentcs.com/release/')
  // socket.emit('newReservation')

  await app.listen(9000);
}
bootstrap();
