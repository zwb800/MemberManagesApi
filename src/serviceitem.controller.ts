import { Controller, Get } from "@nestjs/common"
import { ServiceItemService } from "./prisma/serviceitem.service"

@Controller('serviceitem')
export class ServiceItemController{
    constructor(private serviceItemService:ServiceItemService){


    }
    @Get()
    async get(){
        return await this.serviceItemService.list()
    }
}