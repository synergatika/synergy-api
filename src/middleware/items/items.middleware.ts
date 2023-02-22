import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';

/**
 * DTOs
 */
import { OfferID, PostID, EventID, CampaignID, SupportID } from '../../_dtos/index';

/**
 * Exceptions
 */
import { NotFoundException, UnprocessableEntityException } from '../../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import { LoyaltyOffer, Post, Event, MicrocreditCampaign, MicrocreditSupport, Member } from '../../_interfaces/index';

/**
 * Models
 */
import userModel from '../../models/user.model';
import transactionModel from '../../models/microcredit.transaction.model';
import postModel from '../../models/post.model';
import eventModel from '../../models/event.model';
import offerModel from '../../models/offer.model';
import microcreditModel from '../../models/campaign.model';
import supportModel from '../../models/support.model';

async function offer(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: OfferID["partner_id"] = request.params.partner_id;
  const offer_id: OfferID["offer_id"] = request.params.offer_id;

  let error: Error, offer: LoyaltyOffer;
  [error, offer] = await to(offerModel.findOne({
    "_id": new ObjectId(offer_id)
  }).catch());

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  if (!offer) {
    return next(new NotFoundException('OFFER_NOT_EXISTS'));
  }

  response.locals["offer"] = offer;
  next();
}

async function post(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: PostID["partner_id"] = request.params.partner_id;
  const post_id: PostID["post_id"] = request.params.post_id;

  let error: Error, post: Post;
  [error, post] = await to(postModel.findOne({
    "_id": new ObjectId(post_id)
  }).catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  if (!post) {
    return next(new NotFoundException('POST_NOT_EXISTS'));
  }

  response.locals["post"] = post;
  next();
}

async function event(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: EventID["partner_id"] = request.params.partner_id;
  const event_id: EventID["event_id"] = request.params.event_id;

  let error: Error, event: Event;
  [error, event] = await to(eventModel.findOne({
    "_id": new ObjectId(event_id)
  }).catch());

  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  if (!event) {
    return next(new NotFoundException('EVENT_NOT_EXISTS'));
  }

  response.locals["event"] = event;
  next();
}

async function microcreditCampaign(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: CampaignID["partner_id"] = request.params.partner_id;
  const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

  let error: Error, campaign: MicrocreditCampaign;
  [error, campaign] = await to(microcreditModel.findOne({
    "_id": new ObjectId(campaign_id)
  }).catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  if (!campaign) {
    return next(new NotFoundException('CAMPAIGN_NOT_EXISTS'));
  }

  response.locals["campaign"] = campaign;
  next();
}

async function microcreditSupport(request: RequestWithUser, response: Response, next: NextFunction) {
  const partner_id: SupportID["partner_id"] = request.params.partner_id;
  const campaign_id: SupportID["campaign_id"] = request.params.campaign_id;
  const support_id: SupportID["support_id"] = request.params.support_id;

  let error: Error, support: MicrocreditSupport;
  [error, support] = await to(supportModel.findOne({
    "_id": new ObjectId(support_id)
  }).populate([{
    "path": 'member'
  }]).catch());
  if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

  response.locals["support"] = support//{ ...supports[0], support_id: supports[0]._id, _id: undefined };
  request.params["_to"] = (support.member as Member)._id.toString();

  next();
}

export default {
  offerMiddleware: offer,
  postMiddleware: post,
  eventMiddleware: event,
  microcreditCampaign: microcreditCampaign,
  microcreditSupport: microcreditSupport,
  // microcreditSupportsPayments: microcreditSupportsPayments
}
