import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const connect = ()=>{
  return prisma
}

export const get = async(name,includeDeleted = false,shopId)=>{
  const db = connect()
  const coll =  db[name]
  let query = null
  if(shopId)
  {
    query = coll.where({shopId})
  }
  else{
    query = coll
  }
  if(!includeDeleted){
    // query = query.where({deleted:_.neq(true)})
  }

  return (await query.get()).data
}