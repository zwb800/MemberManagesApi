import { Injectable } from "@nestjs/common"
import { HeadID } from "src/constant"
import { connect } from "src/mongodb/db"

export abstract class IEmployeeService{
    abstract work(startDate,endDate)
    abstract footer(startDate:Date,
        endDate:Date)
}

@Injectable()
export class EmployeeService implements IEmployeeService{
    async work(startDate,endDate){
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const employees = await db.collection('Employee').find().toArray()
        const consumes = db.collection('Consumes')
        const members = db.collection('Member')
        const charges = db.collection('ChargeItem')
        const prepaidCard = db.collection('PrepaidCard')
        const serviceItems = await db.collection('ServiceItem').find().project({_id:1,shortName:1}).toArray()
        
        const result = Array()
        for(const e of employees){
            const cArr = await consumes.find({
                'employees.employeeId':e._id,
                time:{$gte:startDate,$lte:endDate}
            }).toArray()

            const chargeArr = await charges.find({ 
                employees:e._id,
                itemId:{$ne:null},//过滤单充没办卡
                $and:[{time:{$gte:startDate}},{time:{$lte:endDate}}]}).toArray()
            
            const consumers = Array()
            for (const c of cArr) {
                const m = await members.findOne({_id:c.memberId},{projection:{_id:1,name:1}})
                const items = Array()
                const itemIds = c.employees.find(v=>v.employeeId.equals(e._id)).items
                
                for (const i of itemIds) {
                    const s = await serviceItems.find(v=>v._id.equals(i))
                    items.push(s.shortName)
                }
                
                consumers.push({_id:m._id.toString(),name:m.name,items:items})
            }

            const chargeResult = Array()
            for(const c of chargeArr){
                const m = await members.findOne({_id:c.memberId},{projection:{_id:1,name:1}})
                const card = await prepaidCard.findOne({_id:c.itemId})
                chargeResult.push({
                    _id:m._id.toString(),
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

        await mongoClient.close()
        return result
    }

    async footer(startDate:Date,
                 endDate:Date){


        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages') 
        
        let sumNew = await db.collection('Member')
        .count({newCardTime:{$lte:endDate,$gte:startDate}})
        const consumes = await db.collection('Consumes').find(
            {time:{$lte:endDate,$gte:startDate}
        }).toArray()

        const sItems = await db.collection('ServiceItem').find().toArray()
        const cardCount = await db.collection('ChargeItem').count({itemId:{$ne:null},time:{$lte:endDate,$gte:startDate}})
        await mongoClient.close()
        
        let sum = 0

        const items = sItems.map(s=>{
            let count = 0
            if(s._id.equals(HeadID)){
                //计算只做了头疗的数量
                consumes.forEach(c=>{
                    // if(c.employees.length == 1 &&
                    //     c.employees[0].items.length==1 &&
                    //     c.employees[0].items[0].equals(s._id)){
                    //         count++
                    // }

                    c.employees.forEach(e=>{
                        if(e.items.length==1 && e.items.some(i=>i.equals(s._id)))
                            count++
                    })
                })

                 //计算做了头疗的数量
                 consumes.forEach(c=>{
                    c.employees.forEach(e=>{
                        if(e.items.some(i=>i.equals(s._id)))
                            sum++
                    })
                })
            }
            else{
                //计算做了指定项目的数量
                consumes.forEach(c=>{
                    // c.serviceItems
                    // .filter(c=>c.serviceItemId.equals(s._id))
                    // .forEach(c=>count+=c.count)
                    c.employees.forEach(e=>{
                        if(e.items.some(i=>i.equals(s._id)))
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
}