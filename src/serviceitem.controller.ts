import { Controller, Get } from "@nestjs/common";
import { get } from "./db";

@Controller('serviceitem')
export class ServiceItemController{
    @Get()
    async get(){
        return await get('ServiceItem')
    }
}