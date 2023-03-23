import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Headers,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common'
import { get } from './mongodb/db'
import axios from 'axios'
import { io } from 'socket.io-client'
import { ReservationService } from './prisma/reservation.service'
import { MemberService } from './prisma/member.service'
const WX_HOST = 'https://api.weixin.qq.com'
@Controller('reservation')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly memberService: MemberService,
  ) {}

  @Get()
  async get() {
    return await this.reservationService.available()
  }

  @Get('getByOpenID')
  async getByOpenID(@Query('openid') openid) {
    return await this.reservationService.getByOpenID(openid)
  }

  @Get('list')
  async list(@Headers('shopId') shopId) {
    return await this.reservationService.list(parseInt(shopId))
  }

  // @Get('all')
  // async all(@Query('shopId') shopId) {
  //   return await this.reservationService.list(parseInt(shopId))
  // }

  @Get('code2OpenID')
  async code2OpenID(@Query('code') code) {
    const result = await axios.get(WX_HOST + '/sns/jscode2session', {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code',
      },
    })
    return result.data.openid
  }

  async getAccessToken() {
    const result = await axios.get(WX_HOST + '/cgi-bin/token', {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_SECRET,
        grant_type: 'client_credential',
      },
    })
    return result.data.access_token
  }

  @Get('code2Phone')
  async code2Phone(@Query('openid') openId, @Query('code') code) {
    const access_token = await this.getAccessToken()
    const result = await axios.post(
      WX_HOST + '/wxa/business/getuserphonenumber?access_token=' + access_token,
      {
        code,
      },
    )
    const phone = result.data.phone_info.purePhoneNumber
    const r = await this.reservationService.updateOpenId(openId, phone)
    if (!r) {
      await this.memberService.charge(
        { name: '新顾客', phone, openId },
        0,
        null,
        [],
        1,
      )
    }
    return true
  }

  @Post('add')
  async add(
    @Body('openid') openid,
    @Body('time') time: Date,
    @Body('num') num,
    @Body('remark') remark,
    @Body('shopId', new ParseIntPipe()) shopId: number,
  ) {
    const result = await this.reservationService.add(
      openid,
      new Date(time),
      num,
      shopId,
      remark,
    )

    return result
  }

  @Post('cancel')
  async cancel(@Body('openid') openid) {
    return await this.reservationService.cancel(openid)
  }

  @Post('cancelById')
  async cancelById(@Body('id') id:number) {
    return await this.reservationService.cancelById(id)
  }
}
