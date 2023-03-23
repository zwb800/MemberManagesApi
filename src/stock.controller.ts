import {
  Body,
  Controller,
  Headers,
  Get,
  Post,
  Query,
  ParseIntPipe,
} from '@nestjs/common'
import { StockService } from './prisma/stock.service'

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('logs')
  async getLogs(@Query('id', new ParseIntPipe()) id: number) {
    return await this.stockService.getLogs(id)
  }

  @Get()
  async getAll(@Headers('shopId') shopId: string) {
    return await this.stockService.list(parseInt(shopId))
  }

  @Post()
  async updateStock(
    @Body('id', new ParseIntPipe()) id: number,
    @Body('num', new ParseIntPipe()) num: number,
  ) {
    return await this.stockService.updateStock(id, num)
  }

  @Post('add')
  async add(
    @Body('name') name: string,
    @Body('unit') unit: string,
    @Headers('shopId') shopId: string,
  ) {
    return await this.stockService.add(name, unit, parseInt(shopId))
  }
}
