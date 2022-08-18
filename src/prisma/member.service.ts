import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { Sms } from 'src/sms'
export const HeadID = 1
@Injectable()
export class MemberService {
  constructor(private prismaService: PrismaService) {}

  async exists(openId: string) {
    const member = await this.prismaService.member.findFirst({
      where: { openId },
    })
    return member != null
  }

  async import(mArr) {
    // const members = await this.prismaService.member.findMany()
    // const collBalance = db.collection('Balance')
    // if((await members.count()).total>0)
    // {
    //     return
    // }
    // const balanceArr = []
    // return await db.runTransaction(async ()=>{
    //     const insertM = mArr.map(m=>{
    //        return {
    //             no:m.no,
    //             name:m.name,
    //             phone:m.phone,
    //             balance:m.balance,
    //             consume:m.consume,
    //             newCardTime:new Date(m.newCardTime)
    //        }
    //     })
    //     const result = await members.add(insertM)
    //     if(result.ids){
    //         const mH = mArr.filter(m=>m.head)
    //         const mN = mH.map(m=>m.no)
    //         const ms = (await members.where({no:_.in(mN)}).field({_id:true,no:true}).get()).data
    //         for (const m of ms) {
    //             for (const h of mH){
    //                 if(h.no == m.no){
    //                     balanceArr.push({
    //                         memberId:m._id,
    //                         balance:h.head,
    //                         serviceItemId:HeadID
    //                     })
    //                 }
    //             }
    //         }
    //     }
    //     await collBalance.add(balanceArr)
    // })
  }

  async refund(id: number) {
    // const members = await this.prismaService.member.findMany()
    // const chargeItem = this.prismaService.chargeItem.findMany()
    // const collBalance = this.prismaService.balance.findMany()
    // const cards = await this.prismaService.prepaidCard.findMany()
    // const c = await this.prismaService.chargeItem.findUnique({ where: { id } })
    // const m = await this.prismaService.member.findUnique({ where: { id } })
    // const balances = await this.prismaService.balance.findMany({
    //   where: { memberId: m.id },
    // })
    // let result = ''
    // try {
    //   if (c.amount.toNumber() > 0) {
    //     m.balance -= c.amount.toNumber()
    //   }
    //   if (c.pay == 0) {
    //     //赠送退回
    //     if (c.serviceItems) {
    //       await c.serviceItems.forEach(async (s) => {
    //         const b = balances.find((b) => b.serviceItemId == s.serviceItemId)
    //         if (b) {
    //           await transaction
    //             .collection('Balance')
    //             .doc(b._id)
    //             .update({
    //               balance: _.inc(s.count * -1),
    //             })
    //         }
    //       })
    //     }
    //   }
    //   if (c.itemId) {
    //     //充卡退回
    //     const card = (await cards.doc(c.itemId).get()).data[0]
    //     if (card.gift) {
    //       //储值卡退回
    //       m.balance -= card.price + card.gift
    //     }
    //     if (card.serviceItemIds) {
    //       await card.serviceItemIds.forEach(async (s) => {
    //         const b = balances.find((b) => b.serviceItemId == s.serviceItemId)
    //         if (b) {
    //           await transaction
    //             .collection('Balance')
    //             .doc(b._id)
    //             .update({
    //               balance: _.inc(s.count * -1),
    //             })
    //         }
    //       })
    //     }
    //   }
    //   if (m.balance < 0) {
    //     result = '撤销后余额不足'
    //     await transaction.rollback('撤销后余额不足')
    //   }
    //   await transaction.collection('Member').doc(c.memberId).update({
    //     balance: m.balance,
    //   })
    //   await transaction
    //     .collection('ChargeItem')
    //     .doc(id)
    //     .update({ refund: true })
    // } catch (e) {
    //   console.error(e)
    // }
    // return result
  }

