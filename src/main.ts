import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs'

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{ httpsOptions:{
    pfx:fs.readFileSync('C:/Users/zwb/sources/MemberManages/192.168.2.138.pfx')
  }
    
  });
  app.enableCors()
  await app.listen(3000);
}
bootstrap();
