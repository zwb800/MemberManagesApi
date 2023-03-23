import { Injectable } from "@nestjs/common";
import { connect } from "./db";


export abstract class IStockService{
    abstract getLogs(id: string)
    abstract add(name: string, unit: string,shopId:string)
    abstract updateStock(id:string,num:number)
}

@Injectable()
export class StockService implements IStockService {

    async getLogs(id:string){
        const db = connect()
        return (await db.collection('StockLog')
        .where({stockId:id})
        .orderBy("time","desc")
        .get()).data
    }

    async add(name: string, unit: string,shopId:string) {
        const db = connect()
        const stocks = db.collection('Stock')
        const _ = db.command
        const exists = (await (await stocks.where({shopId,name:_.eq(name)}).count()).total)>0
        if(exists)
            return '商品已存在'

        return await stocks.add({
            name,
            unit,
            shopId,
            count:0,
        })
    }

    async updateStock(id:string,num:number) {
        const db = connect()
        const stocks = db.collection('Stock')
        const _ = db.command

        const stockLog = db.collection('StockLog')

        return db.runTransaction(async ()=>{
            stockLog.add({
                stockId:id,
                count:num,
                time:new Date(),
            })

            return await stocks.doc(id).update({count:_.inc(num)})
        })
    }
   
    
}