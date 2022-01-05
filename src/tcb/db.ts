import { init } from '@cloudbase/node-sdk'
const app = init({
  env: "cloud-member-manages-1bz97b438b3",
  secretId:"AKIDvf8KGwLTKuCDxQcW9VaNvCDxQcXBYdS0",
  secretKey:"II2VhcHfndCUUDgsnQmshEUTBcmeGdkZ",

});

export const connect = ()=>{
  return app.database();
}

export const get = async(name)=>{
  return (await connect().collection(name).get()).data
}