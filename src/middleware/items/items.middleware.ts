import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

/**
 * DTOs
 */
import OfferID from '../../loyaltyDtos/offer_id.params.dto';
import PostID from '../../communityDtos/post_id.params.dto';
import EventID from '../../communityDtos/event_id.params.dto';
import CampaignID from '../../microcreditDtos/campaign_id.params.dto';
import SupportID from '../../microcreditDtos/support_id.params.dto';

/**
 * Exceptions
 */
import UnprocessableEntityException from '../../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import Offer from '../../loyaltyInterfaces/offer.interface';
import Post from '../../communityInterfaces/post.interface';
import Event from '../../communityInterfaces/event.interface';
import Campaign from '../../microcreditInterfaces/campaign.interface';
import Support from '../../microcreditInterfaces/support.interface';

/**
 * Models
 */
import userModel from '../../models/user.model';
import transactionModel from '../../models/microcredit.transaction.model';

async function offer(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: OfferID["partner_id"] = request.params.partner_id;
  const offer_id: OfferID["offer_id"] = request.params.offer_id;

  let error: Error, offers: Offer[];
  [error, offers] = await to(userModel.aggregate([{
    $unwind: '$offers'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(partner_id)
      }, {
        'offers._id': new ObjectId(offer_id)
      }]
    }
  }, {
    $project: {
      _id: false,
      offer_id: '$offers._id',
      offer_imageURL: '$offers.imageURL',
      title: '$offers.title',
      cost: '$offers.cost'
    }
  }]).exec().catch());

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  else if (!offers.length) {
    return next(new NotFoundException('OFFER_NOT_EXISTS'));
  }

  response.locals["offer"] = offers[0];
  next();
}

async function post(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: PostID["partner_id"] = request.params.partner_id;
  const post_id: PostID["post_id"] = request.params.post_id;

  let error: Error, posts: Post[];
  [error, posts] = await to(userModel.aggregate([{
    $unwind: '$posts'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(partner_id)
      }, {
        'posts._id': new ObjectId(post_id)
      }]
    }
  }, {
    $project: {
      _id: false,
      post_id: '$posts._id',
      post_imageURL: '$posts.imageURL',
      title: '$posts.title',
    }
  }]).exec().catch());

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  else if (!posts.length) {
    return next(new NotFoundException('POST_NOT_EXISTS'));
  }

  response.locals["post"] = posts[0];
  next();
}

async function event(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: EventID["partner_id"] = request.params.partner_id;
  const event_id: EventID["event_id"] = request.params.event_id;

  let error: Error, events: Event[];
  [error, events] = await to(userModel.aggregate([{
    $unwind: '$events'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(partner_id)
      }, {
        'events._id': new ObjectId(event_id)
      }]
    }
  }, {
    $project: {
      _id: false,
      event_id: '$events._id',
      event_imageURL: '$events.imageURL',
      title: '$events.title',
    }
  }]).exec().catch());

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  else if (!events.length) {
    return next(new NotFoundException('EVENT_NOT_EXISTS'));
  }

  response.locals["event"] = events[0];
  next();
}

async function microcreditCampaign(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: CampaignID["partner_id"] = request.params.partner_id;
  const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

  let error: Error, campaigns: Campaign[];
  [error, campaigns] = await to(userModel.aggregate([{
    $unwind: '$microcredit'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(partner_id)
      }, {
        'microcredit._id': new ObjectId(campaign_id)
      }]
    }
  }, {
    $project: {
      _id: false,
      campaign_id: '$microcredit._id',
      campaign_imageURL: '$microcredit.imageURL',
      title: '$microcredit.title',
      address: '$microcredit.address',
      status: '$microcredit.status',

      quantitative: '$microcredit.quantitative',
      stepAmount: '$microcredit.stepAmount',
      maxAmount: '$microcredit.maxAmount',
      maxAllowed: '$microcredit.maxAllowed',
      minAllowed: '$microcredit.minAllowed',

      redeemStarts: '$microcredit.redeemStarts',
      redeemEnds: '$microcredit.redeemEnds',
      startsAt: '$microcredit.startsAt',
      expiresAt: '$microcredit.expiresAt'
    }
  }]).exec().catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  else if (!campaigns.length) {
    return next(new NotFoundException('CAMPAIGN_NOT_EXISTS'));
  }

  response.locals["campaign"] = campaigns[0];
  next();
}

async function microcreditSupport(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: SupportID["partner_id"] = request.params.partner_id;
  const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
  const support_id: SupportID["support_id"] = request.params.support_id;

  let error: Error, supports: Support[];
  [error, supports] = await to(transactionModel.aggregate(
    [
      {
        $match: {
          $and: [
            { 'partner_id': partner_id },
            // { 'campaign_id': campaign_id },
            { 'support_id': support_id }
          ]
        }
      },
      { $sort: { date: 1 } },
      {
        $group:
        {
          _id: "$support_id",

          partner_id: { '$first': "$partner_id" },
          member_id: { '$first': "$member_id" },

          campaign_id: { '$first': "$campaign_id" },
          payment_id: { '$first': "$payment_id" },
          method: { '$first': "$method" },
          status: { '$last': "$type" },

          address: { '$first': "$address" },
          contractRef: { '$first': "$contractRef" },
          contractIndex: { '$first': "$contractIndex" },

          initialTokens: { '$first': "$tokens" },
          currentTokens: { '$sum': '$tokens' },

          createdAt: { '$first': "$createdAt" },
          updatedAt: { '$last': "$createdAt" },
        }
      }
    ]
  ).exec());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["support"] = { ...supports[0], support_id: supports[0]._id, _id: undefined };
  request.params["_to"] = supports[0].member_id;

  next();
  // const partner_id: SupportID["partner_id"] = request.params.partner_id;
  // const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
  // const support_id: SupportID["support_id"] = request.params.support_id;

  // let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
  // [error, supports] = await to(userModel.aggregate([{
  //   $unwind: '$microcredit'
  // }, {
  //   $unwind: '$microcredit.supports'
  // }, {
  //   $match: {
  //     $and: [{
  //       _id: new ObjectId(partner_id)
  //     }, {
  //       'microcredit._id': new ObjectId(campaign_id)
  //     }, {
  //       'microcredit.supports._id': new ObjectId(support_id)
  //     }]
  //   }
  // }, {
  //   $project: {
  //     _id: false,
  //     campaign_id: '$microcredit._id',
  //     support_id: '$microcredit.supports._id',
  //     backer_id: '$microcredit.supports.backer_id',
  //     initialTokens: '$microcredit.supports.initialTokens',
  //     redeemedTokens: '$microcredit.supports.redeemedTokens',
  //     method: '$microcredit.supports.method',
  //     status: '$microcredit.supports.status',
  //     contractIndex: '$microcredit.supports.contractIndex',
  //   }
  // }, {
  //   $sort: {
  //     support_id: -1
  //   }
  // }
  // ]).exec().catch());
  // if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  // else if (!supports.length) {
  //   return next(new NotFoundException('SUPPORT_NOT_EXISTS'));
  // }

  // request.params["_to"] = supports[0].backer_id;
  // response.locals["support"] = supports[0];
  // next();
}

export default {
  offerMiddleware: offer,
  postMiddleware: post,
  eventMiddleware: event,
  microcreditCampaign: microcreditCampaign,
  microcreditSupport: microcreditSupport,
  // microcreditSupportsPayments: microcreditSupportsPayments
}
