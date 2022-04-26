import { Injectable } from '@nestjs/common';
import { format } from 'date-fns'

@Injectable()
export class AppService {
  getHello(): string {
    return format(new Date(),'MM月dd日 HH:mm');
  }
}
