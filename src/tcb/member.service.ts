import { Database } from '@cloudbase/node-sdk';
import { Injectable } from '@nestjs/common';
import { HeadID } from 'src/constant';
import { IMemberService } from 'src/mongodb/member.service';
import { Sms } from 'src/sms';
import { connect } from './db';
@Injectable()
export class MemberService implements IMemberService {
    async exists(openid: string) {
        const db = await connect()
        const member = (await db.collection('Member').where({openid:openid}).get()).data
        return member.length>0
    }

    async import(mArr){
        const db = await connect()
        const _ = db.command
        const members = db.collection('Member')
        const collBalance = db.collection('Balance')

        if((await members.count()).total>0)
        {
            return
        }

        const balanceArr = new Array()

        return await db.runTransaction(async (tran)=>{
            const insertM = mArr.map(m=>{
               return {
                    no:m.no,
                    name:m.name,
                    phone:m.phone,
                    balance:m.balance,
                    consume:m.consume,
                    newCardTime:new Date(m.newCardTime)
               }
            })
            const result = await members.add(insertM)

            if(result.ids){
                const mH = mArr.filter(m=>m.head)
                const mN = mH.map(m=>m.no)

                const ms = (await members.where({no:_.in(mN)}).field({_id:true,no:true}).get()).data
                
                for (const m of ms) {
                    for (const h of mH){
                        if(h.no == m.no){
                            balanceArr.push({
                                memberId:m._id,
                                balance:h.head,
                                serviceItemId:HeadID
                            })
                        }
                    }
                }
            }

            await collBalance.add(balanceArr)
        })
    }

    async refund(id: string) {
        const db = await connect()
        const _ = db.command
        const members = db.collection('Member')
        const chargeItem = db.collection('ChargeItem')
        const collBalance = db.collection('Balance')
        const cards = db.collection('PrepaidCard')
        const c = (await chargeItem.doc(id).get()).data[0]
        const m = (await members.doc(c.memberId).get()).data[0]
        const balances = await (await collBalance.where({memberId:m._id}).get()).data
        let result = ''
        try{
            await db.runTransaction(async (transaction)=>{
                if(c.amount>0){
    
                    m.balance -= c.amount
                }

                if(c.pay == 0)//赠送退回
                {
                    if(c.serviceItems){
                        await c.serviceItems.forEach(async s => {
                            const b = balances.find(b=>b.serviceItemId == s.serviceItemId)

                            if(b)
                            {
                                await transaction.collection('Balance').doc(b._id).update({
                                    balance:_.inc(s.count*-1)
                                })
                            }
                        });
                    }
                }
    
                if(c.itemId){//充卡退回
                    const card = (await cards.doc(c.itemId).get()).data[0]
    
                    if(card.gift){//储值卡退回
                        m.balance -= (card.price+card.gift)
                    }
    
                    if(card.serviceItemIds){
                        await card.serviceItemIds.forEach(async s => {
                            const b = balances.find(b=>b.serviceItemId == s.serviceItemId)
                    
                            if(b)
                            {
                                await transaction.collection('Balance').doc(b._id).update({
                                    balance:_.inc(s.count*-1)
                                })
                            }
                        });
                    }
                }
    
                if(m.balance<0){
                    result = "撤销后余额不足"
                    await transaction.rollback("撤销后余额不足")
                }
    
                await transaction.collection('Member').doc(c.memberId).update({
                    balance:m.balance
                })
    
                await transaction.collection('ChargeItem').doc(id).update({refund:true})
            })
        }catch(e){
            console.error(e)
        }

        return result
    }

  async getAllChargeList(startDate: Date, endDate: Date,showGift:boolean,showPayOnce:boolean,shopId:string) {
    const db = connect()
    const chargeItem = db.collection('ChargeItem')
    const cards = await db.collection('PrepaidCard')
    const arrCards = await (await cards.get()).data
    const _ = db.command

    const filter = 
    {
        time:_.lte(endDate).gte(startDate),
        refund:_.neq(true),
        shopId:shopId
    }
        if(showGift){

        }else{
            filter['pay'] = _.gt(0)
        }
        if(showPayOnce){}
        else{
            filter['itemId'] = _.neq(null)
        }
    const arr = (await chargeItem.where(filter).orderBy("time","desc").get()).data

        const arrServiceItems = (await db.collection('ServiceItem').get()).data

        const result = new Array()
        for (const v of arr) {
            const member = (await db.collection('Member')
            .doc(v.memberId).field({name:1}).get()).data[0]
            if(member){
                let card 
                if(v.itemId){
                    card = arrCards.find(ac=>ac._id == v.itemId)
                }

                result.push( {
                    _id : v._id.toString(),
                    member:member.name,
                    card:card?card.label:null,
                    price:v.price,
                    time:v.time,
                    balance:v.balance,
                    pay:v.pay,
                    amount:v.amount,
                    serviceItems:v.serviceItems,
                    employees:v.employees
                })
                
               
            }
            
        }

        return result
  }
  async getChargeList(memberId) {
    const db = connect()
    const chargeItem = db.collection('ChargeItem')
    const cards = await db.collection('PrepaidCard')
    const _ = db.command
    const arrCards = await (await cards.get()).data
    const citems = await (await chargeItem
        .where({memberId:memberId,refund:_.neq(true)})
        .orderBy("time","desc").get()).data

    const arrServiceItems = (await db.collection('ServiceItem').get()).data
    return citems.map(c=>{
        let card 
        if(c.itemId)
          card = arrCards.find(ac=>ac._id == c.itemId)

        let product = null
        if(c.serviceItems){
            product = c.serviceItems.map(s=>{
            const si = arrServiceItems.find(asi=>asi._id == s.serviceItemId)
            return {
                name:si.name,
                count:s.count
            }})
        }
        return {
            time:c.time,
            balance:c.balance,
            pay:c.pay,
            amount:c.amount,
            card:card?card.label:null,
            product
        }
    })
  }
  async get(id: string) {
      const db = connect()
    const members = db.collection('Member')
    const balances = db.collection('Balance')
    const serviceItems = db.collection('ServiceItem')
    
    const m = (await members.doc(id).get()).data[0]
    const _ = db.command
    const arrBalances = await (await balances
        .where({memberId:m._id}).field({serviceItemId:true,balance:true}).get()).data
    const sItems = await (await serviceItems.where(
        {_id:_.in(arrBalances.map(p=>p.serviceItemId))
    }).get()).data

    const arrB = arrBalances.map(p=>{
        const s = sItems.find(s=>s._id == (p.serviceItemId))
        return {
            serviceItemName:s.name,
            balance:p.balance
        }
    })
    return {
        member:m,
        balances:arrB
    }
  }

