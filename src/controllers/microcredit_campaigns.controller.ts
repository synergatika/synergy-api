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
import CampaignDto from '../microcreditDtos/campaign.dto'
import PartnerID from '../usersDtos/partner_id.params.dto'
import CampaignID from '../microcreditDtos/campaign_id.params.dto'

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
import Tokens from '../microcreditInterfaces/tokens.interface';
import MicrocreditCampaignStatistics from '../microcreditInterfaces/microcreditCampaignStatistics.interface';

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
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instance
 */
const uploadFile = FilesMiddleware.uploadItem;
const deleteFile = FilesMiddleware.deleteFile;
const createSlug = SlugHelper.microcreditSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/microcredit.transaction.model';

class MicrocreditCampaignsController implements Controller {
  public path = '/microcredit/campaigns';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/one-click/:token`,
      oneClickMiddleware, accessMiddleware.onlyAsPartner,
      uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(CampaignDto),
      this.createCampaign,
      usersMiddleware.partner,
      checkMiddleware.canPublishMicrocredit,
      this.registerMicrocredit);

    this.router.get(`${this.path}/public/:offset`,
      this.readPublicCampaigns);

    this.router.get(`${this.path}/private/:offset`,
      authMiddleware,
      this.readPrivateCampaigns);

    this.router.post(`${this.path}/`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(CampaignDto),
      this.createCampaign);

    this.router.get(`${this.path}/public/:partner_id/:offset`,
      validationParamsMiddleware(PartnerID),
      this.readPublicCampaignsByStore);

    this.router.get(`${this.path}/private/:partner_id/:offset`,
      authMiddleware,
      validationParamsMiddleware(PartnerID),
      this.readPrivateCampaignsByStore);

    this.router.get(`${this.path}/:partner_id/:campaign_id`,
      validationParamsMiddleware(CampaignID),
      this.readCampaign);

    this.router.put(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      uploadFile.single('imageURL'),
      validationBodyAndFileMiddleware(CampaignDto),
      itemsMiddleware.microcreditCampaign,
      checkMiddleware.canEditMicrocredit,
      this.updateCampaign);

    this.router.put(`${this.path}/:partner_id/:campaign_id/publish`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      usersMiddleware.partner,
      itemsMiddleware.microcreditCampaign,
      checkMiddleware.canPublishMicrocredit,
      this.registerMicrocredit);

    this.router.delete(`${this.path}/:partner_id/:campaign_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CampaignID),
      accessMiddleware.belongsTo,
      itemsMiddleware.microcreditCampaign,
      checkMiddleware.canEditMicrocredit,
      this.deleteCampaign);
  }

  private readPrivateCampaigns = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        $and: [
          { 'microcredit.access': { $in: ['public', 'private', access] } },
          { 'microcredit.status': 'published' },
          { 'microcredit.expiresAt': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_email: '$email',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contact: '$contact',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        subtitle: '$microcredit.subtitle',
        terms: '$microcredit.terms',
        description: '$microcredit.description',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
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
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const confirmedTokens: Tokens[] = await this.readTokens(campaigns, 'confirmation');
    const orderedTokens: Tokens[] = await this.readTokens(campaigns, 'order');

    const campaignsTokens = campaigns.map((a: Campaign) =>
      Object.assign({}, a,
        {
          confirmedTokens: (confirmedTokens).find((b: Tokens) => (b._id).toString() === (a.campaign_id).toString()),
          orderedTokens: (orderedTokens).find((c: Tokens) => (c._id).toString() === (a.campaign_id).toString()),
        }
      )
    );
    response.status(200).send({
      data: campaignsTokens, //campaigns,
      code: 200
    });
  }

  private readPublicCampaigns = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        $and: [
          { 'microcredit.access': 'public' },
          { 'microcredit.status': 'published' },
          { 'microcredit.expiresAt': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_email: '$email',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contact: '$contact',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        subtitle: '$microcredit.subtitle',
        terms: '$microcredit.terms',
        description: '$microcredit.description',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
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
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const confirmedTokens: Tokens[] = await this.readTokens(campaigns, 'confirmation');
    const orderedTokens: Tokens[] = await this.readTokens(campaigns, 'order');

    const campaignsTokens = campaigns.map((a: Campaign) =>
      Object.assign({}, a,
        {
          confirmedTokens: (confirmedTokens).find((b: Tokens) => (b._id).toString() === (a.campaign_id).toString()),
          orderedTokens: (orderedTokens).find((c: Tokens) => (c._id).toString() === (a.campaign_id).toString()),
        }
      )
    );
    response.status(200).send({
      data: campaignsTokens, //campaigns,
      code: 200
    });
  }

  private createCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CampaignDto = request.body;
    const user: User = request.user;

    let error: Error, results: any; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.findOneAndUpdate({
      _id: user._id
    }, {
      $push: {
        microcredit: {
          "imageURL": (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : '',
          "title": data.title,
          "subtitle": data.subtitle,
          "slug": await createSlug(request),
          "terms": data.terms,
          "access": data.access,
          "description": data.description,
          "category": data.category,
          "quantitative": data.quantitative,
          "stepAmount": data.stepAmount,
          "minAllowed": data.minAllowed,
          "maxAllowed": data.maxAllowed,
          "maxAmount": data.maxAmount,
          "redeemStarts": data.redeemStarts,
          "redeemEnds": data.redeemEnds,
          "startsAt": data.startsAt,
          "expiresAt": data.expiresAt,
          "status": 'draft',
          "address": '',
          "transactionHash": ''
        }
      }
    }, { new: true }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    const currentCampaign = results.microcredit[results["microcredit"].length - 1];

    if (request.params && request.params.token) {
      response.locals["campaign"] = currentCampaign;
      response.locals.campaign.campaign_id = currentCampaign._id;
      next();
    } else {
      response.status(201).send({
        data: currentCampaign, //message: "Success! A new Microcredit Campaign has been created! (Campaign ID: " + currentCampaign._id + ")",
        code: 201
      });
    }
  }

  private registerMicrocredit = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user: User = request.user;
    const currentCampaign: Campaign = response.locals.campaign;

    const dates = {
      startsAt: (currentCampaign.startsAt).toString(),
      expiresAt: (currentCampaign.expiresAt).toString(),
      redeemStarts: (currentCampaign.redeemStarts).toString(),
      redeemEnds: (currentCampaign.redeemEnds).toString()
    };

    Object.keys(dates).forEach((key: string) => {
      if (`${process.env.PRODUCTION}` == 'true')
        (dates as any)[key] = (dates as any)[key] + "000000"
      else
        (dates as any)[key] = ((dates as any)[key]).substring(0, ((dates as any)[key]).length - 3)
    });

    console.log(dates);

    await serviceInstance.startNewMicrocredit(user.account.address,
      1, currentCampaign.maxAmount, currentCampaign.maxAmount, currentCampaign.minAllowed,
      parseInt(dates.redeemEnds), parseInt(dates.redeemStarts), parseInt(dates.startsAt), parseInt(dates.expiresAt),
      // parseInt(((currentCampaign.redeemEnds).toString() + "000000")),
      // parseInt(((currentCampaign.redeemStarts).toString() + "000000")),
      // parseInt(((currentCampaign.startsAt).toString() + "000000")),
      // parseInt(((currentCampaign.expiresAt).toString() + "000000")),
      currentCampaign.quantitative)
      .then(async (result: any) => {

        await this.user.updateOne({
          _id: user._id,
          'microcredit._id': currentCampaign.campaign_id
        }, {
          '$set': {
            'microcredit.$.status': 'published', // published
            'microcredit.$.address': result.address,
            'microcredit.$.transactionHash': result.transactionHash,
          }
        });

        response.status(200).send({
          message: "Success! Microcredit Campaign with ID: " + currentCampaign.campaign_id + " has been published!",
          code: 200
        });
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException(error.message))
      })
  }

  private readPrivateCampaignsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;
    const access = (request.user.access === 'partner') ? 'partners' : 'random';
    const status = (request.user._id == partner_id) ? 'draft' : 'random';
    const user: User = request.user;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'microcredit.access': { $in: ['public', 'private', access] } },
              { 'microcredit.status': { $in: ['published', status] } },
              { 'microcredit.expiresAt': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'microcredit.access': { $in: ['public', 'private', access] } },
              { 'microcredit.status': { $in: ['published', status] } },
              { 'microcredit.expiresAt': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_name: '$name',
        partner_email: '$email',
        partner_slug: '$slug',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contact: '$contact',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        subtitle: '$microcredit.subtitle',
        terms: '$microcredit.terms',
        description: '$microcredit.description',
        category: '$microcredit.category',
        access: '$microcredit.access',
        status: '$microcredit.status',

        quantitative: '$microcredit.quantitative',
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
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const confirmedTokens: Tokens[] = await this.readTokens(campaigns, 'confirmation');
    const orderedTokens: Tokens[] = await this.readTokens(campaigns, 'order');

    const campaignsTokens = campaigns.map((a: Campaign) =>
      Object.assign({}, a,
        {
          confirmedTokens: (confirmedTokens).find((b: Tokens) => (b._id).toString() === (a.campaign_id).toString()),
          orderedTokens: (orderedTokens).find((c: Tokens) => (c._id).toString() === (a.campaign_id).toString()),
        }
      )
    );
    response.status(200).send({
      data: campaignsTokens, //campaigns,
      code: 200
    });
  }

  private readPublicCampaignsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'microcredit.access': 'public' },
              { 'microcredit.status': 'published' },
              { 'microcredit.expiresAt': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'microcredit.access': 'public' },
              { 'microcredit.status': 'published' },
              { 'microcredit.expiresAt': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_name: '$name',
        partner_email: '$email',
        partner_slug: '$slug',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contact: '$contact',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        subtitle: '$microcredit.subtitle',
        terms: '$microcredit.terms',
        description: '$microcredit.description',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
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
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    const confirmedTokens: Tokens[] = await this.readTokens(campaigns, 'confirmation');
    const orderedTokens: Tokens[] = await this.readTokens(campaigns, 'order');

    const campaignsTokens = campaigns.map((a: Campaign) =>
      Object.assign({}, a,
        {
          confirmedTokens: (confirmedTokens).find((b: Tokens) => (b._id).toString() === (a.campaign_id).toString()),
          orderedTokens: (orderedTokens).find((c: Tokens) => (c._id).toString() === (a.campaign_id).toString()),
        }
      )
    );
    response.status(200).send({
      data: campaignsTokens, //campaigns,
      code: 200
    });
  }

  private readCampaign = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match:
      {
        $or: [
          {
            $and: [{
              _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId()
            }, {
              'microcredit._id': ObjectId.isValid(campaign_id) ? new ObjectId(campaign_id) : new ObjectId()
            }]
          },
          {
            $and: [{
              slug: partner_id
            }, {
              'microcredit.slug': campaign_id
            }]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_name: '$name',
        partner_email: '$email',
        partner_slug: '$slug',
        partner_imageURL: '$imageURL',

        partner_payments: '$payments',
        partner_address: '$address',
        partner_contact: '$contact',

        campaign_id: '$microcredit._id',
        campaign_slug: '$microcredit.slug',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        subtitle: '$microcredit.subtitle',
        terms: '$microcredit.terms',
        description: '$microcredit.description',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
        stepAmount: '$microcredit.stepAmount',
        minAllowed: '$microcredit.minAllowed',
        maxAllowed: '$microcredit.maxAllowed',
        maxAmount: '$microcredit.maxAmount',

        redeemStarts: '$microcredit.redeemStarts',
        redeemEnds: '$microcredit.redeemEnds',
        startsAt: '$microcredit.startsAt',
        expiresAt: '$microcredit.expiresAt',

        supports: '$microcredit.supports',
        createdAt: '$microcredit.createdAt'
      }
    }]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if (!campaigns.length) {
      return next(new NotFoundException('CAMPAIGN_NOT_EXIST'));
    }

    const confirmedTokens: Tokens[] = await this.readTokens(campaigns, 'confirmation');
    const orderedTokens: Tokens[] = await this.readTokens(campaigns, 'order');

    const statisticsPromise: MicrocreditCampaignStatistics[] = await this.readStatistics(campaigns, 'PromiseFund');
    const statisticsRedeem: MicrocreditCampaignStatistics[] = await this.readStatistics(campaigns, 'SpendFund');
    const campaignsTokens = campaigns.map((a: Campaign) =>
      Object.assign({}, a,
        {
          confirmedTokens: (confirmedTokens).find((b: Tokens) => (b._id).toString() === (a.campaign_id).toString()),
          orderedTokens: (orderedTokens).find((c: Tokens) => (c._id).toString() === (a.campaign_id).toString()),

          statisticsPromise: (statisticsPromise).find((e: MicrocreditCampaignStatistics) => (e._id).toString() === (a.campaign_id).toString()),
          statisticsRedeem: (statisticsRedeem).find((d: MicrocreditCampaignStatistics) => (d._id).toString() === (a.campaign_id).toString()),
        }
      )
    );

    console.log("Campaign with Statistics");
    console.log(campaignsTokens[0]);

    response.status(200).send({
      data: campaignsTokens[0], //campaigns[0],
      code: 200
    });
  }

  private updateCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: CampaignID["partner_id"] = request.params.partner_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: CampaignDto = request.body;

    const currentCampaign: Campaign = response.locals.campaign;
    if ((currentCampaign.campaign_imageURL && (currentCampaign.campaign_imageURL).includes(partner_id)) && request.file) {
      //if (currentCampaign.campaign_imageURL && request.file) {
      var imageFile = (currentCampaign.campaign_imageURL).split('assets/items/');
      await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: partner_id,
        'microcredit._id': campaign_id
      }, {
      '$set': {
        'microcredit.$._id': campaign_id,
        'microcredit.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentCampaign.campaign_imageURL,
        'microcredit.$.title': data.title,
        'microcredit.$.slug': await createSlug(request),
        'microcredit.$.subtitle': data.subtitle,
        'microcredit.$.terms': data.terms,
        'microcredit.$.access': data.access,
        'microcredit.$.description': data.description,
        'microcredit.$.category': data.category,
        'microcredit.$.quantitative': data.quantitative,
        'microcredit.$.stepAmount': data.stepAmount,
        'microcredit.$.minAllowed': data.minAllowed,
        'microcredit.$.maxAllowed': data.maxAllowed,
        'microcredit.$.maxAmount': data.maxAmount,
        'microcredit.$.redeemStarts': data.redeemStarts,
        'microcredit.$.redeemEnds': data.redeemEnds,
        'microcredit.$.startsAt': data.startsAt,
        'microcredit.$.expiresAt': data.expiresAt,
      }
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

    const currentCampaign: Campaign = response.locals.campaign;
    if (currentCampaign.campaign_imageURL && (currentCampaign.campaign_imageURL).includes(partner_id)) {
      //if (currentCampaign.campaign_imageURL) {
      var imageFile = (currentCampaign.campaign_imageURL).split('assets/items/');
      await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: partner_id
    }, {
      $pull: {
        microcredit: {
          _id: campaign_id
        }
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Microcredit Campaign with ID: " + campaign_id + " has been deleted!",
      code: 200
    });
  }

  private readTokens = async (campaigns: Campaign[], status: string) => {

    let error: Error, tokens: Tokens[];
    [error, tokens] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: [
          { 'microcredit._id': { $in: campaigns.map(a => a.campaign_id) } },
          { 'microcredit.supports.status': status }
        ]
      }
    }, {
      "$group": {
        '_id': '$microcredit._id',
        'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
        'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
      }
    }]).exec().catch());
    if (error) return [];

    return tokens;
  }

  private readStatistics = async (campaigns: Campaign[], status: string) => {

    let error: Error, statistics: MicrocreditCampaignStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'data.campaign_id': { $in: campaigns.map(a => (a.campaign_id).toString()) } },
          { 'type': status }
        ]
      }
    },
    {
      $group: {
        _id: '$data.campaign_id',
        tokens: { $sum: "$data.tokens" },
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

    const byDate: any = await this.readDailyStatistics(campaigns, status);
    const fullStatistics = statistics.map((a: MicrocreditCampaignStatistics) =>
      Object.assign({}, a,
        {
          byDate: ((byDate).find((e: MicrocreditCampaignStatistics) => (e._id).toString() === (a._id).toString())).byDate,
        }
      )
    );

    return fullStatistics;
  }

  private readDailyStatistics = async (campaigns: Campaign[], status: string) => {

    // var _now: number = Date.now();
    // var _date = new Date(_now);
    // _date.setDate(1);
    // _date.setHours(0, 0, 0, 0);
    // _date.setMonth(_date.getMonth() - 12);

    let error: Error, statistics: MicrocreditCampaignStatistics[];
    [error, statistics] = await to(this.transaction.aggregate([{
      $match: {
        $and: [
          { 'data.campaign_id': { $in: campaigns.map(a => (a.campaign_id).toString()) } },
          { 'type': status }
          //   //{ 'createdAt': { '$gte': new Date((_date.toISOString()).substring(0, (_date.toISOString()).length - 1) + "00:00") } },
        ]
      }
    },
    {
      $group: {
        _id: {
          campaign_id: "$data.campaign_id",
          date: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }
        },
        tokens: { $sum: "$data.tokens" },
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
