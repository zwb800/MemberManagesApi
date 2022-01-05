import { Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";
import { IConsumeService } from "src/mongodb/consume.service";
import { connect } from "./db";



@Injectable()
export class ConsumeService implements IConsumeService{
    consume(memberId: ObjectId, serviceItems: any, employees: any) {
        throw new Error("Method not implemented.");
    }
    cancel(id: ObjectId) {
        throw new Error("Method not implemented.");
    }
    getConsumeList(memberId: any) {
        throw new Error("Method not implemented.");
    }
    getAllConsumeList(startDate: Date, endDate: Date) {
        throw new Error("Method not implemented.");
    }

    
}