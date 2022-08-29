import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class PrepaidCardService {
  constructor(private prismaService: PrismaService) {}
  async list() {
    return await this.prismaService.prepaidCard.findMany({
      where: { deleted: false, },
    })
  }
}
