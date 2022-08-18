import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

export abstract class IStockService {
  abstract getLogs(id: number)
  abstract add(name: string, unit: string, shopId: number)
  abstract updateStock(id: number, num: number)
  abstract list(shopId: number)
}

@Injectable()
export class StockService implements IStockService {
  constructor(private prismaService: PrismaService) {}

  async list(shopId: number) {
    return await this.prismaService.stock.findMany({ where: { shopId } })
  }

  async getLogs(id: number) {
    return await this.prismaService.stockLog.findMany({
      where: { stockId: id },
      orderBy: { time: 'desc' },
    })
  }

  async add(name: string, unit: string, shopId: number) {
    const exists = await this.prismaService.stock.findFirst({
      where: { shopId, name },
    })
    if (exists) return '商品已存在'

    return await this.prismaService.stock.create({
      data: {
        name,
        unit,
        shopId,
        count: 0,
        oid:''
      },
    })
  }

  async updateStock(id: number, num: number) {
    await this.prismaService.stock.update({
      where: { id },
      data: {
        count: { increment: num },
        stockLog: {
          create: [
            {
              stockId: id,
              count: num,
              time: new Date(),
            },
          ],
        },
      },
    })
  }
}
