import { Database } from '@cloudbase/node-sdk'
import { Injectable } from '@nestjs/common'
import { HeadID } from 'src/constant'
import { IConsumeService } from 'src/mongodb/consume.service'
import { Sms } from 'src/sms'
import { connect } from './db'

@Injectable()
export class ConsumeService implements IConsumeService {
    async consume(memberId: string, serviceItems: any, employees: any,shopId:string) {
        const db = await connect()
        const members = db.collection('Member')
        const m = await (await members.doc(memberId).get()).data[0]
        const collBalance = db.collection('Balance')
        const _ = db.command
    const balances = await (
      await collBalance.where({ memberId: m._id }).get()
    ).data

    balances.filter(p=>p.discount).forEach(p=>{
        m.balance += p.balance
    })

    const serviceItemsCollection = db.collection('ServiceItem')
    const sids = serviceItems.map(s=>s.serviceItemId)
    const sItems = await (await serviceItemsCollection
        .where({_id:_.in(sids)}).get()).data
    let priceSum = 0

    let result = null
    try{
        await db.runTransaction(async(transaction)=>{
            for(const s of serviceItems){
                let acount = 0//划余额次数
                let decount = 0//划次卡次数
                const ba = balances.find(b=>b.serviceItemId == s.serviceItemId)
                if(ba && ba.balance)//如果还有次数 先划次 否则划余额
                {
                    if(ba.balance >= s.count)//次数足够
                        decount = s.count
                    else //次数不足
                        return await transaction.rollback("insufficient balance")
    
                    
                    if(decount>0){
                        s.counterCard = true //次卡消费
                        const b = await transaction.collection('Balance').where({_id:ba._id}).updateAndReturn({
                            balance:_.inc(decount*-1)
                        })
                        if(b.doc.serviceItemId == HeadID){
                            Sms.consumeCounterCard(m.phone,
                                m.no.toString().substring(2),
                                decount,
                                b.doc.balance)
                        }
                        
                    }
                }
                else //没有次数 全部划余额
                    acount = s.count
    
                if(acount > 0)
                {
                    s.counterCard = false //储值卡消费
                    const as = sItems.find(asi=>asi._id.toString() == s.serviceItemId)
                    const price = as.price * s.count

                    // const b = balances.find(b=> b.discount && (b.balance > (b.discount * price)))

                    
                    // if(b){
                    //     price = b.discount * 10 * price / 10
                    //     s.discount = b.discount
                    // console.log(b.discount * 10 * price / 10 + 38.4)
                    // }

                    priceSum += price
                    
                    
                }
            }
            
         
                if(priceSum>0){//扣除余额
                    const b = balances.find(b=> b.discount && (b.balance > (priceSum * b.discount)))
                    let updateResult
                    if(b){
                        priceSum = b.discount * 10 * priceSum / 10
                        const balance = parseFloat((b.balance - priceSum).toFixed(1))
                        updateResult = await transaction.collection('Balance').where({_id:b._id}).updateAndReturn({
                            balance})
                    }
                    else if((m.balance - priceSum)<0) {
                        result = '余额不足'
                        await transaction.rollback("insufficient balance")
                    }else{
                        updateResult = await transaction.collection('Member').where({_id:m._id}).updateAndReturn({
                            balance:_.inc(priceSum*-1),
                            consume:_.inc(priceSum)
                        })
                    }

                    Sms.consumeSms(m.phone,m.no.toString().substring(2),priceSum,updateResult.doc.balance)
                }
    
                await transaction.collection('Consumes').add({
                    memberId:m._id,
                    serviceItems:serviceItems.map((e)=>{
                        return {
                            serviceItemId:e.serviceItemId,
                            count:e.count,
                            counterCard:e.counterCard,
                            discount:e.discount?1:e.discount
                        }
                    }),
                    price:priceSum,
                    employees:employees.map((e)=>{
                        return { 
                            employeeId:e.employeeId,
                            items:e.items
                        }
                    }),
                    time:new Date(),
                    shopId:shopId
                })
            
        })

    }
    catch(err){
        console.error(err)
    }
        
    return result
    }

    async refund(id: string) {
        const db = await connect()
        const _ = db.command
        const members = db.collection('Member')
        const consumes = db.collection('Consumes')
        const collBalance = db.collection('Balance')
        const c = (await consumes.doc(id).get()).data[0]
        const m = (await members.doc(c.memberId).get()).data[0]
        const balances = await (await collBalance.where({memberId:m._id}).get()).data
        const result = ''
        await db.runTransaction(async (transaction)=>{
            if(c.price>0){
                await transaction.collection('Member').doc(c.memberId).update({//退回余额
                    balance:_.inc(c.price),
                    consume:_.inc(c.price*-1)
                })
            }

            for (const s of c.serviceItems.filter(s=>s.counterCard)) {
                if(s.counterCard){//次卡消费退回次数
                    const b = balances.find(b=>b.serviceItemId == s.serviceItemId)
                    
                    if(b)
                    {
                        await transaction.collection('Balance').doc(b._id).update({
                            balance:_.inc(s.count)
                        })
                    }
                }
            }

            await transaction.collection('Consumes').doc(id).update({refund:true})
        })

        return result
    }
    async getConsumeList(memberId: any,start:number,count:number) {
        const db = connect()
        const consumes = db.collection('Consumes')
        const _ = db.command
        const arr = (await consumes.where(
            {
                memberId:memberId,
                refund:_.neq(true)
            })
            .orderBy("time","desc").skip(start).limit(count).get()).data
 
        const result = await this.toConsumeList(db,arr)
        return result
    }

    async getConsumeListCount(memberId: any):Promise<number> {
        const db = connect()
        const consumes = db.collection('Consumes')
        const _ = db.command
        return  (await consumes.where(
            {
                memberId:memberId,
                refund:_.neq(true)
            })
            .count()).total
    }
    async getAllConsumeList(startDate: Date, endDate: Date,shopId:string) {
        const db = connect()
        const consumes = db.collection('Consumes')
        const _ = db.command
        const arr = (await consumes.where(
            {
                time:_.lte(endDate).gte(startDate),
                refund:_.neq(true),
                shopId:shopId
            }).orderBy("time","desc").get()).data
 
        const result = await this.toConsumeList(db,arr)
        return result
    }

    async toConsumeList(db:Database.Db,arr){
        const arrServiceItems = (await db.collection('ServiceItem').get()).data
        const result = []
        for (const v of arr) {
            const member = (await db.collection('Member')
            .doc(v.memberId).field({name:1}).get()).data[0]
            if(member){
                result.push( {
                    _id : v._id.toString(),
                    member:member.name,
                    product:v.serviceItems.map(s=>{
                        const si = arrServiceItems.find(asi=>asi._id == s.serviceItemId)
                        return {
                            name:si.name,
                            count:s.count
                        }}),
                    price:v.price,
                    time:v.time
                })
            }
           
        }

        return result
    }

    
}