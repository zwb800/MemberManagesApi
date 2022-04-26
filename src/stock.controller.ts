import { Body, Controller,Headers, Get, Post, Query } from "@nestjs/common";
import { get } from "./mongodb/db";
import { IStockService } from "./tcb/stock.service";


@Controller('stock')
export class StockController {
    constructor(private readonly stockService:IStockService) {
        
    }

    @Get('logs')
    async getLogs(@Query('id') id:string){
        return await this.stockService.getLogs(id)
    }

    @Get()
    async getAll(@Headers('shopId') shopId:string){
        return await get('Stock',shopId)
    }

    @Post()
    async updateStock(@Body('id') id:string,@Body('num') num:number){
        return await this.stockService.updateStock(id,num)
    }

    @Post('add')
    async add(@Body('name') name:string,@Body('unit') unit:string,@Headers('shopId') shopId:string){
        return await this.stockService.add(name,unit,shopId)
    }
}