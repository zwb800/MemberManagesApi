import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class ServiceItemService {
  constructor(private prismaService: PrismaService) {}
  async list() {
    return await this.prismaService.serviceItem.findMany()
  }
}
