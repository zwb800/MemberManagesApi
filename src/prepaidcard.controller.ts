import { Controller, Get } from "@nestjs/common";
import { get } from "./db";

@Controller('prepaidcard')
export class PrepaidCardController{
    @Get()
    async get(){
        return await get('PrepaidCard')
    }
}