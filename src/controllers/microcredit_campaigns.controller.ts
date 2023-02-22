import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
// import path from 'path';
import { Parser } from 'json2csv';

/**
 * Blockchain Service
 */
// import { BlockchainService } from '../services/blockchain.service';
// const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

import BlockchainRegistrationService from '../utils/blockchain.util';
const registrationService = new BlockchainRegistrationService();

/**
 * Environment Variables
 */
import 'dotenv/config';
import validateEnv from '../utils/validateEnv';
validateEnv();

/**
 * DTOs
 */
import { PartnerID, CampaignID, CampaignDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, MicrocreditCampaign, MicrocreditStatistics, Partner, TransactionStatus, MicrocreditTransactionType, ItemAccess, UserAccess, MicrocreditCampaignStatus, MicrocreditTransaction, MicrocreditSupport, Member, MicrocreditSupportStatus, ExportedMicrocreditStatistics } from '../_interfaces/index';

/**
 * Middleware
 */
// import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
// import oneClickMiddleware from '../middleware/auth/one-click.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import usersMiddleware from '../middleware/items/users.middleware';
import itemsMiddleware from '../middleware/items/items.middleware';
import checkMiddleware from '../middleware/items/check.middleware';
import convertHelper from '../middleware/items/convert.helper';
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import OffsetHelper from '../middleware/items/offset.helper';
import blockchainStatus from '../middleware/items/status.middleware';

/**
 * Helper's Instance
 */
// const uploadFile = FilesMiddleware.uploadFile;
const uploadFile = FilesMiddleware.uploadFile;
// const existFile = FilesMiddleware.existsFile;
// const deleteFile = FilesMiddleware.deleteFile;
// const deleteSync = FilesMiddleware.deleteSync;
const createSlug = SlugHelper.microcreditSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import campaignModel from '../models/campaign.model';
import supportModel from '../models/support.model';

/**
 * Files Util
 */
import FilesUtil from '../utils/files.util';
const filesUtil = new FilesUtil();

/**
 * Transactions Util
 */
import MicrocreditTransactionUtil from '../utils/microcredit.transactions';
const transactionsUtil = new MicrocreditTransactionUtil();

class MicrocreditCampaignsController implements Controller {
  public path = '/microcredit/campaigns';
  public router = express.Router();

