import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsumeController } from './consume.controller';
import { EmployeeController } from './employee.controller';
import { MemberController } from './member.controller';
import { PrepaidCardController } from './prepaidcard.controller';
import { ServiceItemController } from './serviceitem.controller';

@Module({
  imports: [],
  controllers: [
    AppController,
    MemberController,
    ConsumeController,
    ServiceItemController,
    EmployeeController,
    PrepaidCardController
  ],
  providers: [AppService],
})
export class AppModule {}
