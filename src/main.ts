import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {io} from 'socket.io-client'
import { PrismaService } from './prisma.service';

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule,{ 
      //   httpsOptions:{
      //   pfx:fs.readFileSync('../MemberManages/192.168.2.138.pfx')
      // }
  });

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app)
  
  app.enableCors()

  // const socket = io('wss://service-em8ysfmx-1305763203.sh.apigw.tencentcs.com/release/')
  // socket.emit('newReservation')
  

  await app.listen(9000);
}
bootstrap();
