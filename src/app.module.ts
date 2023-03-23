import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConsumeController } from './consume.controller'
import { EmployeeController } from './employee.controller'
import { MemberController } from './member.controller'
// import { IMemberService } from './mongodb/member.service'
import { PrepaidCardController } from './prepaidcard.controller'
import { ServiceItemController } from './serviceitem.controller'

// //MongoDb数据库
// import { MemberService } from './mongodb/member.service'
// import { EmployeeService, IEmployeeService } from './mongodb/employee.service'
// import { ConsumeService, IConsumeService } from './mongodb/consume.service'

//腾讯TCB数据库
// import { MemberService as TcbMemberService } from './tcb/member.service'
// import { EmployeeService as TcbEmployeeService } from './tcb/employee.service'
// import { ConsumeService as TcbConsumeService } from './tcb/consume.service'

import { DbType, dbType } from './utils'
import { IStockService, StockService } from './prisma/stock.service'
import { StockController } from './stock.controller'
// import { ReservationService } from './tcb/reservation.service'
// import { IReservationService } from './mongodb/reservation.service'
import { ReservationController } from './reservation.controller'
import { PushGateway } from './push.gateway'
import { PrismaService } from './prisma.service'
import { ServiceItemService } from './prisma/serviceitem.service'
// import { IServiceItemService } from './mongodb/db'
import {
  EmployeeService,
  EmployeeService as PrisamEmployeeService,
} from './prisma/employee.service'
import { MemberService } from './prisma/member.service'
import { ConsumeService } from './prisma/consume.service'
import { ReservationService } from './prisma/reservation.service'
import { PrepaidCardService } from './prisma/prepaidcard.service'
import { AuthMiddleware } from './auth.middleware'

@Module({
  imports: [],
  controllers: [
    AppController,
    MemberController,
    ConsumeController,
    ServiceItemController,
    EmployeeController,
    PrepaidCardController,
    StockController,
    ReservationController,
  ],
  providers: [
    AppService,
    PushGateway,
    PrismaService,
    ServiceItemService,
    MemberService,
    EmployeeService,
    ConsumeService,
    StockService,
    ReservationService,
    PrepaidCardService,
    // { provide: IServiceItemService, useClass: ServiceItemService },
    // { provide: IMemberService, useClass: MemberService },
    // { provide: IEmployeeService, useClass: PrisamEmployeeService },
    // { provide: IConsumeService, useClass: TcbConsumeService },
    // { provide: IStockService, useClass: StockService },
    // { provide: IReservationService, useClass: ReservationService },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
      consumer.apply(AuthMiddleware).forRoutes('*')
  }
}
