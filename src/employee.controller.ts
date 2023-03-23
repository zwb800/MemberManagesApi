import { Controller, Get, Query,Headers } from "@nestjs/common";
import { EmployeeService } from "./prisma/employee.service";


@Controller('employee')
export class EmployeeController{
    constructor(private readonly employeeService:EmployeeService){}

    @Get()
    async get(){
        return await this.employeeService.list()
    }

    @Get('work')
    async work(@Query('startDate')startDate:Date,
    @Query('endDate')endDate:Date,@Headers('shopId')shopId:string){
        startDate = new Date(startDate)
        endDate = new Date(endDate)
        
        return this.employeeService.work(startDate,endDate,parseInt(shopId))
    }

    @Get("footer")
    async footer(@Query('startDate')startDate:Date,
                 @Query('endDate')endDate:Date,
                 @Headers('shopId')shopId:string){

        startDate = new Date(startDate)
        endDate = new Date(endDate)

        return this.employeeService.footer(startDate,endDate,parseInt(shopId))
    }

    @Get("statistics")
    async statistics(@Query('year') year:number,@Query('month') month:number){
        return this.employeeService.statistics(year,month)
    }


}