  async getAllChargeList(
    startDate: Date,
    endDate: Date,
    showGift: boolean,
    showPayOnce: boolean,
    shopId: number,
  ) {
    const arrCards = await this.prismaService.prepaidCard.findMany()

    const filter = {
      time: { lte: endDate, gte: startDate },
      OR: [{ refund: false }, { refund: null }],
      shopId,
    }
    if (showGift) {
    } else {
      filter['pay'] = { gt: 0 }
    }
    if (showPayOnce) {
    } else {
      //   filter['itemId'] = null
    }

    const arr = await this.prismaService.chargeItem.findMany({
      include: {
        member: { select: { name: true } },
        serviceItems: {
          select: { serviceItem: { select: { name: true } }, count: true },
        },
        employees: { select: { employeeId: true } },
        card: true,
      },
      where: filter,
      orderBy: { time: 'desc' },
    })

    const result = []
    for (const v of arr) {
      if (v.member) {
        let card
        if (v.itemId) {
          card = arrCards.find((ac) => ac.id == v.itemId)
        }

        result.push({
          id: v.id.toString(),
          member: v.member.name,
          card: card ? card.label : null,
          //   price: v.price,
          time: v.time,
          balance: v.balance.toNumber(),
          pay: v.pay.toNumber(),
          amount: v.amount.toNumber(),
          serviceItems: v.serviceItems.map((s) => {
            return { count: s.count, name: s.serviceItem.name }
          }),
          employees: v.employees.map(e=>e.employeeId),
        })
      }
    }

    return result
  }

  async getChargeList(memberId) {
    const citems = await this.prismaService.chargeItem.findMany({
      include: { card: true, serviceItems: { include: { serviceItem: true } } },
      where: { memberId, OR: [{ refund: false }, { refund: null }] },
      orderBy: { time: 'desc' },
    })

    return citems.map((c) => {
      let product = null
      if (c.serviceItems) {
        product = c.serviceItems.map((s) => {
          return {
            name: s.serviceItem.name,
            count: s.count,
          }
        })
      }
      return {
        time: c.time,
        balance: c.balance,
        pay: c.pay,
        amount: c.amount,
        card: c.card ? c.card.label : null,
        product,
      }
    })
  }

  async get(id: number) {
    const m = await this.prismaService.member.findUnique({ where: { id } })
    const arrBalances = await this.prismaService.balance.findMany({
      include: { serviceItem: true },
      where: { memberId: id },
    })

    const arrB = arrBalances.map((p) => {
      let label = ''
      if (p.serviceItem) {
        label = p.serviceItem.name
      } else if (p.discount) {
        label = p.discount.toNumber() * 10 + '折卡'
      }

      return {
        serviceItemName: label,
        balance: p.balance,
      }
    })
    return {
      member: m,
      balances: arrB,
    }
  }

  async gift(
    memberId: number,
    arrBalances: Array<{ serviceItemId: number; count: number }>,
    shopId: number,
  ) {
    const balancesOld = await this.prismaService.balance.findMany({
      where: { memberId },
    })

    for (const b of arrBalances) {
      const bo = balancesOld.find((bo) => bo.serviceItemId == b.serviceItemId)
      if (bo) {
        await this.prismaService.balance.update({
          where: { id: bo.id },
          data: {
            balance: { increment: b.count },
          },
        })
      } else {
        await this.prismaService.balance.create({
          data: {
            memberId,
            balance: b.count,
            serviceItemId: b.serviceItemId,
          },
        })
      }
    }

    //插入充值记录
    await this.prismaService.chargeItem.create({
      data: {
        memberId: 1,
        pay: 0, //实际支付
        amount: 0, //单付
        balance: 0,
        time: new Date(),
        serviceItems: {
          create: arrBalances,
        },
        shopId,
      },
    })

    return true
  }

