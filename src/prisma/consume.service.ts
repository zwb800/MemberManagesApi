import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { Sms } from 'src/sms'
import { HeadID } from './member.service'

@Injectable()
export class ConsumeService {
  constructor(private prismaService: PrismaService) {}

  async consume(
    memberId: number,
    serviceItems: {
      count: number
      serviceItemId: number
      counterCard?: boolean
    }[],
    employees: { employeeId: number; items: number[] }[],
    shopId: number,
  ) {
    const m = await this.prismaService.member.findUnique({
      include: { balances: true },
      where: { id: memberId },
    })
    const balances = m.balances

    balances
      .filter((p) => p.discount)
      .forEach((p) => {
        m.balance = p.balance.add(m.balance)
      })

    const sids = serviceItems.map((s) => s.serviceItemId)
    const sItems = await this.prismaService.serviceItem.findMany({
      where: { id: { in: sids } },
    })
    let priceSum = 0

    let result = null
    try {
      for (const s of serviceItems) {
        let acount = 0 //划余额次数
        let decount = 0 //划次卡次数
        const ba = balances.find((b) => b.serviceItemId == s.serviceItemId)
        if (ba && ba.balance) {
          //如果还有次数 先划次 否则划余额
          if (ba.balance.toNumber() >= s.count)
            //次数足够
            decount = s.count
          //次数不足
          else return 'insufficient balance'

          if (decount > 0) {
            s.counterCard = true //次卡消费

            const b = await this.prismaService.balance.update({
              where: { id: ba.id },
              data: { balance: { decrement: decount } },
            })

            if (b.serviceItemId == HeadID) {
              Sms.consumeCounterCard(
                m.phone,
                m.no.toString().substring(2),
                decount,
                b.balance.toNumber(),
              )
            }
          }
        } //没有次数 全部划余额
        else acount = s.count

        if (acount > 0) {
          s.counterCard = false //储值卡消费
          const as = sItems.find((asi) => asi.id == s.serviceItemId)
          const price = as.price * s.count
          priceSum += price
        }
      }

      if (priceSum > 0) {
        //扣除余额
        const b = balances.find(
          (b) =>
            b.discount &&
            b.balance.toNumber() > priceSum * b.discount.toNumber(),
        )
        let updateResult
        if (b) {
          priceSum = (b.discount.toNumber() * 10 * priceSum) / 10
          const balance = parseFloat(
            (b.balance.toNumber() - priceSum).toFixed(1),
          )
          updateResult = await this.prismaService.balance.update({
            where: { id: b.id },
            data: { balance },
          })
        } else if (m.balance.toNumber() - priceSum < 0) {
          result = '余额不足'
          return 'insufficient balance'
        } else {
          updateResult = await this.prismaService.member.update({
            where: { id: m.id },
            data: {
              balance: { decrement: priceSum },
              consume: { increment: priceSum },
            },
          })
        }

        Sms.consumeSms(
          m.phone,
          m.no.toString().substring(2),
          priceSum,
          updateResult.doc.balance,
        )
      }

      await this.prismaService.consume.create({
        data: {
          memberId: m.id,
          items: {
            create: serviceItems.map((e) => {
              return {
                serviceItemId: e.serviceItemId,
                count: e.count,
                counterCard: e.counterCard,
              }
            }),
          },
          price: priceSum,
          employees: {
            create: employees.map((e) => {
              return {
                employeeId: e.employeeId,
                items: {
                  create: e.items.map((ei) => {
                    return { serviceItemId: ei }
                  }),
                },
              }
            }),
          },
          time: new Date(),
          shopId,
        },
      })
    } catch (err) {
      console.error(err)
    }

    return result
  }

  async refund(id: number) {
    const c = await this.prismaService.consume.findUnique({
      include: { member: { include: { balances: true } }, items: true },
      where: { id },
    })
    const m = c.member
    const balances = m.balances
    const result = ''
    if (c.price.toNumber() > 0) {
      this.prismaService.member.update({
        where: { id: c.memberId },
        data: {
          balance: { increment: c.price },
          consume: { decrement: c.price },
        },
      })
    }
    for (const s of c.items.filter((s) => s.counterCard)) {
      if (s.counterCard) {
        //次卡消费退回次数
        const b = balances.find((b) => b.serviceItemId == s.serviceItemId)
        if (b) {
          await this.prismaService.balance.update({
            where: { id: b.id },
            data: { balance: { increment: s.count } },
          })
        }
      }
    }
    await this.prismaService.consume.update({
      where: { id },
      data: { refund: true },
    })
    return result
  }
  async getConsumeList(memberId: any, start: number, count: number) {
    const arr = await this.prismaService.consume.findMany({
      where: {
        memberId,
        NOT: { refund: true },
      },
      orderBy: { time: 'desc' },
      skip: start,
      take: count,
    })
    return await this.toConsumeList(arr)
  }

  async getConsumeListCount(memberId: number) {
    return await this.prismaService.consume.count({
      where: {
        memberId,
        NOT: { refund: true },
      },
    })
  }
  async getAllConsumeList(startDate: Date, endDate: Date, shopId: number) {
    const arr = await this.prismaService.consume.findMany({
      where: {
        time: { lte: endDate, gte: startDate },
        NOT: { refund: true },
        shopId,
      },
      orderBy: { time: 'desc' },
    })
    const result = await this.toConsumeList(arr)
    return result
  }

  async toConsumeList(arr) {
    const arrServiceItems = await this.prismaService.serviceItem.findMany()
    const result = []
    for (const v of arr) {
      const member = await this.prismaService.member.findUnique({
        where: { id: v.id },
        select: { name: true },
      })
      if (member) {
        result.push({
          id: v.id,
          member: member.name,
          product: v.serviceItems.map((s) => {
            const si = arrServiceItems.find((asi) => asi.id == s.serviceItemId)
            return {
              name: si.name,
              count: s.count,
            }
          }),
          price: v.price,
          time: v.time,
        })
      }
    }

    return result
  }
}
