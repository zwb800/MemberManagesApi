import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { IReservationService } from 'src/mongodb/reservation.service';
import { connect } from './db';


@Injectable()
export class ReservationService implements IReservationService {
    async cancelById(id: string) {
        const db = await connect()
            return (await db.collection('Reservation').doc(id).update({deleted:true}))
        
    }
    async list(shopId:string) {
        const db = await connect()
        const _ = db.command
        const today = new Date(format(new Date(),'yyyy-MM-dd'))
        const reservations =  (await db.collection('Reservation').where({shopId,time:_.gte(today),deleted:_.eq(null)}).orderBy('time','asc').get()).data
        const result = []
        for (const r of reservations) {
            const member = (await db.collection('Member')
            .doc(r.memberId).field({name:1,phone:1,}).get()).data[0]
            if(member){
                result.push( {
                    _id : r._id.toString(),
                    member,
                    time:r.time,
                    num:r.num
                })
            }
           
        }
        return result
    }
    async updateOpenId(openid: string, phone: string) {
        const db = await connect()
        const member = (await db.collection('Member').where({phone}).get()).data
        if(member.length>0){
            await db.collection('Member').where({phone}).update({openid})
            return true
        }
        return false
    }
    async add(openid: string, time: Date, num: number,shopId:string) {
        const db = await connect()
        const member = (await db.collection('Member').where({openid:openid}).get()).data
        if(member.length>0){
            return await db.collection('Reservation').add({time,num,memberId:member[0]._id,shopId})
        }
       
    }
    async getByOpenID(openid?: string) {
        const db = await connect()
        const _ = db.command
        const today = new Date(format(new Date(),'yyyy-MM-dd'))
        const member = (await db.collection('Member').where({openid:openid}).get()).data
        if(member.length>0){
            const reservations =  (await db.collection('Reservation').where({time:_.gte(today),memberId:member[0]._id,deleted:_.eq(null)}).get()).data
            return reservations
        }
        return []
    }

    async cancel (openid:string){
        const db = await connect()
        const _ = db.command
        const today = new Date(format(new Date(),'yyyy-MM-dd'))
        const member = (await db.collection('Member').where({openid:openid}).get()).data
        if(member.length>0){
            return (await db.collection('Reservation').where({time:_.gte(today),memberId:member[0]._id,deleted:_.eq(null)}).update({deleted:true}))
        }
    }
    
}
