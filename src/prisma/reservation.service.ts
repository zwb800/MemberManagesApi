import { Injectable } from '@nestjs/common'
import { format } from 'date-fns'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class ReservationService {
  async available() {
    return await this.prismaService.reservationAvailable.findMany()
  }
  constructor(private prismaService: PrismaService) {}

  async cancelById(id: number) {
    const result = await this.prismaService.reservation.update({
      where: { id },
      data: { deleted: true },
    })

    return result.deleted
  }

  async list(shopId: number) {
    const today = new Date(format(new Date(), 'yyyy-MM-dd'))
    const reservations = await this.prismaService.reservation.findMany({
      where: { shopId, time: { gte: today }, deleted: false },
      orderBy: { time: 'asc' },
    })
    const result = []
    for (const r of reservations) {
      let member = null
      if (r.memberId) {
        member = this.prismaService.member.findUnique({
          where: { id: r.memberId },
          select: { name: true, phone: true },
        })
      }
      result.push({
        id: r.id,
        member,
        time: r.time,
        num: r.num,
        remark: r.remark,
        create_time: r.create_time,
      })
    }
    return result
  }
  async updateOpenId(openId: string, phone: string) {
    const member = await this.prismaService.member.findFirst({
      where: { phone },
    })
    if (member) {
      await this.prismaService.member.update({
        where: { id: member.id },
        data: { openId },
      })
      return true
    }
    return false
  }
  async add(
    openId: string,
    time: Date,
    num: number,
    shopId: number,
    remark: string,
  ) {
    let member = null
    if (openId) {
      member = await this.prismaService.member.findFirst({
        where: { openId },
      })
    }

    return await this.prismaService.reservation.create({
      data: {
        time,
        num,
        memberId: member ? member.id : null,
        shopId,
        deleted: false,
        remark,
        create_time: new Date(),
      },
    })
  }
  async getByOpenID(openId: string) {
    const today = new Date(format(new Date(), 'yyyy-MM-dd'))
    const member = await this.prismaService.member.findFirst({
      where: { openId },
    })
    if (member) {
      return await this.prismaService.reservation.findMany({
        where: { time: { gte: today }, memberId: member.id, deleted: null },
      })
    }
    return []
  }

  async cancel(openId: string) {
    const today = new Date(format(new Date(), 'yyyy-MM-dd'))
    const member = await this.prismaService.member.findFirst({
      where: { openId },
    })
    if (member) {
      return await this.prismaService.reservation.updateMany({
        where: { time: { gte: today }, memberId: member.id, deleted: null },
        data: { deleted: true },
      })
    }
  }
}
