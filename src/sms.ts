import {sms} from 'tencentcloud-sdk-nodejs'
import { dateStr, dateTimeStr, env } from './utils'


export const Sms = {
    client:null,
    init:()=>{
        // 导入对应产品模块的client models。
        const smsClient = sms.v20210111.Client
            
        const client = new smsClient({
        credential: {
            secretId: env.secretId,
            secretKey: env.secretKey,
        },
        region: "ap-nanjing",
        profile: {
            httpProfile: {
            endpoint: "sms.tencentcloudapi.com"
            },
        },
        })
        Sms.client = client
    },
    send:(phones:string[],templateId:string,templateParams:string[])=>{
        const params = {
          SmsSdkAppId: "1400631814",
          SignName: "怀来头部码头",
          PhoneNumberSet: phones,
          TemplateId:templateId,
          TemplateParamSet: templateParams,
        }
    
        Sms.client.SendSms(params, function (err, response) {
          if (err) {
            console.log(err)
            return
          }
          console.log(response)
        })
    },
    consumeSms:(phone:string,memberNo:string,costPrice:number,balance:number)=>{
        const timeStr = dateTimeStr(new Date())
        Sms.send([phone],'1303413',[memberNo,timeStr,costPrice.toString(),balance.toString()])
    }
}

Sms.init()