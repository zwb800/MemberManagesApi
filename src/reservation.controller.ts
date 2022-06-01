import { Body, Controller, Get, Post, Query,Headers } from "@nestjs/common";
import { get } from "./mongodb/db";
import axios from "axios"
import { IReservationService } from "./mongodb/reservation.service";
import { IMemberService } from "./mongodb/member.service";
const WX_HOST = 'https://api.weixin.qq.com'
@Controller('reservation')
export class ReservationController{
    constructor(private readonly reservationService: IReservationService,private readonly memberService: IMemberService) {}

    @Get()
    async get(){
        return await get('ReservationAvailable')
    }

    @Get('getByOpenID')
    async getByOpenID(@Query('openid') openid){
        return await this.reservationService.getByOpenID(openid)
    }

    @Get('list')
    async list(@Headers('shopId') shopId){
        return await this.reservationService.list(shopId)
    }

    @Get('all')
    async all(@Query('shopId') shopId){
        return await this.reservationService.list(shopId)
    }


    @Get('code2OpenID')
    async code2OpenID(@Query('code') code){
        const result = await axios.get(WX_HOST+'/sns/jscode2session',{
            params:{
                appid:process.env.WECHAT_APP_ID,
                secret:process.env.WECHAT_SECRET,
                js_code:code,
                grant_type:'authorization_code'
            }
        })
        return result.data.openid
    }

    async getAccessToken(){
        const result = await axios.get(WX_HOST+'/cgi-bin/token',{
            params:{
                appid:process.env.WECHAT_APP_ID,
                secret:process.env.WECHAT_SECRET,
                grant_type:'client_credential',
            }
        })
        return result.data.access_token
    }

    @Get('code2Phone')
    async code2Phone(@Query('openid') openid,@Query('code') code){
        const access_token = await this.getAccessToken()
        const result = await axios.post(WX_HOST+'/wxa/business/getuserphonenumber?access_token='+access_token,{
                code,
        })
        const phone = result.data.phone_info.purePhoneNumber
        const r = await this.reservationService.updateOpenId(openid,phone)
        if(!r){
            await this.memberService.charge({name:'新顾客',phone,openid},0,null,[],'1')
        }
        return true
    }

    @Post('add')
    async add(@Body('openid') openid,@Body('time') time:Date,@Body('num') num,@Body('shopId') shopId:string){
        return await this.reservationService.add(openid,new Date(time),num,shopId)
    }

    @Post('cancel')
    async cancel(@Body('openid') openid){
        return await this.reservationService.cancel(openid)
    }

    @Post('cancelById')
    async cancelById(@Body('id') id){
        return await this.reservationService.cancelById(id)
    }
}