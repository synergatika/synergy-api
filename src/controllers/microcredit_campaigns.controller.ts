import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

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
import { NotFoundException, UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, MicrocreditCampaign, MicrocreditTokens, MicrocreditStatistics, SupportStatus, Partner, TransactionStatus } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import oneClickMiddleware from '../middleware/auth/one-click.middleware';
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
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const deleteSync = FilesMiddleware.deleteSync;
const createSlug = SlugHelper.microcreditSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';
import microcreditModel from '../models/campaign.model';

class MicrocreditCampaignsController implements Controller {
  public path = '/microcredit/campaigns';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;
  private microcreditModel = microcreditModel;

  private campaignHours: number[] = [5, 20];

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/one-click/:token`, blockchainStatus,
      oneClickMiddleware, accessMiddleware.onlyAsPartner,
      uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(CampaignDto),
      this.createCampaign,
      usersMiddleware.partner,
      checkMiddleware.canPublishMicrocredit,
      this.publishCampaign);

    this.router.get(`${this.path}/public/:offset`,
      this.readCampaigns);

    this.router.get(`${this.path}/private/:offset`,
      authMiddleware,
      this.readCampaigns);

    this.router.post(`${this.path}/`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      this.declareStaticPath, uploadFile.single('imageURL'),
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
      this.declareStaticPath, uploadFile.single('imageURL'),
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

    this.router.post(`${this.path}/image`, authMiddleware, this.declareContentPath, uploadFile.array('content_image', 8), this.uploadContentImage);
  }

  private declareStaticPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'static';
    request.params['type'] = 'microcredit';
    next();
  }

  private declareContentPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'content';
    request.params['type'] = 'microcredit';
    next();
  }

  private uploadContentImage = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    response.status(200).send({
      data: {
        files: request.files,
        path: `${process.env.API_URL}assets/content/`
      },
      success: true
    });
  }

  // private escapeBlockchainError = async (_error: any, _type: string) => {
  //   await this.failedTransactionModel.create({
  //     error: _error,
  //     type: _type
  //   })
  // }

  private readCampaigns = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: string[] = ['public'];
    if (request.user) access_filter.push('private');
    if (request.user && request.user.access == 'partner') access_filter.push('partners');
    /** ***** */

    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(this.microcreditModel.find(
      {
        $and: [
          { 'activated': true },
          { 'access': { $in: access_filter } },
          { 'status': 'published' },
          { 'expiresAt': { $gt: offset.greater } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    // [error, campaigns] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'activated': true },
    //       { 'microcredit.access': { $in: access_filter } },
    //       { 'microcredit.status': 'published' },
    //       { 'microcredit.expiresAt': { $gt: offset.greater } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectMicrocredit()
    //   }
    // }, {
    //   $sort: {
    //     updatedAt: -1
    //   }
    // },
    // { $limit: offset.limit },
    // { $skip: offset.skip }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const tokens: MicrocreditTokens[] = await this.readTokens(campaigns);
    const campaignsWithStatistics = campaigns.map((a: MicrocreditCampaign) =>
      Object.assign({}, a,
        {
          tokens: (tokens).find((b: MicrocreditTokens) => (b._id).toString() === (a._id).toString()),
        }
      )
    );

    response.status(200).send({
      data: campaignsWithStatistics,
      code: 200
    });
  }

  private createCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CampaignDto = request.body;
    const user: User = request.user;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.microcreditModel.create({
      ...data,
      partner: user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
      "redeemStarts": convertHelper.roundDate(data.redeemStarts, this.campaignHours[0]),
      "redeemEnds": convertHelper.roundDate(data.redeemEnds, this.campaignHours[1]),
      "startsAt": convertHelper.roundDate(data.startsAt, this.campaignHours[0]),
      "expiresAt": convertHelper.roundDate(data.expiresAt, this.campaignHours[1]),
      "status": 'draft',
      "address": '',
      "transactionHash": ''
    }).catch());
    // [error, results] = await to(this.user.findOneAndUpdate({
    //   _id: user._id
    // }, {
    //   $push: {
    //     microcredit: {
    //       "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
    //       "title": data.title,
    //       "subtitle": data.subtitle,
    //       "slug": await createSlug(request),
    //       "terms": data.terms,
    //       "access": data.access,
    //       "description": data.description,
    //       'contentFiles': (data.contentFiles) ? data.contentFiles.split(',') : 0,
    //       "category": data.category,
    //       "quantitative": data.quantitative,
    //       "redeemable": data.redeemable,
    //       "stepAmount": data.stepAmount,
    //       "minAllowed": data.minAllowed,
    //       "maxAllowed": data.maxAllowed,
    //       "maxAmount": data.maxAmount,
    //       "redeemStarts": convertHelper.roundDate(data.redeemStarts, this.campaignHours[0]),
    //       "redeemEnds": convertHelper.roundDate(data.redeemEnds, this.campaignHours[1]),
    //       "startsAt": convertHelper.roundDate(data.startsAt, this.campaignHours[0]),
    //       "expiresAt": convertHelper.roundDate(data.expiresAt, this.campaignHours[1]),
    //       "status": 'draft',
    //       "address": '',
    //       "transactionHash": ''
    //     }
    //   }
    // }, { new: true }).catch());
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
    [blockchain_error, blockchain_result] = await to(this.registerMicrocredit(user, campaign));
    // if (_error) {
    // this.escapeBlockchainError(_error, "CreateMicrocredit");
    // return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${_error}`));
    // }

    let error: Error, updated_campaign: MicrocreditCampaign;
    [error, updated_campaign] = await to(this.microcreditModel.findOneAndUpdate({
      _id: campaign._id
    }, {
      '$set': {
        'status': 'published', // published
        'address': blockchain_result?.address,
        'transactionHash': blockchain_result?.transactionHash,
        "registered": (blockchain_error) ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Microcredit Campaign with ID: " + campaign._id + " has been published!",
      code: 200
    });
  }

  private registerMicrocredit = async (user: User, campaign: MicrocreditCampaign) => {
    const dates = {
      startsAt: (convertHelper.roundDate(campaign.startsAt, this.campaignHours[0])).toString(),
      expiresAt: (convertHelper.roundDate(campaign.expiresAt, this.campaignHours[1])).toString(),
      redeemStarts: (convertHelper.roundDate(campaign.redeemStarts, this.campaignHours[0])).toString(),
      redeemEnds: (convertHelper.roundDate(campaign.redeemEnds, this.campaignHours[1])).toString()
    };

    Object.keys(dates).forEach((key: string) => {
      if (`${process.env.PRODUCTION}` == 'true')
        (dates as any)[key] = (dates as any)[key] + "000000";
      else
        (dates as any)[key] = ((dates as any)[key]).slice(0, ((dates as any)[key]).length - 3);
    });

    return (serviceInstance.startNewMicrocredit(
      user.account.address,
      1, campaign.maxAmount, campaign.maxAmount, campaign.minAllowed,
      parseInt(dates.redeemEnds), parseInt(dates.redeemStarts), parseInt(dates.startsAt), parseInt(dates.expiresAt),
      campaign.quantitative)
    );
  }

  // private registerMicrocredit = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  //   const user: User = request.user;
  //   const currentCampaign: MicrocreditCampaign = response.locals.campaign;

  //   const dates = {
  //     startsAt: (convertHelper.roundDate(currentCampaign.startsAt, this.campaignHours[0])).toString(),
  //     expiresAt: (convertHelper.roundDate(currentCampaign.expiresAt, this.campaignHours[1])).toString(),
  //     redeemStarts: (convertHelper.roundDate(currentCampaign.redeemStarts, this.campaignHours[0])).toString(),
  //     redeemEnds: (convertHelper.roundDate(currentCampaign.redeemEnds, this.campaignHours[1])).toString()
  //   };

  //   Object.keys(dates).forEach((key: string) => {
  //     if (`${process.env.PRODUCTION}` == 'true')
  //       (dates as any)[key] = (dates as any)[key] + "000000";
  //     else
  //       (dates as any)[key] = ((dates as any)[key]).slice(0, ((dates as any)[key]).length - 3);
  //   });

  //   let error: Error, result: any;
  //   [error, result] = await to(serviceInstance.startNewMicrocredit(
  //     user.account.address,
  //     1, currentCampaign.maxAmount, currentCampaign.maxAmount, currentCampaign.minAllowed,
  //     parseInt(dates.redeemEnds), parseInt(dates.redeemStarts), parseInt(dates.startsAt), parseInt(dates.expiresAt),
  //     currentCampaign.quantitative)
  //   );
  //   if (error) {
  //     this.escapeBlockchainError(error, "CreateMicrocredit");
  //     return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
  //   }

  //   await this.microcreditModel.findOneAndUpdate({
  //     _id: currentCampaign._id
  //   }, {
  //     '$set': {
  //       'status': 'published', // published
  //       'address': result.address,
  //       'transactionHash': result.transactionHash,
  //     }
  //   });

  //   response.status(200).send({
  //     message: "Success! Microcredit Campaign with ID: " + currentCampaign._id + " has been published!",
  //     code: 200
  //   });
  //   // await serviceInstance.startNewMicrocredit(user.account.address,
  //   //   1, currentCampaign.maxAmount, currentCampaign.maxAmount, currentCampaign.minAllowed,
  //   //   parseInt(dates.redeemEnds), parseInt(dates.redeemStarts), parseInt(dates.startsAt), parseInt(dates.expiresAt),
  //   //   currentCampaign.quantitative)
  //   //   .then(async (result: any) => {

  //   //     await this.microcreditModel.findOneAndUpdate({
  //   //       _id: currentCampaign._id
  //   //     }, {
  //   //       '$set': {
  //   //         'status': 'published', // published
  //   //         'address': result.address,
  //   //         'transactionHash': result.transactionHash,
  //   //       }
  //   //     });

  //   //     // await this.user.updateOne({
  //   //     //   _id: user._id,
  //   //     //   'microcredit._id': currentCampaign._id
  //   //     // }, {
  //   //     //   '$set': {
  //   //     //     'microcredit.$.status': 'published', // published
  //   //     //     'microcredit.$.address': result.address,
  //   //     //     'microcredit.$.transactionHash': result.transactionHash,
  //   //     //   }
  //   //     // });

  //   //     response.status(200).send({
  //   //       message: "Success! Microcredit Campaign with ID: " + currentCampaign._id + " has been published!",
  //   //       code: 200
  //   //     });
  //   //   })
  //   //   .catch((error: Error) => {
  //   //     next(new UnprocessableEntityException(error.message))
  //   //   })
  // }

  private readCampaignsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: string[] = ['public'];
    if (request.user) access_filter.push('private');
    if (request.user && request.user.access == 'partner') access_filter.push('partners');

    const status_filter: string[] = ['published'];
    if ((request.user && request.user._id == partner_id) && offset.type) status_filter.push('draft');

    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };

    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(this.user.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(this.microcreditModel.find(
      {
        $and: [
          { 'partner': _user },
          { 'access': { $in: access_filter } },
          { 'status': { $in: status_filter } },
          { 'expiresAt': { $gt: offset.greater } }
        ]
      }
      // { 'partner': _user }, { 'access': { $in: access_filter } }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    // [error, campaigns] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       { 'microcredit.access': { $in: access_filter } },
    //       { 'microcredit.status': { $in: status_filter } },
    //       { 'microcredit.expiresAt': { $gt: offset.greater } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectMicrocredit()
    //   }
    // }, {
    //   $sort: {
    //     updatedAt: -1
    //   }
    // },
    // { $limit: offset.limit },
    // { $skip: offset.skip }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const tokens: MicrocreditTokens[] = await this.readTokens(campaigns);
    const campaignsWithStatistics = campaigns.map((a: MicrocreditCampaign) =>
      Object.assign({}, a,
        {
          tokens: (tokens).find((b: MicrocreditTokens) => (b._id).toString() === (a._id).toString()),
        }
      )
    );

    response.status(200).send({
      data: campaignsWithStatistics,
      code: 200
    });
  }

  checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }

  private readCampaign = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    /** Params & Filters */
    const partner_filter = this.checkObjectIdValidity(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    const microcredit_filter = this.checkObjectIdValidity(campaign_id) ? { '_id': new ObjectId(campaign_id) } : { 'slug': campaign_id };
    /** ***** * ***** */

    let error: Error, campaigns: MicrocreditCampaign[];
    [error, campaigns] = await to(this.microcreditModel.find(
      microcredit_filter
    )
      .populate([{
        path: 'partner'
      }])
      .catch());
    // [error, campaigns] = await to(this.user.aggregate([{
    //   $unwind: '$microcredit'
    // }, {
    //   $match:
    //   {
    //     $and: [
    //       partner_filter,
    //       microcredit_filter
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectMicrocredit()
    //   }
    // }]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if (!campaigns.length) {
      return next(new NotFoundException('CAMPAIGN_NOT_EXIST'));
    }

    const tokens: MicrocreditTokens[] = await this.readTokens(campaigns);
    //const orderedTokens: Tokens[] = await this.readTokens(campaigns, 'order');
    const statisticsPromise: MicrocreditStatistics[] = await this.readStatistics(campaigns, 'ReceiveFund', 'confirmed');
    const statisticsRedeem: MicrocreditStatistics[] = await this.readStatistics(campaigns, 'SpendFund', 'redeemed');

    const campaignsWithStatistics = campaigns.map((a: MicrocreditCampaign) =>
      Object.assign({}, a,
        {
          tokens: (tokens).find((b: MicrocreditTokens) => (b._id).toString() === (a._id).toString()),
          //orderedTokens: (orderedTokens).find((c: Tokens) => (c._id).toString() === (a.campaign_id).toString()),
          statistics: {
            earned: (statisticsPromise).find((e: MicrocreditStatistics) => (e._id).toString() === (a._id).toString()),
            redeemed: (statisticsRedeem).find((d: MicrocreditStatistics) => (d._id).toString() === (a._id).toString()),
          }
          // statisticsPromise: (statisticsPromise).find((e: MicrocreditCampaignStatistics) => (e._id).toString() === (a.campaign_id).toString()),
          // statisticsRedeem: (statisticsRedeem).find((d: MicrocreditCampaignStatistics) => (d._id).toString() === (a.campaign_id).toString()),
        }
      )
    );

    response.status(200).send({
      data: campaignsWithStatistics[0],
      code: 200
    });
  }

  private updateCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: CampaignDto = request.body;

    const currentCampaign: MicrocreditCampaign = response.locals.campaign;
    if ((currentCampaign['imageURL'] && (currentCampaign['imageURL']).includes('assets/static/')) && request.file) {
      await this.removeFile(currentCampaign);
    }

    if (currentCampaign.contentFiles) {
      this.removeRichEditorFiles(currentCampaign, data, true);
    }

    let error: Error, campaign: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, campaign] = await to(this.microcreditModel.findOneAndUpdate({
      _id: campaign_id
    }, {
      $set: {
        ...data,
        'imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentCampaign.imageURL,
        'slug': await createSlug(request),
        'contentFiles': (data.contentFiles) ? data.contentFiles.split(',') : [],
        'redeemStarts': convertHelper.roundDate(data.redeemStarts, this.campaignHours[0]),
        'redeemEnds': convertHelper.roundDate(data.redeemEnds, this.campaignHours[1]),
        'startsAt': convertHelper.roundDate(data.startsAt, this.campaignHours[0]),
        'expiresAt': convertHelper.roundDate(data.expiresAt, this.campaignHours[1]),
      }
    }, {
      "new": true
    }).catch());
    // [error, results] = await to(this.user.updateOne(
    //   {
    //     _id: partner_id,
    //     'microcredit._id': campaign_id
    //   }, {
    //   '$set': {
    //     'microcredit.$._id': campaign_id,
    //     'microcredit.$.imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentCampaign.imageURL,
    //     'microcredit.$.title': data.title,
    //     'microcredit.$.slug': await createSlug(request),
    //     'microcredit.$.subtitle': data.subtitle,
    //     'microcredit.$.terms': data.terms,
    //     'microcredit.$.access': data.access,
    //     'microcredit.$.description': data.description,
    //     'microcredit.$.contentFiles': (data.contentFiles) ? data.contentFiles.split(',') : 0,
    //     'microcredit.$.category': data.category,
    //     'microcredit.$.quantitative': data.quantitative,
    //     'microcredit.$.redeemable': data.redeemable,
    //     'microcredit.$.stepAmount': data.stepAmount,
    //     'microcredit.$.minAllowed': data.minAllowed,
    //     'microcredit.$.maxAllowed': data.maxAllowed,
    //     'microcredit.$.maxAmount': data.maxAmount,
    //     'microcredit.$.redeemStarts': convertHelper.roundDate(data.redeemStarts, this.campaignHours[0]),
    //     'microcredit.$.redeemEnds': convertHelper.roundDate(data.redeemEnds, this.campaignHours[1]),
    //     'microcredit.$.startsAt': convertHelper.roundDate(data.startsAt, this.campaignHours[0]),
    //     'microcredit.$.expiresAt': convertHelper.roundDate(data.expiresAt, this.campaignHours[1]),
    //   }
    // }).catch());
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
      await this.removeFile(currentCampaign);
    }

    if (currentCampaign.contentFiles) {
      this.removeRichEditorFiles(currentCampaign, null, false);
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.microcreditModel.findOneAndDelete({ _id: new ObjectId(campaign_id) }).catch());
    // [error, results] = await to(this.user.updateOne({
    //   _id: partner_id
    // }, {
    //   $pull: {
    //     microcredit: {
    //       _id: campaign_id
    //     }
    //   }
    // }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Microcredit Campaign with ID: " + campaign_id + " has been deleted!",
      code: 200
    });
  }

  /**
   *  
   * Local Function Section 
   *
   * */

  /** Project Partner (Local Function) */
  private projectPartner() {
    return {
      _id: '$_id',
      name: '$name',
      email: '$email',
      slug: '$slug',
      imageURL: '$imageURL',
      payments: '$payments',
      address: '$address',
      contacts: '$contacts',
      phone: '$phone',
    };
  }

  /** Project Microcredit (Local Function) */
  private projectMicrocredit() {
    return {
      _id: '$microcredit._id',
      slug: '$microcredit.slug',
      imageURL: '$microcredit.imageURL',

      title: '$microcredit.title',
      subtitle: '$microcredit.subtitle',
      terms: '$microcredit.terms',
      description: '$microcredit.description',
      category: '$microcredit.category',
      status: '$microcredit.status',
      access: '$microcredit.access',

      quantitative: '$microcredit.quantitative',
      redeemable: '$microcredit.redeemable',

      stepAmount: '$microcredit.stepAmount',
      minAllowed: '$microcredit.minAllowed',
      maxAllowed: '$microcredit.maxAllowed',
      maxAmount: '$microcredit.maxAmount',

      redeemStarts: '$microcredit.redeemStarts',
      redeemEnds: '$microcredit.redeemEnds',
      startsAt: '$microcredit.startsAt',
      expiresAt: '$microcredit.expiresAt',

      createdAt: '$microcredit.createdAt',
      updatedAt: '$microcredit.updatedAt'
    };
  }

  /** Remove File (Local Function) */
  private async removeFile(currentMicrocredit: MicrocreditCampaign) {
    var imageFile = (currentMicrocredit['imageURL']).split('assets/static/');
    const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
    if (existFile(file)) await deleteFile(file);
  }

  /** Remove Content Files (Local Function) */
  private async removeRichEditorFiles(currentMicrocredit: MicrocreditCampaign, newMicrocredit: CampaignDto, isUpdated: boolean) {
    var toDelete: string[] = [];

    if (isUpdated) {
      (currentMicrocredit.contentFiles).forEach((element: string) => {
        if ((newMicrocredit.contentFiles).indexOf(element) < 0) {
          var imageFile = (element).split('assets/content/');
          const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
          toDelete.push(file);
        }
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    } else {
      (currentMicrocredit.contentFiles).forEach((element: string) => {
        var imageFile = (element).split('assets/content/');
        const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
        toDelete.push(file);
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    }
  }

  /**
   *  
   * Tokens & Statistics Section 
   *
   * */
  private readTokens = async (campaigns: MicrocreditCampaign[]) => {

    let error: Error, tokens: MicrocreditTokens[];
    [error, tokens] = await to(this.transaction.aggregate(
      [
        {
          $match: {
            'campaign_id': { $in: campaigns.map(a => (a._id).toString()) }
          }
        }, {
          $project: {
            _id: "$campaign_id",
            campaign_id: 1,
            earned: { $cond: [{ $eq: ['$type', 'PromiseFund'] }, '$tokens', 0] },
            paid: { $cond: [{ $or: [{ $eq: ['$type', 'ReceiveFund'] }, { $eq: ['$type', 'RevertFund'] }] }, '$payoff', 0] },
            redeemed: { $cond: [{ $eq: ['$type', 'SpendFund'] }, '$tokens', 0] }
          }
        },
        {
          $group: {
            _id: "$campaign_id",
            earnedTokens: { $sum: '$earned' },
            paidTokens: { $sum: '$paid' },
            redeemedTokens: { $sum: '$redeemed' }
          }
        }]
    ).exec().catch());
    if (error) return [];

    campaigns.forEach((el: MicrocreditCampaign) => {
      if (tokens.findIndex(obj => obj._id == el._id) < 1)
        tokens.push({ _id: el._id, earnedTokens: '0', paidTokens: '0', redeemedTokens: '0' })
    });
    return tokens;
  }

  private readRevertSupports = async (campaigns: MicrocreditCampaign[], status: string, type: string) => {
    let error: Error, supports: any[];
    [error, supports] = await to(this.transaction.aggregate([
      {
        $match: {
          'campaign_id': { $in: campaigns.map(a => (a._id).toString()) }
        },
      },
      { $sort: { status: 1 } },
      {
        $group:
        {
          _id: "$support_id",
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

    return supports.filter((o: any) => { return o.type == 'RevertFund' })
  }

  private readStatistics = async (campaigns: MicrocreditCampaign[], status: string, type: string) => {

    const sumarize = (type == "confirmed") ? "$payoff" : "$tokens"
    const supports = (type == "confirmed") ? (await this.readRevertSupports(campaigns, status, type)).map(a => (a._id).toString()) : [];

    let error: Error, statistics: MicrocreditStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'campaign_id': { $in: campaigns.map(a => (a._id).toString()) } },
          { 'type': status },
          { 'support_id': { $nin: supports } }
        ]
      }
    },
    {
      $group: {
        _id: '$campaign_id',
        tokens: { $sum: sumarize },
        users: { "$addToSet": "$member_id" },
        count: { "$addToSet": "$_id" }
      }
    },
    {
      "$project": {
        "tokens": 1,
        "users": { "$size": "$users" },
        "usersArray": '$users',
        "count": { "$size": "$count" }
      }
    }
    ]).exec().catch());
    if (error) return [];

    const byDate: any = await this.readDailyStatistics(campaigns, status, type);
    const fullStatistics = statistics.map((a: MicrocreditStatistics) =>
      Object.assign({}, a,
        {
          byDate: ((byDate).find((e: MicrocreditStatistics) => (e._id).toString() === (a._id).toString())).byDate,
        }
      )
    );

    return fullStatistics;
  }

  private readDailyStatistics = async (campaigns: MicrocreditCampaign[], status: string, type: string) => {

    const sumarize = (type == "confirmed") ? "$payoff" : "$tokens"
    const supports = (type == "confirmed") ? (await this.readRevertSupports(campaigns, status, type)).map(a => (a._id).toString()) : [];

    let error: Error, statistics: MicrocreditStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'campaign_id': { $in: campaigns.map(a => (a._id).toString()) } },
          { 'type': status },
          { 'support_id': { $nin: supports } }
        ]
      }
    },
    {
      $group: {
        _id: {
          campaign_id: "$campaign_id",
          date: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }
        },
        tokens: { $sum: sumarize },
        users: { "$addToSet": "$member_id" },
        count: { "$addToSet": "$_id" }
      }
    },
    {
      $group: {
        _id: "$_id.campaign_id",
        byDate: {
          $push: {
            date: "$_id.date", tokens: "$tokens", users: { "$size": "$users" }, usersArray: '$users', count: { "$size": "$count" }
          }
        }
      }
    },
    {
      "$project": {
        "byDate": { date: 1, tokens: 1, users: 1, usersArray: 1, count: 1 },
      }
    }
    ]).exec().catch());
    if (error) return [];

    statistics.forEach((element: any) => {
      element.byDate.forEach((element: any) => {
        element.date = (element.date.year).toString() + "/" + ("0" + (element.date.month).toString()).slice(-2) + "/" + ("0" + (element.date.day).toString()).slice(-2);
      });
    });

    return statistics;
  }
}

export default MicrocreditCampaignsController;
