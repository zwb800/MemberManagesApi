import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { connect } from "./db";

export abstract class IConsumeService{
    abstract consume(memberId:string,serviceItems,employees)
    abstract cancel(id:ObjectId)
    abstract getConsumeList(memberId)
    abstract getAllConsumeList(
        startDate:Date,
        endDate:Date)

}

@Injectable()
export class ConsumeService implements IConsumeService{

    async consume(
        memberId:string,
        serviceItems,
        employees){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const members = db.collection('Member')
        const m = await members.findOne({_id:new ObjectId(memberId)}) 
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
                            serviceItemId:new ObjectId(e.serviceItemId),
                            count:e.count
                        }
                    }),
                    price:priceSum,
                    employees:employees.map((e)=>{
                        return { 
                            employeeId:new ObjectId(e.employeeId),
                            items:e.items.map(i=>new ObjectId(i))
                        }
                    }),
                    time:new Date()
                },{session})
            }
        })
        
        await session.endSession()
        await mongoClient.close()
        return result
    }

    async cancel(id:ObjectId){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        await mongoClient.close()
    }

    async getConsumeList(memberId:ObjectId){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const consumes = db.collection('Consumes')
       
        const arr = await consumes.find(
            {memberId:memberId},
            {sort:{time:-1}}) .toArray()
 
        const result = await this.toConsumeList(db,arr)
        await mongoClient.close()
        return result
    }

    async getAllConsumeList(
        startDate:Date,
        endDate:Date){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const consumes = db.collection('Consumes')
        const arr = await consumes.find(
            {time:{$lte:endDate,$gte:startDate}},
            {sort:{time:-1}}) .toArray()
 
        const result = await this.toConsumeList(db,arr)
        await mongoClient.close()
        return result
    }

    async toConsumeList(db,arr){
        const serviceItems = db.collection('ServiceItem')
        const cursorItems = await serviceItems.find()
        const arrServiceItems = await cursorItems.toArray()
        const members = db.collection('Member')
        const result = new Array()
        for (const v of arr) {
            const member = await members.findOne({_id:v.memberId},{projection:{name:1}})
            result.push( {
                _id : v._id.toString(),
                member:member.name,
                product:v.serviceItems.map(s=>{
                    
                    const si = arrServiceItems.find(asi=>asi._id.equals(s.serviceItemId))
                    return {
                        name:si.name,
                        count:s.count
                    }}),
                price:v.price,
                time:v.time
            })
        }

        return result
    }
}