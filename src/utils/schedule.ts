import * as schedule from 'node-schedule';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';

/**
 * Email Service
 */
import EmailService from '../utils/emailService';
const emailService = new EmailService();

/**
 * Interfaces
 */
import { User, MicrocreditCampaign, MicrocreditSupport } from '../_interfaces/index';

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';
import microcreditModel from '../models/campaign.model';

class Schedule {
  private user = userModel;
  private transaction = transactionModel;
  private microcreditModel = microcreditModel;

  private repeatEvery: string = '0 0 3 * * *'; // every day at 3am
  // const repeatEvery: string = '30 * * * * *'; // every minute at .30 seconds

  constructor() { }

  public campaingStarts = () => {

    schedule.scheduleJob(this.repeatEvery, async () => {

      const nowStarts = new Date();
      nowStarts.setDate(nowStarts.getDate() + 1);
      nowStarts.setHours(0); nowStarts.setMinutes(0); nowStarts.setSeconds(1); nowStarts.setMilliseconds(0);

      const nowEnds = new Date();
      nowEnds.setDate(nowEnds.getDate() + 1);
      nowEnds.setHours(23); nowEnds.setMinutes(59); nowEnds.setSeconds(59); nowEnds.setMilliseconds(0);

      const secondsStart = parseInt(nowStarts.getTime().toString());
      const secondsEnd = parseInt(nowEnds.getTime().toString());

      let error: Error, campaigns: MicrocreditCampaign[];
      [error, campaigns] = await to(this.microcreditModel.find({
        $and: [
          { 'status': 'published' },
          { 'redeemable': true },
          { 'redeemStarts': { $gt: secondsStart } },
          { 'redeemStarts': { $lt: secondsEnd } },
        ]
      })
        .populate([{
          path: 'partner'
        }])
        .sort({ updatedAt: -1 })
        .catch());
      // [error, campaigns] = await to(this.user.aggregate([{
      //   $unwind: '$microcredit'
      // }, {
      //   $match: {
      //     $and: [
      //       { 'microcredit.status': 'published' },
      //       { 'microcredit.redeemable': true },
      //       { 'microcredit.redeemStarts': { $gt: secondsStart } },
      //       { 'microcredit.redeemStarts': { $lt: secondsEnd } },
      //     ]
      //   }
      // }, {
      //   $project: {
      //     _id: false,
      //     partner_id: '$_id',
      //     partner_slug: '$slug',
      //     partner_name: '$name',
      //     partner_email: '$email',
      //     partner_imageURL: '$imageURL',

      //     partner_payments: '$payments',
      //     partner_address: '$address',
      //     partner_contacts: '$contacts',
      //     partner_phone: '$phone',

      //     campaign_id: '$microcredit._id',
      //     campaign_slug: '$microcredit.slug',
      //     campaign_imageURL: '$microcredit.imageURL',
      //     title: '$microcredit.title',
      //     subtitle: '$microcredit.subtitle',
      //     terms: '$microcredit.terms',
      //     description: '$microcredit.description',
      //     category: '$microcredit.category',
      //     access: '$microcredit.access',

      //     quantitative: '$microcredit.quantitative',
      //     stepAmount: '$microcredit.stepAmount',
      //     minAllowed: '$microcredit.minAllowed',
      //     maxAllowed: '$microcredit.maxAllowed',
      //     maxAmount: '$microcredit.maxAmount',

      //     redeemStarts: '$microcredit.redeemStarts',
      //     redeemEnds: '$microcredit.redeemEnds',
      //     startsAt: '$microcredit.startsAt',
      //     expiresAt: '$microcredit.expiresAt',

      //     createdAt: '$microcredit.createdAt',
      //     updatedAt: '$microcredit.updatedAt'
      //   }
      // }, {
      //   $sort: {
      //     updatedAt: -1
      //   }
      // }
      // ]).exec().catch());
      if (error) return;

      const supports: MicrocreditSupport[] = await this.readSupports(campaigns);
      const campaignWithSupports = campaigns.map((a: MicrocreditCampaign) =>
        Object.assign({}, a,
          {
            supports: (supports).filter((b: MicrocreditSupport) => ((b.campaign as MicrocreditCampaign)._id).toString() === (a._id).toString()),
          }
        )
      );

      campaignWithSupports.forEach(async (el) => {
        await emailService.campaignStarts(el);
      });

    });
  }

  public readSupports = async (campaigns: MicrocreditCampaign[]) => {

    let error: Error, supports: any[];
    [error, supports] = await to(this.transaction.aggregate([
      {
        $match: {
          'campaign_id': { $in: campaigns.map(a => (a._id).toString()) }
        }
      },
      { $sort: { date: 1 } },
      {
        $group:
        {
          _id: "$member_id",
          campaign_id: { '$first': "$campaign_id" },
          initialTokens: { '$first': "$tokens" },
          currentTokens: { '$sum': '$tokens' },
          method: { '$first': "$method" },
          payment_id: { '$first': "$payment_id" },
          type: { '$last': "$type" },
          createdAt: { '$first': "$createdAt" },
        }
      }
    ]).exec().catch());
    if (error) return;

    const users: User[] = await this.readUsers(supports);
    const supportsWithUsers = supports.map((a: MicrocreditSupport) =>
      Object.assign({}, a,
        {
          member_email: (users).find((b: User) => (b._id).toString() === (a._id).toString()).email,
        }
      )
    );

    return supportsWithUsers;
  }

  public readUsers = async (supports: MicrocreditSupport[]) => {
    let error: Error, users: User[];

    [error, users] = await to(this.user.find({ _id: { $in: supports.map((a: MicrocreditSupport) => (a._id)) } }).select({
      "_id": 1, "email": 1,
    }).catch());

    return users;
  }
}
export default new Schedule();
