import { Body, Controller, Get, Post, Query,Headers, ParseBoolPipe, ParseIntPipe } from '@nestjs/common'
import { MemberService } from './prisma/member.service'





@Controller('member')
export class MemberController{

    constructor(private readonly memberService: MemberService) {}

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

    @Get('all-charge-list')
    async getAllChargeList( @Query('startDate')startDate:Date,
    @Query('showGift',ParseBoolPipe)showGift:boolean,
    @Query('showPayOnce',ParseBoolPipe)showPayOnce:boolean,
    @Query('endDate')endDate:Date,@Headers('shopId')shopId){
        startDate = new Date(startDate)
        endDate = new Date(endDate)
        return this.memberService.getAllChargeList(startDate,endDate,showGift,showPayOnce,shopId)
    }

    @Post("refund")
    async refund(@Body("id",new ParseIntPipe())id:number){
        return this.memberService.refund(id)
    }

    @Get('charge-list')
    async getChargeList(@Query('memberId')memberId){
        return this.memberService.getChargeList(memberId)
    }

    @Get('exists')
    async exists(@Query('openid') openid){
        return this.memberService.exists(openid)
    }

    @Post('charge')
    async charge(
        @Body('memberId',new ParseIntPipe()) memberId,
        @Body('amount')amount,
        @Body('card')card,
        @Body('employees')employees,
        @Headers('shopId') shopId){
        // memberId = ObjectId.createFromHexString(memberId)
        // card = card?ObjectId.createFromHexString(card._id):card
        await this.memberService.charge({id:memberId},amount,card,employees,shopId)
        return true
    }

    @Post()
    async add (@Body('member')member,@Body('card')card,@Body('employees')employees,@Headers('shopId') shopId){
        return await this.memberService.charge(member,member.balance,card,employees,shopId)
        
    }

    @Post('import')
    async import (@Body('members')members){
        return await this.memberService.import(members)
        
    }
    
    @Post('gift')
    async gift (@Body('memberId') memberId,@Body('gifts') gifts,@Headers('shopId') shopId){
        return await this.memberService.gift(memberId,gifts,shopId)
    }
}