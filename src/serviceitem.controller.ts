import { Controller, Get } from "@nestjs/common";
import { get } from "./mongodb/db";

@Controller('serviceitem')
export class ServiceItemController{
    @Get()
    async get(){
        return await get('ServiceItem')
    }
}