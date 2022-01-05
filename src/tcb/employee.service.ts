import { Injectable } from "@nestjs/common"
import { IEmployeeService } from "src/mongodb/employee.service"


@Injectable()
export class EmployeeService implements IEmployeeService{
    footer(startDate: Date, endDate: Date) {
        throw new Error("Method not implemented.")
    }
    work(startDate: any, endDate: any) {
        throw new Error("Method not implemented.")
    }
    
}