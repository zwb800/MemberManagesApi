import { NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

const ALLOW_IPS = process.env.ALLOW_IP
  ? process.env.ALLOW_IP.split(',')
  : ['127.0.0.1']

export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (ALLOW_IPS.some((v) => req.ip.includes(v))) {
      next()
    } else {
      Logger.error(req.ip + ' not allowed')
      res.end()
    }
  }
}
