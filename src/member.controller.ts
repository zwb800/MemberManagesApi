import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ObjectId } from 'bson'


import {connect} from './mongodb/db'
import { IMemberService } from './mongodb/member.service'



@Controller('member')
export class MemberController{

    constructor(private readonly memberService: IMemberService) {}

    @Get('get')
    async get (@Query('id')id){
        return this.memberService.get(id)
    }

    @Get()
    async all(@Query('search')keyword = '', 
    @Query('index')index=1,
    @Query('pageSize')pageSize=10){
        index = parseInt(index.toString())
        pageSize = parseInt(pageSize.toString())
        
       return this.memberService.all(keyword,index,pageSize)
    }

    @Get('charge-list')
    async getChargeList(@Query('memberId')memberId){
        return this.memberService.getChargeList(memberId)
    }

    @Post('charge')
    async charge(
        @Body('memberId') memberId,
        @Body('amount')amount,
        @Body('card')card,
        @Body('employees')employees){
        // memberId = ObjectId.createFromHexString(memberId)
        // card = card?ObjectId.createFromHexString(card._id):card
        this.memberService.charge({_id:memberId},amount,card,employees)
        return true
    }

    @Post()
    async add (@Body('member')member,@Body('card')card,@Body('employees')employees){
        // card = card?ObjectId.createFromHexString(card._id):card
        return await this.memberService.charge(member,member.balance,card,employees)
        
    }
}