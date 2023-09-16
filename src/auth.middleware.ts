import { NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

const ALLOW_IPS = process.env.ALLOW_IP
  ? process.env.ALLOW_IP.split(',')
  : ['127.0.0.1']

export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // if (ALLOW_IPS.some((v) => req.ip.includes(v))) {
    // if(req.header("shopId") == "1" || req.header("shopId") == "2" ){
      next()
    // } else {
      // Logger.error('shopId is null '+req.ip + ' not allowed')
      // res.end()
    // }
  }
}
