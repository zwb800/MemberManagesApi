import { MongoClient } from 'mongodb'
import { get as TcbGet } from '../tcb/db'
import { DbType, dbType } from '../utils';


export const connect = async()=>{
    const mongoClient = new MongoClient('mongodb://localhost:27017')
    await mongoClient.connect()
    return mongoClient
}

export const get = async(name)=>{
    if(dbType == DbType.TencentCouldBase)
    {
        return TcbGet(name)
    }
    else
    {
        const mongoClient = await connect()
        const db = mongoClient.db('MemberManages')
        const arr = await db.collection(name).find().toArray()
        await mongoClient.close()
        return arr
    }
   
}
