import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PushGateway } from './push.gateway';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService,private readonly pushGateway:PushGateway) {}

  @Get()
  async getHello() {
    this.pushGateway.push({})
    return this.appService.getHello()
  }
  
}
