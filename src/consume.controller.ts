import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common'
import { ObjectId } from 'bson'
import { IConsumeService } from './mongodb/consume.service'

@Controller('consume')
export class ConsumeController {
    constructor(private readonly consumeService:IConsumeService){}
    @Post()
    async consume(
        @Body('memberId') memberId:string,
        @Body('serviceItems') serviceItems,
        @Body('employees')employees,
        @Headers('shopId') shopId:string){
        
        return this.consumeService.consume(memberId,serviceItems,employees,shopId)
    }

    @Post("refund")
    async refund(@Body("id")id:string){
        return this.consumeService.refund(id)
    }

    @Get()
    async getConsumeList(@Query("memberId") memberId,@Query("start",ParseIntPipe) start:number,@Query("count",ParseIntPipe) count:number){
        return this.consumeService.getConsumeList(memberId,start,count)
    }

    @Get("list_count")
    async getConsumeListCount(@Query("memberId") memberId){
        return this.consumeService.getConsumeListCount(memberId)
    }

    @Get("getAllConsumeList")
    async getAllConsumeList(
        @Query('startDate')startDate:Date,
        @Query('endDate')endDate:Date,@Headers('shopId')shopId){
        startDate = new Date(startDate)
        endDate = new Date(endDate)
        return this.consumeService.getAllConsumeList(startDate,endDate,shopId)
    }
}