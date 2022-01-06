import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ObjectId } from 'bson'


import {connect} from './mongodb/db'
import { IMemberService } from './mongodb/member.service'



@Controller('member')
export class MemberController{

    constructor(private readonly memberService: IMemberService) {}

    @Get('get')
    async get (@Query('id')id){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const members = db.collection('Member')
        const balances = db.collection('Balance')
        const serviceItems = db.collection('ServiceItem')
        
        const m = await members.findOne({_id:ObjectId.createFromHexString(id)}) 

        const arrBalances = await balances.find({memberId:m._id}).toArray()
        const sItems = await serviceItems.find({_id:{$in:arrBalances.map(p=>p.serviceItemId)}}).toArray()

        const arrB = arrBalances.map(p=>{
            const s = sItems.find(s=>s._id.equals(p.serviceItemId))
            return {
                serviceItemName:s.name,
                balance:p.balance
            }
        })
        await mongoClient.close()
        return {
            member:m,
            balances:arrB
        }
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
        memberId = ObjectId.createFromHexString(memberId)
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const chargeItem = db.collection('ChargeItem')
        const cards = await db.collection('PrepaidCard')

        const arrCards = await cards.find().toArray()
        const citems = await chargeItem.find({memberId:memberId},{sort:{time:-1}}).toArray()
        return citems.map(c=>{
            let card 
            if(c.itemId)
              card = arrCards.find(ac=>ac._id.toString() == c.itemId.toString())
            return {
                time:c.time,
                balance:c.balance,
                pay:c.pay,
                amount:c.amount,
                card:card?card.label:null,
            }
        })
    }

    @Post('charge')
    async charge(
        @Body('memberId') memberId,
        @Body('amount')amount,
        @Body('card')card,
        @Body('employees')employees){
        // memberId = ObjectId.createFromHexString(memberId)
        // card = card?ObjectId.createFromHexString(card._id):card
        employees = employees.map(it=>ObjectId.createFromHexString(it._id))

        this.memberService.charge({_id:memberId},amount,card,employees)
        return true
    }

    @Post()
    async add (@Body('member')member,@Body('card')card,@Body('employees')employees){
        // card = card?ObjectId.createFromHexString(card._id):card
        employees = employees.map(it=>ObjectId.createFromHexString(it._id))

        this.memberService.charge(member,member.balance,card,employees)
        return true
        
    }
}