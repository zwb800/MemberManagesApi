import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { ObjectId } from 'bson'
import { Request } from 'express'
import {get,connect} from './db'

@Controller('consume')
export class ConsumeController {
    @Post()
    async consume(
        @Body('memberId') memberId:string,
        @Body('serviceItems') serviceItems,
        @Body('employees')employees){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const members = db.collection('Member')
        const m = await members.findOne({_id:ObjectId.createFromHexString(memberId)}) 
        const consumes = db.collection('Consumes')
        const collBalance = db.collection('Balance')
        const balances = await collBalance.find({memberId:m._id}).toArray()

        const serviceItemsCollection = db.collection('ServiceItem')
        const sids = serviceItems.map(s=>ObjectId.createFromHexString(s.serviceItemId))
        const sItems = await serviceItemsCollection.find({_id:{$in:sids}}).toArray()
        let priceSum = 0

        const session = mongoClient.startSession()
        let result = null
        await session.withTransaction(async()=>{
            for(const s of serviceItems){
                let acount = 0
                let decount = 0
                const ba = balances.find(b=>b.serviceItemId.toString() == s.serviceItemId)
                if(ba && ba.balance)//如果还有次数 先划次 否则划余额
                {
                    if(ba.balance >= s.count)//次数足够
                        decount = s.count
                    else //次数不足
                        return await session.abortTransaction()
                        // decount = ba.balance
    
                    // acount = s.count - decount
                    
                    if(decount>0)
                        await collBalance.updateOne({_id:ba._id},{$inc:{balance:decount*-1}},{session})
                }
                else //没有次数 全部划余额
                    acount = s.count
    
                if(acount > 0)
                {
                    const as = sItems.find(asi=>asi._id.toString() == s.serviceItemId)
                    priceSum += as.price * s.count
                }
            }
            
            if((m.balance - priceSum)<0)
            {
                await session.abortTransaction()
            }
            else
            {
                await members.updateOne({_id:m._id},{$inc:{
                    balance:priceSum*-1,
                    consume:priceSum
                }},{session})
    
                result = await consumes.insertOne({
                    memberId:m._id,
                    serviceItems:serviceItems.map((e)=>{
                        return {
                            serviceItemId:ObjectId.createFromHexString(e.serviceItemId),
                            count:e.count
                        }
                    }),
                    price:priceSum,
                    employees:employees.map((e)=>{
                        return { 
                            employeeId:ObjectId.createFromHexString(e.employeeId),
                            items:e.items.map(i=>ObjectId.createFromHexString(i))
                        }
                    }),
                    time:new Date()
                },{session})
            }
        })
        
        await session.endSession()
        await mongoClient.close()
        return true
    }
    @Get()
    async getConsumeList(@Query("memberId") memberId){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const consumes = db.collection('Consumes')
       
        const consumesCursor = await consumes.find(
            {memberId:ObjectId.createFromHexString(memberId)},
            {sort:{time:-1}}) 
        const arr = await consumesCursor.toArray()

        const serviceItems = db.collection('ServiceItem')
        const cursorItems = await serviceItems.find()
        const arrServiceItems = await cursorItems.toArray()
        
        const result = arr.map(v=>{ 
            return {
                _id : v._id.toString(),
                product:v.serviceItems.map(s=>{
                    
                    const si = arrServiceItems.find(asi=>asi._id.equals(s.serviceItemId))
                    return {
                        name:si.name,
                        count:s.count
                    }}),
                price:v.price,
                time:v.time
            }
        })
        await mongoClient.close()
        return result
    }
}