  async charge(
    member: { id?: number; name?: string; phone?: string; openId?: string },
    amount: number,
    cardId: number,
    employees: number[],
    shopId: number,
  ) {
    let prepayCard = null
    if (cardId)
      prepayCard = await this.prismaService.prepaidCard.findUnique({
        where: { id: cardId },
      })
    let balance = amount
    let pay = amount
    let arrBalances = []
    if (prepayCard) {
      pay += prepayCard.price
      if (prepayCard.gift) {
        balance += prepayCard.price + prepayCard.gift
      }
      if (prepayCard.discount) {
        arrBalances = arrBalances.concat({
          discount: prepayCard.discount,
          balance: prepayCard.price,
        })
      }
      if (prepayCard.serviceItemIds) {
        arrBalances = arrBalances.concat(
          prepayCard.serviceItemIds.map((p) => {
            return {
              serviceItemId: p.serviceItemId,
              balance: p.count,
            }
          }),
        )
      }
    }
    let accountBalance = 0
    let balancesOld = []
    if (member.id) {
      balancesOld = await this.prismaService.balance.findMany({
        where: { memberId: member.id },
      })
      //更新余额
      const result = await this.prismaService.member.update({
        where: { id: member.id },
        data: { balance: { increment: balance } },
      })
      accountBalance = result.balance.toNumber()
    } //新顾客
    else {
      delete member.id
      const no = await this.getNo()

      const r = await this.prismaService.member.create({
        data: {
          no,
          oid: '',
          name: member.name,
          balance,
          consume: 0,
          newCardTime: new Date(),
          shopId,
          openId: member.openId,
          phone: member.phone,
        },
      })
      member.id = r.id
      accountBalance = balance
    }

    for (const b of arrBalances) {
      if (b.discount && balancesOld.some((bo) => bo.discount == b.discount)) {
        //折扣卡
        await this.prismaService.balance.updateMany({
          where: { memberId: member.id, discount: b.discount },
          data: { balance: { increment: b.balance } },
        })
      } else if (
        b.serviceItemId &&
        balancesOld.some((bo) => bo.serviceItemId == b.serviceItemId)
      ) {
        //次卡或套盒
        await this.prismaService.balance.updateMany({
          where: { memberId: member.id, serviceItemId: b.serviceItemId },
          data: { balance: { increment: b.balance } },
        })
      } else {
        await this.prismaService.balance.create({
          data: {
            memberId: member.id,
            serviceItemId: b.serviceItemId,
            discount: b.discount,
            balance: b.balance,
          },
        })
      }
    }
    if (prepayCard || pay > 0) {
      //插入充值记录
      await this.prismaService.chargeItem.create({
        data: {
          memberId: member.id,
          employees: {
            create: employees.map((e) => {
              return { employeeId: e }
            }),
          },
          balance: accountBalance, //充完余额
          pay: pay, //实际支付
          amount, //单付
          itemId: prepayCard ? prepayCard._id : null,
          time: new Date(),
          shopId: shopId,
        },
      })
      const m = await this.prismaService.member.findUnique({
        where: { id: member.id },
      })
      if (balance) {
        Sms.chargeSms(
          m.phone,
          m.no.toString().substring(2),
          balance,
          accountBalance,
        )
      } else if (arrBalances.length) {
        const headB = arrBalances.find((b) => b.serviceItemId == HeadID)
        if (headB) {
          const oldB = await this.prismaService.balance.findFirst({
            where: { memberId: member.id, serviceItemId: HeadID },
            select: { balance: true },
          })
          Sms.chargeCounterCard(
            m.phone,
            m.no.toString().substring(2),
            headB.balance,
            oldB.balance.toNumber(),
          )
        }
      }
    }
    return true
  }

  async getNo(): Promise<number> {
    let no = 80000
    const maxNo = await await this.prismaService.member.findFirst({
      select: { no: true },
      orderBy: { no: 'desc' },
    })

    if (maxNo) no = maxNo.no + 1
    return no
  }
  async all(keyword: string, index: number, pageSize: number) {
    let query: Prisma.memberWhereInput = {}
    if (keyword) {
      query = {
        OR: [{ name: { contains: keyword } }, { phone: { contains: keyword } }],
      }
    }
    return this.prismaService.member.findMany({
      where: query,
      orderBy: { newCardTime: 'desc' },
      skip: (index - 1) * pageSize,
      take: pageSize,
    })
  }
}