  private campaignHours: number[] = [5, 20];

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`,
      this.readCampaigns);

    this.router.get(`${this.path}/private/:offset`,
      authMiddleware,
      this.readCampaigns);

    this.router.post(`${this.path}/`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      uploadFile('static', 'microcredit').single('imageURL'),
      validationBodyAndFileMiddleware(CampaignDto),
      this.createCampaign);

    this.router.get(`${this.path}/public/:partner_id/:offset`,
      validationParamsMiddleware(PartnerID),
      this.readCampaignsByStore);

    this.router.get(`${this.path}/private/:partner_id/:offset`,
      authMiddleware,
      validationParamsMiddleware(PartnerID),
      this.readCampaignsByStore);

    this.router.get(`${this.path}/:partner_id/:campaign_id`,
      validationParamsMiddleware(CampaignID),
      this.readCampaign);

    this.router.put(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      uploadFile('static', 'microcredit').single('imageURL'),
      validationBodyAndFileMiddleware(CampaignDto),
      itemsMiddleware.microcreditCampaign,
      checkMiddleware.canEditMicrocredit,
      this.updateCampaign);

    this.router.put(`${this.path}/:partner_id/:campaign_id/publish`, blockchainStatus,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      usersMiddleware.partner,
      itemsMiddleware.microcreditCampaign,
      checkMiddleware.canPublishMicrocredit,
      this.publishCampaign);

    this.router.delete(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      itemsMiddleware.microcreditCampaign,
      checkMiddleware.canEditMicrocredit,
      this.deleteCampaign);

    this.router.get(`${this.path}/:partner_id/:campaign_id/statistics/:date`,
      validationParamsMiddleware(CampaignID),
      itemsMiddleware.microcreditCampaign,
      this.readCampaignStatistics);

    this.router.get(`${this.path}/:partner_id/:campaign_id/statistics/:date/:type/export`,
      validationParamsMiddleware(CampaignID),
      itemsMiddleware.microcreditCampaign,
      this.exportStatistics);

    this.router.post(`${this.path}/image`,
      authMiddleware,
      uploadFile('content', 'microcredit').array('content_image', 8),
      this.uploadContentImages);
  }

  /** 
   * 
   * Secondary Functions 
   * 
   */

  private dateConvert = (x: string | number | Date) => {
    var today = new Date(x);
    var year = today.getFullYear();
    var month = `0${today.getMonth() + 1}`.slice(0, 2);
    var day = `0${today.getDate()}`.slice(0, 2);
    return `${year}-${month}-${day}`;
  }

  private checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }

  private isError = (err: unknown): err is Error => err instanceof Error;

  private setUniqueUsers(transactions: MicrocreditTransaction[]): string[] {
    return [...new Set(transactions.map(item =>
      ((item.support as MicrocreditSupport).member as Member).email
      ||
      ((item.support as MicrocreditSupport).member as Member).card
    ))];
  }

  private setUniqueTransactions(transactions: MicrocreditTransaction[]): (string | ObjectId)[] {
    return [...new Set(transactions.map(item =>
      `${(item.support as MicrocreditSupport).contractIndex}_${(item.support as MicrocreditSupport).contractRef}`
      ||
      (item.support as MicrocreditSupport)._id
    ))];
  }


  /**
   * 
   * Main Functions (Route: `/microcredit/campaigns`)
   * 
   */

  private uploadContentImages = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    response.status(200).send({
      data: {
        files: request.files,
        path: `${process.env.API_URL}assets/content/`
      },
      success: true
    });
  }

  private readCampaigns = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access == UserAccess.PARTNER) access_filter.push(ItemAccess.PARTNERS);
    /** ***** */

    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(campaignModel.aggregate([
      {
        "$match": {
          "$and": [
            { "access": { "$in": access_filter } },
            { "expiresAt": { "$gt": offset.greater } },
            { "published": { "$eq": true } }
          ]
        },
      },
      {
        "$lookup": {
          "from": 'Partner',
          "localField": 'partner',
          "foreignField": '_id',
          "as": 'partner'
        }
      },
      {
        "$match": { 'partner.activated': true }
      }])
      .sort({ "updatedAt": -1 })
      .exec()
      .catch());
    // let error: Error, campaigns: MicrocreditCampaign[];
    // [error, campaigns] = await to(campaignModel.find(
    //   {
    //     "$and": [
    //       { "access": { "$in": access_filter } },
    //       { "expiresAt": { "$gt": offset.greater } },
    //       { "published": { "$eq": true } }
    //     ]
    //   }
    // ).populate([{
    //   "path": 'partner'
    // }])
    //   .lean()
    //   .sort({ updatedAt: -1 })
    //   .limit(offset.limit)
    //   .skip(offset.skip)
    //   .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: campaigns,
      code: 200
    });
  }

  private createCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CampaignDto = request.body;
    const user: User = request.user;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(campaignModel.create({
      ...data,
      "partner": user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
      "redeemStarts": convertHelper.roundDate(data.redeemStarts, this.campaignHours[0]),
      "redeemEnds": convertHelper.roundDate(data.redeemEnds, this.campaignHours[1]),
      "startsAt": convertHelper.roundDate(data.startsAt, this.campaignHours[0]),
      "expiresAt": convertHelper.roundDate(data.expiresAt, this.campaignHours[1]),
      "status": MicrocreditCampaignStatus.DRAFT,
      "registered": TransactionStatus.PENDING,
      "address": '',
      "transactionHash": ''
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    // const currentCampaign = results.microcredit[results["microcredit"].length - 1];
    const currentCampaign = results//.microcredit[results["microcredit"].length - 1];

    if (request.params && request.params.token) {
      response.locals["campaign"] = currentCampaign;
      response.locals.campaign._id = currentCampaign._id;
      next();
    } else {
      response.status(201).send({
        data: currentCampaign, //message: "Success! A new Microcredit Campaign has been created! (Campaign ID: " + currentCampaign._id + ")",
        code: 201
      });
    }
  }

  private publishCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const campaign: MicrocreditCampaign = response.locals.campaign;

    let blockchain_error: Error, blockchain_result: any;
    [blockchain_error, blockchain_result] = await to(registrationService.registerMicrocreditCampaign(user, campaign));
    if (this.isError(blockchain_result) || blockchain_error) blockchain_result = null;

    let error: Error, updated_campaign: MicrocreditCampaign;
    [error, updated_campaign] = await to(campaignModel.findOneAndUpdate({
      "_id": campaign._id
    }, {
      "$set": {
        "status": MicrocreditCampaignStatus.PUBLISHED, // published
        "address": blockchain_result?.address,
        "transactionHash": blockchain_result?.transactionHash,
        "registered": (!blockchain_result) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Microcredit Campaign with ID: " + campaign._id + " has been published!",
      code: 200
    });
  }

  private readCampaignsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    /** Parameters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);
    /** ***** * ***** */

    /** Access Filter */
    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access == UserAccess.PARTNER) access_filter.push(ItemAccess.PARTNERS);
    /** ***** * ***** */

    /** Status Filter */
    const status_filter: MicrocreditCampaignStatus[] = [MicrocreditCampaignStatus.PUBLISHED];
    if ((request.user && request.user._id == new ObjectId(partner_id)) && offset.type) status_filter.push(MicrocreditCampaignStatus.DRAFT);
    /** ***** * ***** */

    const partner_filter = ObjectId.isValid(partner_id) ? { "_id": new ObjectId(partner_id) } : { "slug": partner_id };

    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(userModel.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(campaignModel.find(
      {
        "$and": [
          { "partner": _user },
          { "access": { "$in": access_filter } },
          { "status": { "$in": status_filter } },
          { "expiresAt": { "$gt": offset.greater } },
          { "published": { "$eq": true } }
        ]
      }
    ).populate([{
      "path": 'partner'
    }]).sort({ "updatedAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: campaigns,
      code: 200
    });
  }

  private readCampaign = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    /** Params & Filters */
    const partner_filter = this.checkObjectIdValidity(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    const microcredit_filter = this.checkObjectIdValidity(campaign_id) ? { '_id': new ObjectId(campaign_id) } : { 'slug': campaign_id };
    /** ***** * ***** */

    let error: Error, campaign: MicrocreditCampaign;
    [error, campaign] = await to(campaignModel.findOne(
      microcredit_filter
    ).populate([{
      "path": 'partner'
    }])
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    let supports: MicrocreditSupport[];
    [error, supports] = await to(supportModel.aggregate(
      [{
        "$match": {
          "campaign": campaign._id
        }
      }, {
        "$project": {
          "_id": "$status",
          "status": "$status",
          "initial": "$initialTokens",
          "current": "$currentTokens",
        }
      },
      {
        "$group": {
          "_id": "$status",
          "status": "$status",
          "initialTokens": { "$sum": "$initial" },
          "currentTokens": { "$sum": "$current" },
        }
      }
      ]
    ).exec().catch());


    var total = supports?.reduce((accumulator, object) => {
      return accumulator + object.initialTokens;
    }, 0) | 0;
    var paid = supports?.filter(i => (i.status === MicrocreditSupportStatus.COMPLETED) || (i.status === MicrocreditSupportStatus.PAID)).reduce((accumulator, object) => {
      return accumulator + object.initialTokens;
    }, 0) | 0;
    var current = supports?.filter(i => (i.status === MicrocreditSupportStatus.COMPLETED) || (i.status === MicrocreditSupportStatus.PAID)).reduce((accumulator, object) => {
      return accumulator + object.currentTokens;
    }, 0) | 0;

    response.status(200).send({
      data: { ...campaign, tokens: { total, paid, current } },
      code: 200
    });
  }

  private updateCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: CampaignDto = request.body;

    const currentCampaign: MicrocreditCampaign = response.locals.campaign;
    if ((currentCampaign["imageURL"] && (currentCampaign["imageURL"]).includes('assets/static/')) && request.file) {
      await filesUtil.removeFile(currentCampaign);
    }

    if (currentCampaign.contentFiles) {
      filesUtil.removeRichEditorFiles(currentCampaign, (data.contentFiles) ? data.contentFiles.split(',') : [], true);
    }

    let error: Error, campaign: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, campaign] = await to(campaignModel.findOneAndUpdate({
      "_id": campaign_id
    }, {
      "$set": {
        ...data,
        "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentCampaign.imageURL,
        "slug": await createSlug(request),
        "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
        "redeemStarts": convertHelper.roundDate(data.redeemStarts, this.campaignHours[0]),
        "redeemEnds": convertHelper.roundDate(data.redeemEnds, this.campaignHours[1]),
        "startsAt": convertHelper.roundDate(data.startsAt, this.campaignHours[0]),
        "expiresAt": convertHelper.roundDate(data.expiresAt, this.campaignHours[1]),
      }
    }, {
      "new": true
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Microcredit Campaign with ID: " + campaign_id + " has been updated!",
      code: 200
    });
  }

  private deleteCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    const currentCampaign: MicrocreditCampaign = response.locals.campaign;
    if ((currentCampaign['imageURL']) && (currentCampaign['imageURL']).includes('assets/static/')) {
      await filesUtil.removeFile(currentCampaign);
    }

    if (currentCampaign.contentFiles) {
      filesUtil.removeRichEditorFiles(currentCampaign, currentCampaign.contentFiles, false);
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(campaignModel.findOneAndDelete({ _id: new ObjectId(campaign_id) }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Microcredit Campaign with ID: " + campaign_id + " has been deleted!",
      code: 200
    });
  }

  private readCampaignStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const campaign: MicrocreditCampaign = response.locals.campaign;
    const date = request.params['date'];
    const { page, size } = request.query;

    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(transactionsUtil.readCampaignTransactions(campaign, [MicrocreditTransactionType.PromiseFund, MicrocreditTransactionType.ReceiveFund, MicrocreditTransactionType.RevertFund, MicrocreditTransactionType.SpendFund], date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    var promise = transactions.filter(s => s.type === MicrocreditTransactionType.PromiseFund);
    var receive = transactions.filter(s => s.type === MicrocreditTransactionType.ReceiveFund);
    var revert = transactions.filter(s => s.type === MicrocreditTransactionType.RevertFund);
    var spend = transactions.filter(s => s.type === MicrocreditTransactionType.SpendFund);

    let result: MicrocreditStatistics = {
      promise: {
        tokens: promise.reduce((accumulator, object) => {
          return accumulator + object.tokens;
        }, 0),
        payoff: 0,
        uniqueUsers: this.setUniqueUsers(promise),
        uniqueSupports: this.setUniqueTransactions(promise)
      },
      receive: {
        tokens: 0,
        payoff: receive.reduce((accumulator, object) => {
          return accumulator + object.payoff;
        }, 0),
        uniqueUsers: this.setUniqueUsers(receive),
        uniqueSupports: this.setUniqueTransactions(receive)
      },
      revert: {
        tokens: 0,
        payoff: revert.reduce((accumulator, object) => {
          return accumulator + object.payoff;
        }, 0),
        uniqueUsers: this.setUniqueUsers(revert),
        uniqueSupports: this.setUniqueTransactions(revert)
      },
      spend: {
        tokens: spend.reduce((accumulator, object) => {
          return accumulator + object.tokens;
        }, 0),
        payoff: 0,
        uniqueUsers: this.setUniqueUsers(promise),
        uniqueSupports: this.setUniqueTransactions(promise)
      },
      dates: [...new Set(transactions.map(item => this.dateConvert(item.createdAt)))]
    }

    response.status(200).send({
      data: result,
      code: 200
    });
  }

  private exportStatistics = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const campaign: MicrocreditCampaign = response.locals.campaign;
    const date = request.params['date'];
    const type = request.params['type'] === 'receive' ? MicrocreditTransactionType.ReceiveFund : MicrocreditTransactionType.SpendFund;
    const { page, size } = request.query;

    let error: Error, transactions: MicrocreditTransaction[];
    [error, transactions] = await to(transactionsUtil.readCampaignTransactions(campaign, [type], date, { page: page as string, size: size as string })).catch();
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const total = transactions;

    let result: MicrocreditStatistics = {
      total: {
        tokens: 0,
        payoff: total.reduce((accumulator, object) => {
          return accumulator + object.payoff;
        }, 0),
        uniqueUsers: this.setUniqueUsers(total),
        uniqueSupports: this.setUniqueTransactions(total)
      },
      dates: [...new Set(transactions.map(item => this.dateConvert(item.createdAt)))]
    }

    const opts = {
      fields: ['date', type === MicrocreditTransactionType.ReceiveFund ? 'payoff' : 'tokens', 'user', 'transactions']
    };

    const json2csvParser = new Parser(opts);
    const csv = json2csvParser.parse([
      ...transactions.map(t => {
        return {
          date: t.createdAt,
          tokens: t.tokens,
          payoff: t.payoff,
          users: ((t.support as MicrocreditSupport).member as Member).email || ((t.support as MicrocreditSupport).member as Member).card,
          transactions: `${(t.support as MicrocreditSupport).contractIndex}_${(t.support as MicrocreditSupport).contractRef}` || (t.support as MicrocreditSupport)._id
        }
      }), {
        date: 'Total',
        tokens: result['total'].tokens,
        payoff: result['total'].payoff,
        users: result['total'].uniqueUsers.length,
        transactions: result['total'].uniqueSupports.length
      }] as ExportedMicrocreditStatistics[]);

    try {
      response.attachment(`Statistics-${campaign.title}_${(date != '0' ? date : 'total')}.csv`);
      response.status(200).send(csv)
    } catch (error) {
      return next(new UnprocessableEntityException(`EXPORT ERROR || ${error}`));
    }
  }
}

export default MicrocreditCampaignsController;