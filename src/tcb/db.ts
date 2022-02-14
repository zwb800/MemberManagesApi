import { init } from '@cloudbase/node-sdk'
import { env } from 'src/utils';
const app = init({
  env: "cloud-member-manages-1bz97b438b3",
  secretId:env.secretId,
  secretKey:env.secretKey,

});

export const connect = ()=>{
  return app.database();
}

export const get = async(name)=>{
  return (await connect().collection(name).get()).data
}