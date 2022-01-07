import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { ObjectId } from 'bson'
import { IConsumeService } from './mongodb/consume.service'

@Controller('consume')
export class ConsumeController {
    constructor(private readonly consumeService:IConsumeService){}
    @Post()
    async consume(
        @Body('memberId') memberId:string,
        @Body('serviceItems') serviceItems,
        @Body('employees')employees){
        
        return this.consumeService.consume(memberId,serviceItems,employees)
    }

    @Post("cancel")
    async cancel(@Body("id")id:ObjectId){
        this.consumeService.cancel(new ObjectId(id))
    }

    @Get()
    async getConsumeList(@Query("memberId") memberId){
        return this.consumeService.getConsumeList(memberId)
    }

    @Get("getAllConsumeList")
    async getAllConsumeList(
        @Query('startDate')startDate:Date,
        @Query('endDate')endDate:Date){
        startDate = new Date(startDate)
        endDate = new Date(endDate)
        return this.getAllConsumeList(startDate,endDate)
    }
}