import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { Sms } from 'src/sms'
import { HeadID } from './member.service'

@Injectable()
export class ConsumeService {
  constructor(private prismaService: PrismaService) {}
  async work(
    consumeId: number,

    employees: { employeeId: number; items: number[] }[],
  ) {
    let result = null
    try {
      await this.prismaService.$transaction(async (prismaService) => {
        const c2e = await prismaService.consume2employee.findMany({
          where: { consumeId },
          select: { id: true },
        })
        await prismaService.consume2employee2serviceItem.deleteMany({
          where: { consume2employeeId: { in: c2e.map((c) => c.id) } },
        })
        await prismaService.consume2employee.deleteMany({
          where: { consumeId },
        })
        for (const e of employees) {
          await prismaService.consume2employee.create({
            data: {
              employeeId: e.employeeId,
              consumeId,
              items: {
                create: e.items.map((ei) => {
                  return { serviceItemId: ei }
                }),
              },
            },
          })
        }
      })
    } catch (err) {
      console.error(err)
      result = err.message
    }
    return result
  }
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

    // balances
    //   .filter((p) => p.discount.lessThan(1))
    //   .forEach((p) => {
    //     m.balance = p.balance.add(m.balance)
    //   })

    const sids = serviceItems.map((s) => s.serviceItemId)
    const sItems = await this.prismaService.serviceItem.findMany({
      where: { id: { in: sids } },
    })

    let result = null
    try {
      await this.prismaService.$transaction(async (prismaService) => {
        for (const s of serviceItems) {
          let acount = 0 //划余额次数
          let decount = 0 //划次卡次数
          const ba = balances.find((b) => b.serviceItemId == s.serviceItemId)
          if (ba && ba.balance.greaterThan(0)) {
            //如果还有次数 先划次 否则划余额
            if (ba.balance.greaterThanOrEqualTo(s.count))
              //次数足够
              decount = s.count
            //次数不足
            else throw new Error('余额不足')

            if (decount > 0) {
              s.counterCard = true //次卡消费

              const b = await prismaService.balance.update({
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
          }
        }
        let priceSum = 0
        if (serviceItems.some((s) => s.counterCard == false)) {
          let priceSumNew = 0
          for (const s of serviceItems.filter((s) => s.counterCard == false)) {
            const as = sItems.find((asi) => asi.id == s.serviceItemId)
            // TODO 根据办卡
            // balance表添加charge_time charge_time过2023-3-20后的划卡按58元计算

            const price = as.price * s.count
            priceSum += price
            priceSumNew += price

            if (as.name == '头疗') {
              priceSumNew += 10
            }
          }

          //扣除涨价前余额
          const b = balances.find(
            (b) =>
              b.discount != null &&
              b.discount.lessThan(1) &&
              b.cardId == null &&
              b.balance.greaterThanOrEqualTo(b.discount.mul(priceSum)),
          )
          let updateResult
          if (b) {
            //折扣卡余额足够
            priceSum = (b.discount.toNumber() * 10 * priceSum) / 10
            const balance = parseFloat(
              (b.balance.toNumber() - priceSum).toFixed(1),
            )
            updateResult = await prismaService.balance.update({
              where: { id: b.id },
              data: { balance },
            })

            await prismaService.member.update({
              where: { id: m.id },
              data: {
                consume: { increment: priceSum },
              },
            })
          } else {
            //扣除涨价后余额
            const b = balances.find(
              (b) =>
                b.discount != null &&
                b.discount.lessThan(1) &&
                b.cardId != null &&
                b.balance.greaterThanOrEqualTo(b.discount.mul(priceSumNew)),
            )
            if (b) {
              priceSum = (b.discount.toNumber() * 10 * priceSumNew) / 10
              const balance = parseFloat(
                (b.balance.toNumber() - priceSum).toFixed(1),
              )
              updateResult = await prismaService.balance.update({
                where: { id: b.id },
                data: { balance },
              })

              await prismaService.member.update({
                where: { id: m.id },
                data: {
                  consume: { increment: priceSum },
                },
              })
            } else if (m.balance.greaterThanOrEqualTo(priceSum)) {
              //划储值卡余额 或散客
              if(m.name == '散客')
              {
                priceSum = priceSumNew
              }
              updateResult = await prismaService.member.update({
                where: { id: m.id },
                data: {
                  balance: { decrement: priceSum },
                  consume: { increment: priceSum },
                },
              })
            } else {
              throw new Error('余额不足')
            }
          }

          Sms.consumeSms(
            m.phone,
            m.no.toString().substring(2),
            priceSum,
            updateResult.balance,
          )
        }

        await prismaService.consume.create({
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
      })
      console.log('consume complete')
    } catch (err) {
      console.error(err)
      result = err.message
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
      include: { items: true },
      where: {
        memberId,
        OR: [{ refund: false }, { refund: null }],
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
        OR: [{ refund: false }, { refund: null }],
      },
    })
  }
  async getAllConsumeList(startDate: Date, endDate: Date, shopId: number) {
    const arr = await this.prismaService.consume.findMany({
      include: { items: true },
      where: {
        time: { lte: endDate, gte: startDate },
        OR: [{ refund: false }, { refund: null }],
        shopId,
      },
      orderBy: { time: 'desc' },
    })
    const result = await this.toConsumeList(arr)
    return result
  }

  async toConsumeList(arr) {
    const arrServiceItems = await this.prismaService.serviceItem.findMany({
      select: { id: true, name: true },
    })
    const result = []
    for (const v of arr) {
      const member = await this.prismaService.member.findUnique({
        where: { id: v.memberId },
        select: { name: true },
      })
      if (member) {
        result.push({
          id: v.id,
          member: member.name,
          product: v.items.map((s) => {
            const si = arrServiceItems.find((asi) => asi.id == s.serviceItemId)
            return {
              name: si.name,
              count: s.count,
            }
          }),
          price: parseFloat(v.price.toFixed(1)),
          time: v.time,
        })
      }
    }

    return result
  }
}
