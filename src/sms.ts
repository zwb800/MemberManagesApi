import {sms} from 'tencentcloud-sdk-nodejs'
import { format } from 'date-fns'
import { zhCN} from 'date-fns/locale'

export const Sms = {
    client:null,
    init:()=>{

        const smsClient = sms.v20210111.Client
            
        const client = new smsClient({
          credential: {
              secretId: process.env.SECRET_ID,
              secretKey: process.env.SECRET_KEY,
          },
          region: "ap-nanjing",
          profile:{},
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
        
        if((!phones.some(p=>p=='15311508135')) && process.env.SERVERLESS){
          console.log('begin send sms')
          Sms.client.SendSms(params, function (err, response) {
            if (err) {
              console.log(err)
            }
            console.log(response)
          })
        }
        else
        {
          console.log(templateParams.toString()+'->'+ phones.toString())
        }
        
    },
    consumeSms:(phone:string,memberNo:string,costPrice:number,balance:number)=>{
        Sms.send([phone],'1303413',[memberNo,Sms.timeStr(),costPrice.toString(),balance.toString()])
    },
    consumeCounterCard:(phone:string,memberNo:string,costCount:number,balanceCount:number)=>{
      Sms.send([phone],'1307434',[memberNo,Sms.timeStr(),`[基础头疗:数量${costCount},剩余${balanceCount}]`])
    },
    chargeSms:(phone:string,memberNo:string,chargePrice:number,balance:number)=>{
      Sms.send([phone],'1307461',[memberNo,Sms.timeStr(),chargePrice.toString(),balance.toString()])
    },
    chargeCounterCard:(phone:string,memberNo:string,chargeCount:number,balanceCount:number)=>{
      Sms.send([phone],'1307463',[memberNo,Sms.timeStr(),`[基础头疗:续次${chargeCount},剩余${balanceCount}]`])
    },
    timeStr:()=>{
      const date = new Date()
      const timeStr = format(date,'MM月dd日 HH:mm',{locale:zhCN})
      return timeStr
    }
}

Sms.init()