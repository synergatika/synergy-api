import { NextFunction, Response } from 'express';
import * as bcrypt from 'bcrypt';

/**
 * DTOs
 */
import RedeemOfferDto from '../../loyaltyDtos/redeemOffer.dto';
import EarnTokensDto from 'microcreditDtos/earnTokens.dto';

/**
 * Exceptions
 */
import NotFoundException from '../../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import Partner from '../../usersInterfaces/partner.interface';
import Offer from '../../loyaltyInterfaces/offer.interface';
import Campaign from '../../microcreditInterfaces/campaign.interface';
import Support from '../../microcreditInterfaces/support.interface';
import Tokens from '../../microcreditInterfaces/tokens.interface';

/**
 * Models
 */
import userModel from '../../models/user.model';

class CheckMiddleware {

  static canRedeemPoints = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const balance = response.locals.balance;
    const data: RedeemOfferDto = request.body;

    if (data._points > parseInt(balance.points, 10)) {
      return next(new NotFoundException('NOT_ENOUGH_POINTS'));
    }
    next();
  }

  static canRedeemOffer = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const offer: Offer = response.locals.offer;
    const balance = response.locals.balance;
    const data: RedeemOfferDto = request.body;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if (offer.expiresAt < seconds) {
      return next(new NotFoundException('OFFER_EXPIRED'));
    }
    if ((offer.cost * data.quantity) > parseInt(balance.points, 10)) {
      return next(new NotFoundException('NOT_ENOUGH_POINTS'));
    }
    next();
  }

  static canPublishMicrocredit = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const campaign: Campaign = response.locals.campaign;
    const partner: Partner = response.locals.partner;

    if (!partner.payments || !partner.payments.length) {
      return next(new NotFoundException('PAYMENT_METHODS_REQUIRED'));
    }
    if (campaign.status !== 'draft') {
      return next(new NotFoundException('CAMPAIGN_PUBLISHED'));
    }
    next();
  }

  static canEditMicrocredit = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const campaign: Campaign = response.locals.campaign;

    if (campaign.status !== 'draft') {
      return next(new NotFoundException('CAMPAIGN_PUBLISHED'));
    }
    next();
  }


  static canEarnMicrocredit = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const campaign: Campaign = response.locals.campaign;
    const partner: Partner = response.locals.partner;
    const backerTokens: Tokens = response.locals.backerTokens;
    const data: EarnTokensDto = request.body;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    if (campaign.status === 'draft') {
      return next(new NotFoundException('CAMPAIGN_NOT_PUBLISHED')); //"Campaign's has not been published yet",
    }
    if (((parseInt(backerTokens.initialTokens) + data._amount) > campaign.maxAmount) && (campaign.maxAmount > 0)) {
      return next(new NotFoundException('OVER_TOTAL_MAX'));
    }
    if (campaign.startsAt > seconds) {
      return next(new NotFoundException('CAMPAIGN_NOT_STARTED')); //"Campaign's supporting period has not yet started",
    }
    if (campaign.expiresAt < seconds) {
      return next(new NotFoundException('CAMPAIGN_EXPIRED')); //"Campaign's supporting period has expired",
    }
    if ((campaign.maxAllowed < data._amount) && (campaign.maxAllowed > 0)) {
      return next(new NotFoundException('OVER_MAX_AMOUNT')); //"Support Fund cannot be more than max allowed amount",
    }
    if (campaign.minAllowed > data._amount) {
      return next(new NotFoundException('UNDER_MIN_AMOUNT')); //"Support Fund cannot be less than min allowed amount",
    }
    if (data._amount <= 0) {
      return next(new NotFoundException('ZERO_AMOUNT')); //"Support Fund cannot be 0",
    }
    if ((partner) && (data.method !== 'store') &&
      ((partner.payments).filter(function (el) {
        return el.bic == data.method
      }).length == 0)) {
      //  !(Object.values(JSON.parse(JSON.stringify(partner.payments)))[(Object.keys(JSON.parse(JSON.stringify(partner.payments))).indexOf(data.method))])) {
      return next(new NotFoundException('METHOD_INAVAILABLE')); //"Payment method is not available",
    }
    next();
  }

  static canConfirmRevertPayment = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if (campaign.status === 'draft') {
      return next(new NotFoundException('CAMPAIGN_NOT_PUBLISHED')); //"Campaign's has not been published yet",
    }
    if (campaign.startsAt > seconds) {
      return next(new NotFoundException('CAMPAIGN_NOT_STARTED')); //"Campaign's supporting period has not yet started",
    }
    if ((support.status === 'confirmation') && (support.redeemedTokens > 0)) {
      return next(new NotFoundException('TOKENS_REDEEMED')); //"User has already redeem some tokens",
    }
    if ((support.status === 'confirmation') && (campaign.redeemStarts < seconds)) {
      return next(new NotFoundException('CAMPAIGN_REDEEM_STARTED')); //"Campaign's redeeming has started",
    }
    if (campaign.redeemEnds < seconds) {
      return next(new NotFoundException('CAMPAIGN_REDEEM_ENDED')); //"Campaign's redeeming period has expired",
    }
    next();
  }

  static canRedeemMicrocredit = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const campaign: Campaign = response.locals.campaign;
    const support: Support = response.locals.support;
    const _tokens = Math.round(request.body._tokens);

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if (campaign.status === 'draft') {
      return next(new NotFoundException('CAMPAIGN_NOT_PUBLISHED')); //"Campaign's has not been published yet",
    }
    if (campaign.redeemStarts > seconds) {
      return next(new NotFoundException('CAMPAIGN_REDEEM_NOT_STARTED')); //"Campaign's redeeming period has not yet started",
    }
    if (campaign.redeemEnds < seconds) {
      return next(new NotFoundException('CAMPAIGN_REDEEM_ENDED')); //"Campaign's redeeming period has expired",
    }
    if (support.status === 'order') {
      return next(new NotFoundException('SUPPORT_NOT_PAID'));  // "User has not paid for the support",
    }
    if (support.initialTokens < ((support.redeemedTokens) + _tokens)) {
      return next(new NotFoundException('NOT_ENOUGH_TOKENS'));  //"User has not enough tokens to redeem",
    }
    next();
  }
}
export default CheckMiddleware;
