import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsumeController } from './consume.controller';
import { EmployeeController } from './employee.controller';
import { MemberController } from './member.controller';
import { IMemberService } from './mongodb/member.service';
import { PrepaidCardController } from './prepaidcard.controller';
import { ServiceItemController } from './serviceitem.controller';





// //MongoDb数据库
import { MemberService } from './mongodb/member.service';
import { EmployeeService, IEmployeeService } from './mongodb/employee.service';
import { ConsumeService, IConsumeService } from './mongodb/consume.service';

//腾讯TCB数据库
import { MemberService as TcbMemberService } from './tcb/member.service';
import { EmployeeService as TcbEmployeeService } from './tcb/employee.service';
import { ConsumeService as TcbConsumeService } from './tcb/consume.service';


import { DbType, dbType } from './utils';



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
  providers: [AppService,
    {provide:IMemberService,useClass:dbType == DbType.MongoDb?MemberService:TcbMemberService},
    {provide:IEmployeeService,useClass:dbType == DbType.MongoDb?EmployeeService:TcbEmployeeService},
    {provide:IConsumeService,useClass:dbType == DbType.MongoDb?ConsumeService:TcbConsumeService}
  ],
})
export class AppModule {}
