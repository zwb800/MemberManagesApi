import { Injectable } from '@nestjs/common';
import { connect } from './db';
import { HeadID } from '../constant'
import { ObjectId } from 'mongodb';


export abstract class IMemberService{
    abstract get(id:string)
    abstract all(keyword:string,index:number,pageSize:number)
    abstract charge(memberId,amount,card,employees)
    abstract getChargeList(memberId)
}

@Injectable()
export class MemberService implements IMemberService {
    async get(id:string){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const members = db.collection('Member')
        const balances = db.collection('Balance')
        const serviceItems = db.collection('ServiceItem')
        
        const m = await members.findOne({_id:new ObjectId(id)}) 

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

    async getChargeList(memberId){
        memberId = new ObjectId(memberId)
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const chargeItem = db.collection('ChargeItem')
        const cards = await db.collection('PrepaidCard')

        const arrCards = await cards.find().toArray()
        const citems = await chargeItem.find({memberId:memberId},{sort:{time:-1}}).toArray()
        return citems.map(c=>{
            let card 
            if(c.itemId)
              card = arrCards.find(ac=>ac._id.equals(c.itemId))
            return {
                time:c.time,
                balance:c.balance,
                pay:c.pay,
                amount:c.amount,
                card:card?card.label:null,
            }
        })
    }

  async all(keyword:string,index:number,pageSize:number) {
    const mongoClient = await connect()
    const db = mongoClient.db('MemberManages')
    const members = db.collection('Member')
    
    const cursor = members.find({
        $or:[
            {name:{$regex:keyword}},
            {phone:{$regex:keyword}}
        ]},{
        sort:{newCardTime:-1}
    }).skip((index-1) * pageSize).limit(pageSize)
    const arr = await cursor.toArray()
    await mongoClient.close()
    return arr
  }

async getNo(db){
let no = 80000
const members = db.collection('Member')
const maxNo = await members.findOne({},{
    sort:{
        no:-1
    },
    projection:{
        no:1
    }})
    
    if(maxNo)
        no = maxNo.no+1
    return no
}



async charge(member,amount,card,employees){
    employees = employees.map(it=>new ObjectId(it._id))
    card = new ObjectId(card._id)
    const mongoClient = await connect()
    const db = mongoClient.db('MemberManages')
    const members = db.collection('Member')
    const cards = db.collection('PrepaidCard')
    const balances = db.collection('Balance')
    const chargeItem = db.collection('ChargeItem')

    const prepayCard = await cards.findOne({ _id:card })
    let balance = amount
    let pay = amount
    let arrBalances = Array()

    if(prepayCard){
        pay += prepayCard.price
        if(prepayCard.gift){
            balance += (prepayCard.price+prepayCard.gift)
        }
        if(prepayCard.serviceItemIds){
             arrBalances = prepayCard.serviceItemIds.map(p=>{
                 return {
                    serviceItemId:p.serviceItemId,
                    balance:p.count
                }
            })
        }
    }
    
    const session = mongoClient.startSession()
    let accountBalance = 0
    await session.withTransaction(async()=>{
        let balancesOld = Array()
        
        if(member._id)
        {
            member._id = new ObjectId(member._id)
            balancesOld = await balances.find({memberId:member._id}).toArray()
            //更新余额
            const result = await members.findOneAndUpdate({_id:member._id},
                {$inc:{balance:balance}},{session})
            accountBalance = result.value.balance
        }
        else
        {
            member.no = await this.getNo(db)
            member.balance = balance
            member.newCardTime = new Date()
            const r = await members.insertOne(member,{session})
            member._id = r.insertedId
            accountBalance = balance
            //新顾客送头疗1个
            arrBalances.push({
                memberId:member._id,
                balance:1,
                serviceItemId:HeadID
            })
        }
        
        //插入次卡余额
        for (const b of arrBalances) {
            if(balancesOld.some(bo=>bo.serviceItemId.equals(b.serviceItemId)))
            {
                await balances.updateOne({memberId:member._id,serviceItemId:b.serviceItemId},
                    {$inc:{balance:b.balance}})
            }
            else
            {
                await balances.insertOne(Object.assign(b,{memberId:member._id}),{session})
            }
        }

        if(prepayCard || pay>0){
            //插入充值记录
            await chargeItem.insertOne({
                memberId:member._id,
                employees,
                balance:accountBalance,//充完余额
                pay:pay,//实际支付
                amount,//单付
                itemId:card,
                time:new Date()
            },{session})
        }
       
    })

    await session.endSession()
    await mongoClient.close()
}
}
