import { Injectable } from "@nestjs/common"
import { HeadID } from "src/constant"
import { IEmployeeService } from "src/mongodb/employee.service"
import { connect } from "./db"


@Injectable()
export class EmployeeService implements IEmployeeService{
    async footer(startDate: Date, endDate: Date) {
        const db = connect()
        const _ = db.command
        let sumNew = (await db.collection('Member')
        .where({newCardTime:_.lte(endDate).gte(startDate)})
        .count()).total
        const consumes = (await db.collection('Consumes').where(
            {time:_.lte(endDate).gte(startDate)
        }).get()).data

        const sItems = await (await db.collection('ServiceItem').get()).data
        const cardCount = (await db.collection('ChargeItem')
        .where({itemId:_.neq(null),time:_.lte(endDate).gte(startDate)}).count()).total
        
        let sum = 0

        const items = sItems.map(s=>{
            let count = 0
            if(s._id == HeadID){
                //计算只做了头疗的数量
                consumes.forEach(c=>{
                    c.employees.forEach(e=>{
                        if(e.items.length==1 && e.items.some(i=>i == s._id))
                            count++
                    })
                })

                 //计算做了头疗的数量
                 consumes.forEach(c=>{
                    c.employees.forEach(e=>{
                        if(e.items.some(i=>i ==s._id))
                            sum++
                    })
                })
            }
            else{
                //计算做了指定项目的数量
                consumes.forEach(c=>{
                    c.employees.forEach(e=>{
                        if(e.items.some(i=>i ==s._id))
                            count++
                    })
                })
            }
            
            return {
                count:count,
                label:s.shortName
            }
        })

        let sale = 0
        if(consumes.length>0){
            sale = consumes.map(c=>c.price).reduce((t,n)=>t+n)
        } 

        return {
            sum,
            new:sumNew,
            items,
            sale,
            cardCount
        }
    }

    async work(startDate: any, endDate: any) {
        const db = connect()
        const _ = db.command
        const employees = await (await db.collection('Employee').get()).data
        
        const prepaidCard = (await db.collection('PrepaidCard').get()).data
        const serviceItems = (await db.collection('ServiceItem')
        .field({_id:true,shortName:true}).get()).data

        const arrMemberId = new Array<string>()
        const consumes = (await db.collection('Consumes').where({
            time:_.lte(endDate).gte(startDate),
            refund:_.neq(true)
        }).get()).data

        consumes.map(c=>c.memberId).forEach(c=>arrMemberId.push(c))

        const charges = (await db.collection('ChargeItem').where({ 
            itemId:_.neq(null),//过滤单充没办卡
            time:_.lte(endDate).gte(startDate)}).get()).data

        charges.map(c=>c.memberId).forEach(c=>{
            if(!arrMemberId.includes(c))
                arrMemberId.push(c)
        })

        const members = (await db.collection('Member')
        .where({_id:_.in(arrMemberId)})
        .field({_id:1,name:1}).get()).data
        
        const result = Array()
        for(const e of employees){
            //消费记录
            const cArr = consumes.filter(c=>c.employees.some(es=>es.employeeId == e._id))
            
            const consumers = Array()
            for (const c of cArr) {
                const m = members.find(m=>m._id == c.memberId)
                const items = Array()
                const itemIds = c.employees.find(v=>v.employeeId == e._id).items
                
                for (const i of itemIds) {
                    const s = await serviceItems.find(v=>v._id == i)
                    items.push(s.shortName)
                }
                
                consumers.push({
                    _id:m._id,
                    name:m.name,
                    items:items
                })
            }

            //充值记录
            const chargeArr = charges.filter(c=>c.employees.includes(e._id))
            const chargeResult = Array()
            for(const c of chargeArr){
                const m = members.find(m=>m._id == c.memberId)
                const card = prepaidCard.find(p=>p._id == c.itemId)
                chargeResult.push({
                    _id:m._id,
                    name:m.name,
                    card:card,
                    commission:card.price?(card.price / 10 / c.employees.length):0
                })
            }
           
            result.push({
                employee:e.name,
                consumers:consumers,
                charges:chargeResult
            })
        }

        return result
    }
    
}