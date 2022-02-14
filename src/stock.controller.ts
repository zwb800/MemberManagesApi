import { Body, Controller, Get, Post, Query } from "@nestjs/common";
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
    async getAll(){
        return await get('Stock')
    }

    @Post()
    async updateStock(@Body('id') id:string,@Body('num') num:number){
        return await this.stockService.updateStock(id,num)
    }

    @Post('add')
    async add(@Body('name') name:string,@Body('unit') unit:string){
        return await this.stockService.add(name,unit)
    }
}