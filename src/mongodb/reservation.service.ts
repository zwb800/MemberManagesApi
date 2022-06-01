import { Injectable } from '@nestjs/common';


export abstract class IReservationService{
    abstract cancelById(id: string)
    abstract list(shopId:string)
    abstract updateOpenId(openid: string, phone: string)
    abstract cancel(openid: string)
    abstract getByOpenID(openid?: string)
    abstract add(openid:string,time:Date,num:number,shopId:string)
}

@Injectable()
export class ReservationService implements IReservationService {
    cancelById(id: string) {
        throw new Error('Method not implemented.');
    }
    list() {
        throw new Error('Method not implemented.');
    }
    updateOpenId(openid: string, phone: string) {
        throw new Error('Method not implemented.');
    }
    cancel(openid: string) {
        throw new Error('Method not implemented.');
    }
    add(openid: string, time: Date, num: number) {
        throw new Error('Method not implemented.');
    }
    getByOpenID(openid?: string) {
        throw new Error('Method not implemented.');
    }
    
}
