import { Database } from "@cloudbase/node-sdk";
import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { IConsumeService } from "src/mongodb/consume.service";
import { connect } from "./db";



@Injectable()
export class ConsumeService implements IConsumeService{
    async consume(memberId: string, serviceItems: any, employees: any) {
        const db = await connect()
        const members = db.collection('Member')
        const m = await (await members.doc(memberId).get()).data[0]
        const consumes = db.collection('Consumes')
        const collBalance = db.collection('Balance')
        const _ = db.command
        const balances = await (await collBalance.where({memberId:m._id}).get()).data

        const serviceItemsCollection = db.collection('ServiceItem')
        const sids = serviceItems.map(s=>s.serviceItemId)
        const sItems = await (await serviceItemsCollection
            .where({_id:_.in(sids)}).get()).data
        let priceSum = 0

        let result = null
        await db.runTransaction(async(transaction)=>{
            for(const s of serviceItems){
                let acount = 0
                let decount = 0
                const ba = balances.find(b=>b.serviceItemId == s.serviceItemId)
                if(ba && ba.balance)//如果还有次数 先划次 否则划余额
                {
                    if(ba.balance >= s.count)//次数足够
                        decount = s.count
                    else //次数不足
                        return await transaction.rollback("insufficient balance")
    
                    
                    if(decount>0)
                        await collBalance.doc(ba._id).update({balance:_.inc(decount*-1)})
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
                await transaction.rollback("insufficient balance")
            }
            else
            {
                await members.doc(m._id).update({
                    balance:_.inc(priceSum*-1),
                    consume:_.inc(priceSum)
                })
    
                result = await consumes.add({
                    memberId:m._id,
                    serviceItems:serviceItems.map((e)=>{
                        return {
                            serviceItemId:e.serviceItemId,
                            count:e.count
                        }
                    }),
                    price:priceSum,
                    employees:employees.map((e)=>{
                        return { 
                            employeeId:e.employeeId,
                            items:e.items
                        }
                    }),
                    time:new Date()
                })
            }
        })
        
        return result
    }
    cancel(id: ObjectId) {
        throw new Error("Method not implemented.");
    }
    async getConsumeList(memberId: any) {
        const db = connect()
        const consumes = db.collection('Consumes')
       
        const arr = (await consumes.where(
            {memberId:memberId})
            .orderBy("time","desc").get()).data
 
        const result = await this.toConsumeList(db,arr)
        return result
    }
    getAllConsumeList(startDate: Date, endDate: Date) {
        throw new Error("Method not implemented.");
    }

    async toConsumeList(db:Database.Db,arr){
        const arrServiceItems = (await db.collection('ServiceItem').get()).data
        const result = new Array()
        for (const v of arr) {
            const member = (await db.collection('Member')
            .doc(v.memberId).field({name:1}).get()).data[0]
            result.push( {
                _id : v._id.toString(),
                member:member.name,
                product:v.serviceItems.map(s=>{
                    
                    const si = arrServiceItems.find(asi=>asi._id ==s.serviceItemId)
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