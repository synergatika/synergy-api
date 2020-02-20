import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

// Dtos
import OfferID from '../loyaltyDtos/offer_id.params.dto';
import PostID from '../communityDtos/post_id.params.dto';
import EventID from '../communityDtos/event_id.params.dto';
import CampaignID from '../microcreditDtos/campaign_id.params.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Offer from '../loyaltyInterfaces/offer.interface';
import Post from '../communityInterfaces/post.interface';
import Event from '../communityInterfaces/event.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Support from '../microcreditInterfaces/support.interface';
// Models
import userModel from '../models/user.model';

async function offer(request: RequestWithUser, response: Response, next: NextFunction) {
  const merchant_id: OfferID["merchant_id"] = request.params.merchant_id;
  const offer_id: OfferID["offer_id"] = request.params.offer_id;

  let error: Error, offers: Offer[];
  [error, offers] = await to(userModel.aggregate([{
    $unwind: '$offers'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(merchant_id)
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

  if (error) next(new UnprocessableEntityException('DB ERROR'));
  else if (offers.length) {
    response.status(200).send({
      message: "offer_not_exists",
      code: 204
    })
  } else {
    response.locals = {
      offer: offers[0]
    };
    next();
  }
}

async function post(request: RequestWithUser, response: Response, next: NextFunction) {
  const merchant_id: PostID["merchant_id"] = request.params.merchant_id;
  const post_id: PostID["post_id"] = request.params.post_id;

  let error: Error, posts: Post[];
  [error, posts] = await to(userModel.aggregate([{
    $unwind: '$posts'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(merchant_id)
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

  if (error) next(new UnprocessableEntityException('DB ERROR'));
  else if (posts.length) {
    response.status(200).send({
      message: "post_not_exists",
      code: 204
    })
  } else {
    response.locals = {
      post: posts[0]
    };
    next();
  }
}

async function event(request: RequestWithUser, response: Response, next: NextFunction) {
  const merchant_id: EventID["merchant_id"] = request.params.merchant_id;
  const event_id: EventID["event_id"] = request.params.event_id;

  let error: Error, events: Event[];
  [error, events] = await to(userModel.aggregate([{
    $unwind: '$events'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(merchant_id)
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

  if (error) next(new UnprocessableEntityException('DB ERROR'));
  else if (events.length) {
    response.status(200).send({
      message: "event_not_exists",
      code: 204
    })
  } else {
    response.locals = {
      event: events[0]
    };
    next();
  }
}

async function microcreditCampaign(request: RequestWithUser, response: Response, next: NextFunction) {
  const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
  const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

  let error: Error, campaigns: Campaign[];
  [error, campaigns] = await to(userModel.aggregate([{
    $unwind: '$microcredit'
  }, {
    $match:
    {
      $and: [{
        _id: new ObjectId(merchant_id)
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

      quantitative: '$microcredit.quantitative',
      maxAmount: '$microcredit.maxAmount',
      maxAllowed: '$microcredit.maxAllowed',
      minAllowed: '$microcredit.minAllowed',

      redeemStarts: '$microcredit.redeemStarts',
      redeemEnds: '$microcredit.redeemEnds',
      startsAt: '$microcredit.startsAt',
      expiresAt: '$microcredit.expiresAt'
    }
  }]).exec().catch());

  if (error) next(new UnprocessableEntityException('DB ERROR'));
  else if (campaigns.length) {
    response.status(200).send({
      message: "campaign_not_exists",
      code: 204
    })
  } else {
    response.locals = {
      campaign: campaigns[0]
    };
    next();
  }
}

async function microcreditSupport(request: RequestWithUser, response: Response, next: NextFunction) {
  //private paymentToSupports = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
  const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
  const payment_id: string[] = request.body.payment_id;

  let payments: any = [];
  payment_id.forEach(p => {
    payments.push(new ObjectId(p));
  });

  let error: Error, supports: Support[]; // results = {"n": 1, "nModified": 1, "ok": 1}
  [error, supports] = await to(userModel.aggregate([{
    $unwind: '$microcredit'
  }, {
    $unwind: '$microcredit.supports'
  }, {
    $match: {
      $and: [{
        _id: new ObjectId(merchant_id)
      }, {
        'microcredit._id': new ObjectId(campaign_id)
      }, {
        'microcredit.supports._id': { $in: payments }
      }]
    }
  }, {
    $project: {
      _id: false,
      campaign_id: '$microcredit._id',
      support_id: '$microcredit.supports._id',
      backer_id: '$microcredit.supports.backer_id',
      initialTokens: '$microcredit.supports.initialTokens',
      redeemedTokens: '$microcredit.supports.redeemedTokens',
      method: '$microcredit.supports.method',
      status: '$microcredit.supports.status',
      contractIndex: '$microcredit.supports.contractIndex',
    }
  }, {
    $sort: {
      support_id: -1
    }
  }
  ]).exec().catch());
  if (error) next(new UnprocessableEntityException('DB ERROR'));
  else if (!supports) {
    response.status(200).send({
      message: "supports_not_exists",
      code: 204
    })
  } else {
    response.locals["supports"] = supports;
    next();
  }
}

export default {
  offerMiddleware: offer,
  postMiddleware: post,
  eventMiddleware: event,
  microcreditCampaign: microcreditCampaign,
  microcreditSupport: microcreditSupport
}
