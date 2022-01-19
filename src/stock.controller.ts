import { Controller, Get } from "@nestjs/common";


@Controller('stock')
export class StockController {
    constructor(private readonly stockService) {
        
    }

    @Get()
    async getAll(){

    }
}