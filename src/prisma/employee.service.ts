import { Injectable } from '@nestjs/common'
import { Decimal } from '@prisma/client/runtime'
import { IEmployeeService } from 'src/mongodb/employee.service'
import { PrismaService } from 'src/prisma.service'
import { connect } from './db'
import { HeadID } from './member.service'

@Injectable()
export class EmployeeService implements IEmployeeService {
  async list() {
    return await this.prismaService.employee.findMany()
  }
  constructor(private prismaService: PrismaService) {}

  async footer(startDate: Date, endDate: Date, shopId: number) {
    const sumNew = await this.prismaService.member.count({
      where: { newCardTime: { lte: endDate, gte: startDate }, shopId: shopId },
    })

    const consumes = await this.prismaService.consume.findMany({
      include: { employees: { include: { items: true } } },
      where: {
        OR: [{ refund: false }, { refund: null }],
        time: { lte: endDate, gte: startDate },
        shopId: shopId,
      },
    })

    const sItems = await this.prismaService.serviceItem.findMany()

    const prepaidCards = await this.prismaService.prepaidCard.findMany()

    const cards = await this.prismaService.chargeItem.findMany({
      where: {
        OR: [{ refund: false }, { refund: null }],
        time: { lte: endDate, gte: startDate },
        shopId: shopId,
      },
    })
    let cardPrice = 0
    let otherPrice = 0

    const l = cards.filter(c=>c.itemId!=null)
    const cardCount = l.length

    if (l.length > 0) {
      cardPrice = l.map((c) => c.pay.toNumber()).reduce((t, n) => t + n)

      // for (const itemId of l) {
      //     const c = prepaidCards.find(p=>p._id == itemId)

      // }
    }

    const ll = cards.filter((c) => c.itemId == null)
    if (ll.length > 0) {
      otherPrice = ll.map((c) => c.pay.toNumber()).reduce((t, n) => t + n)
    }

    let sum = 0

    const items = sItems.map((s) => {
      let count = 0
      if (s.id == HeadID) {
        //计算只做了头疗的数量
        consumes.forEach((c) => {
          c.employees.forEach((e) => {
            if (
              e.items.length == 1 &&
              e.items.some((i) => i.serviceItemId == s.id)
            )
              count++
          })
        })

        //计算做了头疗的数量
        consumes.forEach((c) => {
          c.employees.forEach((e) => {
            if (e.items.some((i) => i.serviceItemId == s.id)) sum++
          })
        })
      } else {
        //计算做了指定项目的数量
        consumes.forEach((c) => {
          c.employees.forEach((e) => {
            if (e.items.some((i) => i.serviceItemId == s.id)) count++
          })
        })
      }

      return {
        count: count,
        label: s.shortName,
      }
    })

    let sale: Decimal = new Decimal(0)
    if (consumes.length > 0) {
      sale = consumes.map((c) => c.price).reduce((t, n) => t.add(n))
    }

    return {
      sum,
      new: sumNew,
      items,
      sale,
      cardCount,
      cardPrice,
      otherPrice,
      cards: l.map((c) => {
        const p = prepaidCards.find((p) => p.id == c.itemId)
        if (p) {
          return p.price
        }
      }),
    }
  }

  async work(startDate: Date, endDate: Date, shopId: number) {
    const employees = await this.prismaService.employee.findMany()

    const prepaidCard = await this.prismaService.prepaidCard.findMany()
    // const serviceItems = await this.prismaService.serviceItem.findMany({
    //   select: { id: true, shortName: true },
    // })

    const consumes = await this.prismaService.consume.findMany({
      include: {
        employees: {
          select: {
            employee: { select: { name: true } },
            employeeId: true,
            items: { select: { serviceItem: { select: { shortName: true } } } },
          },
        },
      },
      where: {
        time: { lte: endDate, gte: startDate },
        OR: [{ refund: false }, { refund: null }],
        shopId,
      },
    })

    const arrMemberId = consumes.map((c) => c.memberId)

    const charges = await this.prismaService.chargeItem.findMany({
      include: { employees: { select: { employeeId: true } } },
      where: {
        NOT: [{ itemId: null }], //过滤单充没办卡
        OR: [{ refund: null }, { refund: false }],
        shopId,
        time: { lte: endDate, gte: startDate },
      },
    })

    charges
      .map((c) => c.memberId)
      .forEach((c) => {
        if (!arrMemberId.includes(c)) arrMemberId.push(c)
      })

    const members = await this.prismaService.member.findMany({
      where: { id: { in: arrMemberId } },
      select: { id: true, name: true },
    })

    const result = []
    for (const e of employees) {
      //消费记录
      const cArr = consumes.filter((c) =>
        c.employees.some((es) => es.employeeId == e.id),
      )

      const consumers = []
      for (const c of cArr) {
        const m = members.find((m) => m.id == c.memberId)
        if (m) {
          const items = c.employees
            .find((v) => v.employeeId == e.id)
            .items.map((ei) => ei.serviceItem.shortName)
          // const itemIds = c.employees
          //   .find((v) => v.employeeId == e.id)
          //   .items.map((p) => p.id)

          // for (const i of itemIds) {
          //   const s = await serviceItems.find((v) => v.id == i)
          //   items.push(s.shortName)
          // }

          consumers.push({
            id: m.id,
            name: m.name,
            items: items,
          })
        }
      }

      // 充值记录
      const chargeArr = charges.filter((c) =>
        c.employees.some((ce) => ce.employeeId == e.id),
      )
      const chargeResult = []
      for (const c of chargeArr) {
        const m = members.find((m) => m.id == c.memberId)
        if (m) {
          const card = prepaidCard.find((p) => p.id == c.itemId)
          chargeResult.push({
            id: m.id,
            name: m.name,
            card: card,
            commission: card.price ? card.price / 10 / c.employees.length : 0,
          })
        }
      }

      result.push({
        employee: e.name,
        consumers: consumers,
        charges: chargeResult,
      })
    }

    return {
      rows: result,
      footer: await this.footer(startDate, endDate, shopId),
    }
  }

  async statistics(year: number, month: number) {
    const startDate = new Date(`${year}-${month}-1`)
    const endDate = new Date(`${year}-${month}-1`)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(endDate.getDate() - 1)
    endDate.setHours(23, 59, 59, 999)
    const consumes = await this.prismaService.consume.findMany({
      where: {
        time: { lte: endDate, gte: startDate },
        OR: [{ refund: false }, { refund: null }],
      },
      select: {
        employees: {
          select: {
            items: { select: { serviceItemId: true } },
            employeeId: true,
          },
        },
        time: true,
      },
    })
    const charges = await this.prismaService.chargeItem.findMany({
      where: {
        // itemId: _.neq(null), //过滤单充没办卡
        NOT: { itemId: null },
        OR: [{ refund: false }, { refund: null }],
        time: { lte: endDate, gte: startDate },
      },
      select: {
        employees: { select: { employeeId: true } },
        pay: true,
        time: true,
        shopId: true,
      },
    })

    return {
      consumes,
      charges: charges.map((c) => {
        return {
          employees: c.employees.map(e=>e.employeeId),
          pay: c.pay.toNumber(),
          time: c.time,
          shopId: c.shopId,
        }
      }),
    }
  }
}
