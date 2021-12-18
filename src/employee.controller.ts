import { Controller, Get, Query } from "@nestjs/common";
import { get,connect } from "./db";

@Controller('employee')
export class EmployeeController{
    @Get()
    async get(){
        return await get('Employee')
    }

    @Get('work')
    async work(@Query('startDate')startDate:Date,
    @Query('endDate')endDate:Date){
        startDate = new Date(startDate)
        endDate = new Date(endDate)
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
                $and:[{time:{$gte:startDate}},{time:{$lte:endDate}}]
            }).toArray()

            const chargeArr = await charges.find({ 
                employees:e._id,
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
                chargeResult.push({_id:m._id.toString(),name:m.name,card:card,
                    commission:card.price / 10 / c.employees.length})
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
}