import * as express from 'express';
import to from 'await-to-ts';
import { ObjectId } from 'mongodb';

// Dtos
import CampaignDto from '../microcreditDtos/campaign.dto'
import MerchantID from '../usersDtos/merchant_id.params.dto'
import CampaignID from '../microcreditDtos/campaign_id.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
import Campaign from '../microcreditInterfaces/campaign.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import itemsMiddleware from '../middleware/items.middleware';
// Models
import userModel from '../models/user.model';

//Path
var path = require('path');
// Blockchain Service
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function (req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/items'));
  },
  filename: function (req: RequestWithUser, file, cb) {
    cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  }
});
var upload = multer({ storage: storage });

// Remove File
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

class MicrocreditCampaignsController implements Controller {
  public path = '/microcredit/campaigns';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public`, this.readPublicCampaigns);
    this.router.get(`${this.path}/private`, authMiddleware, this.readPrivateCampaigns);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsMerchant, upload.single('imageURL'), validationBodyAndFileMiddleware(CampaignDto), this.createCampaign, this.registerMicrocredit);
    this.router.get(`${this.path}/public/:merchant_id`, validationParamsMiddleware(MerchantID), this.readPublicCampaignsByStore);
    this.router.get(`${this.path}/private/:merchant_id`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivateCampaignsByStore);
    this.router.get(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, this.readCampaign);
    this.router.put(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, upload.single('imageURL'), validationBodyAndFileMiddleware(CampaignDto), itemsMiddleware.microcreditCampaign, this.updateCampaign);
    this.router.delete(`${this.path}/:merchant_id/:campaign_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(CampaignID), accessMiddleware.belongsTo, itemsMiddleware.microcreditCampaign, this.deleteCampaign);
  }

  private readPrivateCampaigns = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        'microcredit.access': { $in: ['public', 'private'] }
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        merchant_payment: '$payment',

        campaign_id: '$microcredit._id',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        terms: '$microcredit.title',
        description: '$microcredit.title',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
        minAllowed: '$microcredit.minAllowed',
        maxAllowed: '$microcredit.maxAllowed',
        maxAmount: '$microcredit.maxAmount',

        redeemStarts: '$microcredit.redeemStarts',
        redeemEnds: '$microcredit.redeemEnds',
        startsAt: '$microcredit.startsAt',
        expiresAt: '$microcredit.expiresAt',

        createdAt: '$microcredit.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: campaigns,
      code: 200
    });
  }

  private readPublicCampaigns = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        'microcredit.access': 'public'
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        merchant_payment: '$payment',

        campaign_id: '$microcredit._id',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        terms: '$microcredit.title',
        description: '$microcredit.title',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
        minAllowed: '$microcredit.minAllowed',
        maxAllowed: '$microcredit.maxAllowed',
        maxAmount: '$microcredit.maxAmount',

        redeemStarts: '$microcredit.redeemStarts',
        redeemEnds: '$microcredit.redeemEnds',
        startsAt: '$microcredit.startsAt',
        expiresAt: '$microcredit.expiresAt',

        createdAt: '$microcredit.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    const campaignsTokens: any = await this.merge(campaigns, []);
    // {
    //   _id: new ObjectId(merchant_id)
    // }, {
    //   'microcredit._id': new ObjectId(campaign_id)
    // },



    if (error) next(new UnprocessableEntityException('DB ERROR'));
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
          "terms": data.terms,
          "access": data.access,
          "description": data.description,
          "category": data.category,
          "quantitative": data.quantitative,
          "minAllowed": data.minAllowed,
          "maxAllowed": data.maxAllowed,
          "maxAmount": data.maxAmount,
          "redeemStarts": data.redeemStarts,
          "redeemEnds": data.redeemEnds,
          "startsAt": data.startsAt,
          "expiresAt": data.expiresAt,
          "address": '',
          "transactionHash": ''
        }
      }
    }, { new: true }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));

    const currentCampaign = results.microcredit[results["microcredit"].length - 1];
    response.locals = {
      campaign: currentCampaign
    }
    next();
  }

  private registerMicrocredit = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: CampaignDto = request.body;
    const user: User = request.user;
    const campaign_id: Campaign["campaign_id"] = response.locals.campaign._id;

    //parseInt(((new Date()).getTime() / 1000).toString()),
    await serviceInstance.startNewMicrocredit(user.account.address, 1, data.maxAmount, data.maxAllowed, data.minAllowed,
      data.redeemStarts, data.redeemEnds, data.startsAt, data.expiresAt, data.quantitative)
      .then(async (result: any) => {

        await this.user.updateOne(
          {
            _id: user._id,
            'microcredit._id': campaign_id
          }, {
          '$set': {
            'microcredit.$.address': result.address,
            'microcredit.$.transactionHash': result.transactionHash,
          }
        });

        response.status(201).send({
          message: "Success! A new Microcredit Campaign has been created!",
          code: 201
        })
      })
      .catch((error: Error) => {
        next(new UnprocessableEntityException(error.message))
      })


  }

  private readPrivateCampaignsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        $and: [
          { _id: new ObjectId(merchant_id) },
          { 'microcredit.access': { $in: ['public', 'private', access] } }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',
        merchant_payment: '$payment',

        campaign_id: '$microcredit._id',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        terms: '$microcredit.title',
        description: '$microcredit.title',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
        minAllowed: '$microcredit.minAllowed',
        maxAllowed: '$microcredit.maxAllowed',
        maxAmount: '$microcredit.maxAmount',

        redeemStarts: '$microcredit.redeemStarts',
        redeemEnds: '$microcredit.redeemEnds',
        startsAt: '$microcredit.startsAt',
        expiresAt: '$microcredit.expiresAt',

        createdAt: '$microcredit.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: campaigns,
      code: 200
    });
  }

  private readPublicCampaignsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    let error: Error, campaigns: Campaign[];
    [error, campaigns] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $match: {
        $and: [
          { _id: new ObjectId(merchant_id) },
          { 'microcredit.access': 'public' }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_name: '$name',
        merchant_id: '$_id',
        merchant_imageURL: '$imageURL',
        merchant_payment: '$payment',

        campaign_id: '$microcredit._id',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        terms: '$microcredit.title',
        description: '$microcredit.title',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
        minAllowed: '$microcredit.minAllowed',
        maxAllowed: '$microcredit.maxAllowed',
        maxAmount: '$microcredit.maxAmount',

        redeemStarts: '$microcredit.redeemStarts',
        redeemEnds: '$microcredit.redeemEnds',
        startsAt: '$microcredit.startsAt',
        expiresAt: '$microcredit.expiresAt',

        createdAt: '$microcredit.createdAt'
      }
    }, {
      $sort: {
        createdAt: -1
      }
    }
    ]).exec().catch());

    const campaignsTokens: any = await this.merge(campaigns, [{
      _id: new ObjectId(merchant_id)
    }]);

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: campaignsTokens, //campaigns,
      code: 200
    });
  }

  private readCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    let error: Error, campaigns: Campaign[];

    [error, campaigns] = await to(this.user.aggregate([{
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
        merchant_name: '$name',
        merchant_id: '$_id',
        merchant_imageURL: '$imageURL',
        merchant_payment: '$payment',

        campaign_id: '$microcredit._id',
        campaign_imageURL: '$microcredit.imageURL',
        title: '$microcredit.title',
        terms: '$microcredit.title',
        description: '$microcredit.title',
        category: '$microcredit.category',
        access: '$microcredit.access',

        quantitative: '$microcredit.quantitative',
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

    const campaignsTokens: any = await this.merge(campaigns, [{
      _id: new ObjectId(merchant_id)
    }, {
      'microcredit._id': new ObjectId(campaign_id)
    }]);
    // let tokens: {
    //   initialTokens: number,
    //   redeemedTokens: number
    // };
    // tokens = await this.readACampaignTotal(merchant_id, campaign_id);

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: campaignsTokens[0], //campaigns[0],
      code: 200
    });
  }

  private updateCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
    const data: CampaignDto = request.body;

    const currentCampaign: Campaign = response.locals.campaign;
    if (currentCampaign.campaign_imageURL && request.file) {
      var imageFile = (currentCampaign.campaign_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: merchant_id,
        'microcredit._id': campaign_id
      }, {
      '$set': {
        'microcredit.$._id': campaign_id,
        'microcredit.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentCampaign.campaign_imageURL,
        'microcredit.$.title': data.title,
        'microcredit.$.terms': data.terms,
        'microcredit.$.access': data.access,
        'microcredit.$.description': data.description,
        'microcredit.$.category': data.category,
        'microcredit.$.quantitative': data.quantitative,
        'microcredit.$.minAllowed': data.minAllowed,
        'microcredit.$.maxAllowed': data.maxAllowed,
        'microcredit.$.maxAmount': data.maxAmount,
        'microcredit.$.redeemStarts': data.redeemStarts,
        'microcredit.$.redeemEnds': data.redeemEnds,
        'microcredit.$.startsAt': data.startsAt,
        'microcredit.$.expiresAt': data.expiresAt,
      }
    }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Campaign " + campaign_id + " has been updated!",
      code: 200
    });
  }

  private deleteCampaign = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;

    const currentCampaign: Campaign = response.locals.campaign;
    if (currentCampaign.campaign_imageURL) {
      var imageFile = (currentCampaign.campaign_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id
    }, {
      $pull: {
        microcredit: {
          _id: campaign_id
        }
      }
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Campaign " + campaign_id + " has been deleted!",
      code: 200
    });
  }

  private merge = async (campaigns: Campaign[], match: any) => {

    let x = [...match];
    let y = [...match];

    x.push({ 'microcredit.supports.status': 'order' });
    const confirmedTokens: any = await this.readTotalTokens(x);

    y.push({ 'microcredit.supports.status': 'confirmation' });
    const orderedTokens: any = await this.readTotalTokens(y);

    const campaignsTokens = campaigns.map((a: any) =>
      Object.assign({}, a,
        {
          confirmedTokens: (confirmedTokens).find((b: any) => (b._id).toString() === (a.campaign_id).toString()),
          orderedTokens: (orderedTokens).find((c: any) => (c._id).toString() === (a.campaign_id).toString()),
        }
      )
    );
    return campaignsTokens;
  }

  private readTotalTokens = async (match: any) => {
    let error: Error, tokens: {
      _id: string,
      initialTokens: number,
      redeemedTokens: number
    }[];

    [error, tokens] = await to(this.user.aggregate([{
      $unwind: '$microcredit'
    }, {
      $unwind: '$microcredit.supports'
    }, {
      $match: {
        $and: match
      }
    }, {
      "$group": {
        '_id': '$microcredit._id',
        'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
        'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
      }
    }]).exec().catch());

    return tokens;
  }

}

