import { MongoClient } from 'mongodb'



export const connect = async()=>{
    const mongoClient = new MongoClient('mongodb://localhost:27017')
    await mongoClient.connect()
    return mongoClient
}

export const get = async(name)=>{
    const mongoClient = await connect()
    const db = mongoClient.db('MemberManages')
    const arr = await db.collection(name).find().toArray()
    await mongoClient.close()
    // arr.forEach(v=>v._id = v._id.toString())
    return arr
}
