import { Controller, Get } from "@nestjs/common";
import { PrepaidCardService } from "./prisma/prepaidcard.service";

@Controller('prepaidcard')
export class PrepaidCardController{
    constructor(private prepaidCardService:PrepaidCardService){}

    @Get()
    async get(){
        return await this.prepaidCardService.list()
    }
}
