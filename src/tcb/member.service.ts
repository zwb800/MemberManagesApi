import { Database } from '@cloudbase/node-sdk';
import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { HeadID } from 'src/constant';
import { IMemberService } from 'src/mongodb/member.service';
import { connect } from './db';
@Injectable()
export class MemberService implements IMemberService {
  async charge(member: any, amount: any, card: any, employees: any) {
    const db = await connect()
    const members = db.collection('Member')
    const cards = db.collection('PrepaidCard')
    const balances = db.collection('Balance')
    const chargeItem = db.collection('ChargeItem')
    const _ = db.command

    const prepayCard = (await cards.doc(card._id).get()).data[0]
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
    let accountBalance = 0
    // await db.runTransaction(async()=>{
        let balancesOld = Array()
        
        if(member._id)
        {
            balancesOld = await (await balances.where({memberId:member._id}).get()).data
            //更新余额
            const result = await members.where({_id:member._id}).updateAndReturn(
                {balance:_.inc(balance)})
            accountBalance = result.doc.balance
        }
        else
        {
            delete member._id
            member.no = await this.getNo(db)
            member.balance = balance
            member.newCardTime = new Date()
            const r = await members.add(member)
            member._id = r.id
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
                await balances.where({memberId:member._id,serviceItemId:b.serviceItemId}).update(
                    {balance:_.inc(b.balance)})
            }
            else
            {
                await balances.add(Object.assign(b,{memberId:member._id}))
            }
        }

        if(prepayCard || pay>0){
            //插入充值记录
            await chargeItem.add({
                memberId:member._id,
                employees,
                balance:accountBalance,//充完余额
                pay:pay,//实际支付
                amount,//单付
                itemId:card,
                time:new Date()
            })
        }
       
    // })
  }
  async getNo(db: Database.Db): Promise<number> {
    let no = 80000
    const members = db.collection('Member')
    const maxNo = await (await members.field("no")
    .orderBy("no","desc").limit(1).get()).data
        
        if(maxNo && maxNo.length==1)
            no = maxNo[0].no+1
        return no
  }
  async all(keyword:string,index:number,pageSize:number) {
    const db = connect()
    const members = db.collection('Member')
    const _ = db.command

    let query =  {}
    if(keyword){
      query =  _.or(
        {name:db.RegExp({regexp:keyword ,options:'i'})},
        {phone:db.RegExp({regexp:keyword ,options:'i'})}
      )
    }

    const arr = members.where(query).orderBy("newCardTime","desc").skip((index-1) * pageSize).limit(pageSize).get()
    return (await arr).data
  }
}
