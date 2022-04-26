import { init } from '@cloudbase/node-sdk'
const app = init({
  env: "cloud-member-manages-1bz97b438b3",
  secretId:process.env.SECRET_ID,
  secretKey:process.env.SECRET_KEY,
});

export const connect = ()=>{
  return app.database();
}

export const get = async(name,shopId)=>{
  const coll =  connect().collection(name)
  let query = null
  if(shopId)
  {
    query = coll.where({shopId})
  }
  else{
    query = coll
  }

  return (await query.get()).data
}