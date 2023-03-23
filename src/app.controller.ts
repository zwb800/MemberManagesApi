import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Prisma } from '@prisma/client'
import { AppService } from './app.service'
import { PrismaService } from './prisma.service'
import { PushGateway } from './push.gateway'
import { Sms } from './sms'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pushGateway: PushGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHello() {
    // this.pushGateway.push({})
    // Sms.send(["11111111"],'',[])
    // Sms.consumeSms('111111111','001',0,0)
    return process.env
  }

  @Get('m')
  async getAllMember() {
    const ms = await this.prisma.member.findMany({
      include: {
        balances: { include: { serviceItem: true } },
        chargeItem: {
          include: {
            card: true,
            serviceItems: { include: { serviceItem: true } },
          },
        },
      },
    })

    let refundSum = 0

    const result = ms.map((m) => {
      const consume_balance = m.consume.add(m.balance).toNumber()

      let refundAmount = 0
      if (consume_balance == 400) {
        refundAmount = 100
      } else if (consume_balance == 500) {
        refundAmount = 200
      } else if (consume_balance == 700) {
        refundAmount = 200
      } else if (consume_balance == 900) {
        refundAmount = 400
      } else if (consume_balance == 2000) {
        refundAmount = 1000
      }

      refundSum += Math.max(m.balance.toNumber() - refundAmount, 0)

      return {
        name: m.name,
        consume_balance,
        balance: m.balance.toNumber(),
        balances: m.balances
          .filter((b) => b.balance.greaterThan(0) && b.serviceItem)
          .map((b) => b.serviceItem.shortName + 'x' + b.balance)
          .join(' '),
        gift: m.chargeItem
          .filter((c) => c.pay.equals(0))
          .map((c) =>
            c.serviceItems
              .map((s) => s.serviceItem.shortName + 'x' + s.count)
              .join(' '),
          )
          .join(' '),
        chargeCard: m.chargeItem.filter((c) => c.card).map((c) => c.card.label),
        charges: m.chargeItem
          .filter((c) => c.card == null && c.pay.greaterThan(0))
          .map((c) => c.pay)
          .join(' '),
      }
    })

    return {
      refundSum,
      result,
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async importTcb(@UploadedFile() file: Express.Multer.File) {
    let cb = async (json) => {
      return true
    }
    if (file.originalname == 'prepaidcard.json') {
      cb = await this.prepaidCardCb()
    } else if (file.originalname == 'stock.json') {
      cb = await this.stockCb()
    } else if (file.originalname == 'stocklog.json') {
      cb = await this.stockLogCb()
    } else if (file.originalname == 'member.json') {
      cb = await this.memberCb()
    } else if (file.originalname == 'reservationAvailable.json') {
      cb = await this.reservationAvailableCb()
    } else if (file.originalname == 'balance.json') {
      cb = await this.balanceCb()
    } else if (file.originalname == 'chargeitem.json') {
      cb = await this.chargeCb()
    } else if (file.originalname == 'consume.json') {
      cb = await this.consumeCb()
    }

    return this.importFile(file, cb)
  }

  async prepaidCardCb() {
    await this.clearTable('prepaidCard2serviceItem')
    await this.clearTable('prepaidCard')

    const serviceItems = await this.prisma.serviceItem.findMany({
      select: { id: true, oid: true },
    })
    return async (json) => {
      await this.prisma.prepaidCard.create({
        data: {
          label: json.label,
          price: json.price,
          prepaidCard2serviceItem: {
            create: json.serviceItemIds.map((s) => {
              const oid = this.getId(s.serviceItemId)
              return {
                serviceItemId: serviceItems.find((s) => s.oid == oid).id,
                count: s.count,
              }
            }),
          },
          oid: this.getId(json._id),
        },
      })
      return true
    }
  }

  async stockCb() {
    await this.clearTable('stockLog')
    await this.clearTable('stock')

    return async (json) => {
      await this.prisma.stock.create({
        data: {
          name: json.name,
          count: json.count,
          oid: json._id,
          unit: json.unit,
          shopId: parseInt(json.shopId),
        },
      })
      return true
    }
  }

  async stockLogCb() {
    await this.clearTable('stockLog')
    const stocks = await this.prisma.stock.findMany({
      select: { id: true, oid: true },
    })
    return async (json) => {
      await this.prisma.stockLog.create({
        data: {
          count: json.count,
          stockId: stocks.find((s) => s.oid == json.stockId).id,
          time: json.time.$date,
        },
      })
      return true
    }
  }

  async memberCb() {
    await this.clearTable('member')
    return async (json) => {
      await this.prisma.member.create({
        data: {
          oid: json._id,
          name: json.name,
          phone: json.phone,
          consume: json.consume,
          balance: json.balance,
          no: json.no,
          newCardTime: json.newCardTime.$date,
          shopId: parseInt(json.shopId),
          openId: '',
        },
      })
      return true
    }
  }

  async reservationAvailableCb() {
    await this.clearTable('reservationAvailable')
    return async (json) => {
      await this.prisma.reservationAvailable.create({
        data: {
          num: json.num,
          time: json.time,
        },
      })
      return true
    }
  }

  async balanceCb() {
    await this.clearTable('balance')
    const members = await this.prisma.member.findMany({
      select: { id: true, oid: true },
    })
    const items = await this.prisma.serviceItem.findMany({
      select: { id: true, oid: true },
    })
    return async (json) => {
      const m = members.find((m) => m.oid == json.memberId)
      if (m) {
        await this.prisma.balance.create({
          data: {
            memberId: m.id,
            balance: json.balance,
            serviceItemId: json.serviceItemId
              ? items.find((c) => c.oid == json.serviceItemId).id
              : null,
            discount: json.discount,
          },
        })
        return true
      }
      console.log('未找到 ' + JSON.stringify(json))
      return false
    }
  }

  async chargeCb() {
    await this.clearTable('chargeItem2employee')
    await this.clearTable('chargeItem2serviceItem')
    await this.clearTable('chargeItem')
    const members = await this.prisma.member.findMany({
      select: { id: true, oid: true },
    })
    const items = await this.prisma.serviceItem.findMany({
      select: { id: true, oid: true },
    })
    const cards = await this.prisma.prepaidCard.findMany({
      select: { id: true, oid: true },
    })
    const employees = await this.prisma.employee.findMany({
      select: { id: true, oid: true },
    })
    return async (json) => {
      const m = members.find((m) => m.oid == json.memberId)
      if (m) {
        await this.prisma.chargeItem.create({
          data: {
            memberId: m.id,
            pay: json.pay,
            balance: json.balance ? json.balance : 0,
            amount: json.amount,
            employees: {
              create: json.employees
                ? json.employees.map((e) => {
                    return {
                      employeeId: employees.find((es) => es.oid == e).id,
                    }
                  })
                : [],
            },
            serviceItems: {
              create: json.serviceItems
                ? json.serviceItems.map((s) => {
                    return {
                      serviceItemId: items.find((i) => i.oid == s.serviceItemId)
                        .id,
                      count: s.count,
                    }
                  })
                : [],
            },
            refund: json.refund,
            itemId: json.itemId
              ? cards.find((c) => c.oid == json.itemId).id
              : null,
            time: json.time.$date,
            shopId: parseInt(json.shopId),
          },
        })
        return true
      }
      console.log('未找到 ' + JSON.stringify(json))
      return false
    }
  }

  async consumeCb() {
    await this.clearTable('consume2employee2serviceItem')
    await this.clearTable('consume2employee')
    await this.clearTable('consume2serviceItem')
    await this.clearTable('consume')
    const members = await this.prisma.member.findMany({
      select: { id: true, oid: true },
    })
    const items = await this.prisma.serviceItem.findMany({
      select: { id: true, oid: true },
    })
    const cards = await this.prisma.prepaidCard.findMany({
      select: { id: true, oid: true },
    })
    const employees = await this.prisma.employee.findMany({
      select: { id: true, oid: true },
    })
    const arrNotExists = new Array<String>()

    return async (json) => {
      const m = members.find((m) => m.oid == json.memberId)
      if (m) {
        await this.prisma.consume.create({
          data: {
            memberId: m.id,
            price: json.price,
            employees: {
              create: json.employees
                ? json.employees
                    .filter((e) => e)
                    .map((e) => {
                      return {
                        employeeId: employees.find(
                          (es) => es.oid == e.employeeId,
                        ).id,
                        items: {
                          create: e.items.map((ei) => {
                            return {
                              serviceItemId: items.find((i) => i.oid == ei).id,
                            }
                          }),
                        },
                      }
                    })
                : [],
            },
            items: {
              create: json.serviceItems
                ? json.serviceItems.map((s) => {
                    return {
                      serviceItemId: items.find((i) => i.oid == s.serviceItemId)
                        .id,
                      count: s.count,
                      counterCard: s.counterCard ? s.counterCard : false,
                    }
                  })
                : [],
            },
            refund: json.refund,
            time: json.time.$date,
            shopId: parseInt(json.shopId),
          },
        })
        return true
      }

      if (!arrNotExists.includes(json.memberId)) {
        arrNotExists.push(json.memberId)
        console.log('未找到 ' + json.memberId + ' ' + arrNotExists.length)
      }
      return false
    }
  }

  async clearTable(table: string) {
    await this.prisma.$executeRaw(Prisma.sql(['DELETE FROM ' + table]))
    return await this.prisma
      .$executeRaw`DELETE FROM sqlite_sequence WHERE name = ${table}`
  }

  getId(_id) {
    return typeof _id == 'object' ? _id.$oid : _id
  }

  async importFile(
    file: Express.Multer.File,
    processCb: (any) => Promise<boolean>,
  ) {
    let succesCount = 0
    const jsonFile = file.buffer.toString()
    let start = 0
    while (true) {
      const end = jsonFile.indexOf('\n', start)
      if (end < 0) break
      const line = jsonFile.substring(start, end)
      start = end + 1

      const json = JSON.parse(line)

      // console.log(json)
      if (await processCb(json)) succesCount++
    }
    return succesCount
  }
}
