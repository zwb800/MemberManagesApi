import { Controller, Get, Query,Headers } from "@nestjs/common";
import { HeadID } from "./constant";
import { get,connect } from "./mongodb/db";
import { IEmployeeService } from "./mongodb/employee.service";


@Controller('employee')
export class EmployeeController{
    constructor(private readonly employeeService:IEmployeeService){}

    @Get()
    async get(){
        return await get('Employee')
    }

    @Get('work')
    async work(@Query('startDate')startDate:Date,
    @Query('endDate')endDate:Date,@Headers('shopId')shopId:string){
        startDate = new Date(startDate)
        endDate = new Date(endDate)
        
        return this.employeeService.work(startDate,endDate,shopId)
    }

    @Get("footer")
    async footer(@Query('startDate')startDate:Date,
                 @Query('endDate')endDate:Date,
                 @Headers('shopId')shopId:string){

        startDate = new Date(startDate)
        endDate = new Date(endDate)

        return this.employeeService.footer(startDate,endDate,shopId)
    }

    @Get("statistics")
    async statistics(@Query('year') year:number,@Query('month') month:number){
        return this.employeeService.statistics(year,month)
    }


}