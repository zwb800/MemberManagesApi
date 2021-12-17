import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemberController } from './member.controller';

@Module({
  imports: [],
  controllers: [AppController,MemberController],
  providers: [AppService],
})
export class AppModule {}