export default MicrocreditCampaignsController;
  //
  // private readAllCampaignsTotal = async () => {
  //   let error: Error, orderTokens: {
  //     _id: string,
  //     initialTokens: number,
  //     redeemedTokens: number
  //   }[], confirmationTokens: {
  //     _id: string,
  //     initialTokens: number,
  //     redeemedTokens: number
  //   }[];
  //
  //   [error, orderTokens] = await to(this.user.aggregate([{
  //     $unwind: '$microcredit'
  //   }, {
  //     $unwind: '$microcredit.supports'
  //   }, {
  //     $match: {
  //       'microcredit.supports.status': 'order'
  //     }
  //   }, {
  //     "$group": {
  //       '_id': '$microcredit._id',
  //       'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
  //       'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
  //     }
  //   }]).exec().catch());
  //
  //   [error, confirmationTokens] = await to(this.user.aggregate([{
  //     $unwind: '$microcredit'
  //   }, {
  //     $unwind: '$microcredit.supports'
  //   }, {
  //     $match: {
  //       'microcredit.supports.status': 'confirmation'
  //     }
  //   }, {
  //     "$group": {
  //       '_id': '$microcredit._id',
  //       'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
  //       'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
  //     }
  //   }]).exec().catch());
  //
  //   return {
  //     orderTokens,
  //     confirmationTokens
  //   };
  // }
  //
  // private readCampaignsTotalByStore = async (merchant_id: string) => {
  //   let error: Error, orderTokens: {
  //     _id: string,
  //     initialTokens: number,
  //     redeemedTokens: number
  //   }[], confirmationTokens: {
  //     _id: string,
  //     initialTokens: number,
  //     redeemedTokens: number
  //   }[];
  //
  //   [error, orderTokens] = await to(this.user.aggregate([{
  //     $unwind: '$microcredit'
  //   }, {
  //     $unwind: '$microcredit.supports'
  //   }, {
  //     $match: {
  //       $and: [{
  //         _id: new ObjectId(merchant_id)
  //       }, {
  //         'microcredit.supports.status': 'order'
  //       }]
  //     }
  //   }, {
  //     "$group": {
  //       '_id': '$microcredit._id',
  //       'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
  //       'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
  //     }
  //   }]).exec().catch());
  //
  //   [error, confirmationTokens] = await to(this.user.aggregate([{
  //     $unwind: '$microcredit'
  //   }, {
  //     $unwind: '$microcredit.supports'
  //   }, {
  //     $match: {
  //       $and: [{
  //         _id: new ObjectId(merchant_id)
  //       }, {
  //         'microcredit.supports.status': 'confirmation'
  //       }]
  //     }
  //   }, {
  //     "$group": {
  //       '_id': '$microcredit._id',
  //       'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
  //       'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
  //     }
  //   }]).exec().catch());
  //
  //   return {
  //     orderTokens,
  //     confirmationTokens
  //   };
  // }
  //
  // private readACampaignTotal = async (merchant_id: string, campaign_id: string) => {
  //   //    const merchant_id: CampaignID["merchant_id"] = request.params.merchant_id;
  //   //    const campaign_id: CampaignID["campaign_id"] = request.params.campaign_id;
  //
  //   let error: Error, tokens: {
  //     _id: string,
  //     initialTokens: number,
  //     redeemedTokens: number
  //   }[];
  //
  //   [error, tokens] = await to(this.user.aggregate([{
  //     $unwind: '$microcredit'
  //   }, {
  //     $unwind: '$microcredit.supports'
  //   }, {
  //     $match: {
  //       $and: [{
  //         _id: new ObjectId(merchant_id)
  //       }, {
  //         'microcredit._id': new ObjectId(campaign_id)
  //       }, {
  //         'microcredit.supports.status': 'confirmation'
  //       }]
  //     }
  //   }, {
  //     "$group": {
  //       '_id': '$microcredit._id',
  //       'initialTokens': { '$sum': '$microcredit.supports.initialTokens' },
  //       'redeemedTokens': { '$sum': '$microcredit.supports.redeemedTokens' }
  //     }
  //   }]).exec().catch());
  //
  //   return {
  //     campaign_id: tokens[0]._id,
  //     initialTokens: tokens[0].initialTokens,
  //     redeemedTokens: tokens[0].redeemedTokens
  //   };
  //   // if (error) next(new UnprocessableEntityException('DB ERROR'));
  //
  //   // response.status(200).send({
  //   //   data: {
  //   //     initialTokens: tokens[0].initialTokens,
  //   //     redeemedTokens: tokens[0].redeemedTokens
  //   //   },
  //   //   code: 200
  //   // });
  // }
