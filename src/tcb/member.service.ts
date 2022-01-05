import { Injectable } from '@nestjs/common';
import { IMemberService } from 'src/mongodb/member.service';
import { connect } from './db';
@Injectable()
export class MemberService implements IMemberService {
  charge(memberId: any, amount: any, card: any, employees: any) {
    throw new Error('Method not implemented.');
  }
  async all(keyword:string,index:number,pageSize:number) {
    const db = connect()
    const members = db.collection('Member')
    const _ = db.command

    let query =  {}
    if(keyword){
      query =  _.or(
        {name:db.RegExp({regexp:keyword ,options:'i'})},
        {phone:db.RegExp({regexp:keyword ,options:'i'})}
      )
    }

    const arr = members.where(query).orderBy("newCardTime","desc").skip((index-1) * pageSize).limit(pageSize).get()
    return (await arr).data
  }
}