  async gift(memberId:string,arrBalances:Array<{serviceItemId:string,count:number}>,shopId:string){
    const db = await connect()
    const balances = db.collection('Balance')
    const balancesOld = await (await balances.where({ memberId:memberId }).get()).data
    const _ = db.command

    await db.runTransaction(async(tran)=>{
        for (const b of arrBalances) {
            if(balancesOld.some(bo=>bo.serviceItemId ==b.serviceItemId))
            {
                await tran.collection("Balance").where({
                    memberId:memberId,
                    serviceItemId:b.serviceItemId
                    }).update({
                        balance:_.inc(b.count)
                    })
            }
            else
            {
                await tran.collection("Balance").add({
                    memberId:memberId,
                    balance:b.count,
                    serviceItemId:b.serviceItemId
                })
            }
        }

        //插入充值记录
        await tran.collection("ChargeItem").add({
            memberId:memberId,
            pay:0,//实际支付
            amount:0,//单付
            time:new Date(),
            serviceItems:arrBalances,
            shopId:shopId
        })
    })

    return true
  }

  async charge(member: any, amount: any, card: any, employees: any,shopId:string) {
    employees = employees.map(it=>it._id)
    const db = await connect()
    
    const cards = db.collection('PrepaidCard')
    const _ = db.command

    let prepayCard = null
    if(card)
        prepayCard = (await cards.doc(card._id).get()).data[0]

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
    return await db.runTransaction(async(tran)=>{
        let balancesOld = Array()
        
        if(member._id && member._id!="")
        {
            balancesOld = await (await tran.collection("Balance").where({memberId:member._id}).get()).data
            //更新余额
            const result = await tran.collection("Member").where({_id:member._id}).updateAndReturn(
                {balance:_.inc(balance)})
            accountBalance = result.doc.balance
        }
        else //新顾客
        {
            delete member._id
            member.no = await this.getNo(db)
            member.balance = balance
            member.newCardTime = new Date()
            member.shopId = shopId
            const r = await tran.collection("Member").add(member)
            member._id = r.id
            
            accountBalance = balance
            //新顾客送头疗1个

            // if(arrBalances.some(a=>a.serviceItemId == HeadID))
            // {
            //     for (const a of arrBalances) {
            //         if(a.serviceItemId == HeadID)
            //         a.balance += 1
            //     }
            // }
            // else
            // {
            //     arrBalances.push({
            //         memberId:member._id,
            //         balance:1,
            //         serviceItemId:HeadID
            //     })
            // }
        }
        
        //插入次卡余额
        for (const b of arrBalances) {
            if(balancesOld.some(bo=>bo.serviceItemId ==b.serviceItemId))
            {
                const updateResult = await tran.collection("Balance").where({memberId:member._id,serviceItemId:b.serviceItemId}).updateAndReturn(
                    {balance:_.inc(b.balance)})
            }
            else
            {
                await tran.collection("Balance").add(Object.assign(b,{memberId:member._id}))
            }
        }

        if(prepayCard || pay>0){
            //插入充值记录
            await tran.collection("ChargeItem").add({
                memberId:member._id,
                employees,
                balance:accountBalance,//充完余额
                pay:pay,//实际支付
                amount,//单付
                itemId:prepayCard?prepayCard._id:null,
                time:new Date(),
                shopId:shopId
            })

            const m = await (await tran.collection("Member").where({_id:member._id}).get()).data[0]

            if(balance){
                Sms.chargeSms(
                    m.phone,
                    m.no.toString().substring(2),
                    balance,
                    accountBalance)
            }
            else if(arrBalances.length){
                const headB = arrBalances.find(b=>b.serviceItemId == HeadID)
                if(headB){
                    const oldB = await (await (tran.collection("Balance").where({memberId:member._id,serviceItemId:HeadID}).field({balance:1}).get())).data[0]
                    Sms.chargeCounterCard(m.phone, m.no.toString().substring(2),headB.balance,oldB.balance)
                }
          
            }
        }

        return true
    })
  }

  async getNo(db: Database.Db): Promise<number> {
    let no = 80000
    const members = db.collection('Member')
    const maxNo = await (await members.field({no:true})
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
