import * as express from 'express';
import to from 'await-to-ts'
var path = require('path');
// Eth
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

// Dtos
import InvitationDto from '../communityDtos/invitation.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception'
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import userModel from '../models/user.model';
import invitationModel from '../models/invitation.model';

//Path
var path = require('path');

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function(req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/items'));
  },
  filename: function(req: RequestWithUser, file, cb) {

    cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  }
});
var upload = multer({ storage: storage });

// Remove File
const fs = require('fs')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink);

class CommunityController implements Controller {
  public path = '/community';
  public router = express.Router();
  private user = userModel;
  private invitation = invitationModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/invite`, authMiddleware, validationBodyMiddleware(InvitationDto), this.inviteAFriend, this.emailSender);
    //   this.router.post(`${this.path}/redeem`, authMiddleware, accessMiddleware.onlyAsMerchant, /*accessMiddleware.confirmPassword,*/ validationBodyMiddleware(RedeemPointsDto), this.redeemToken);
    /*  this.router.get(`${this.path}/balance`, authMiddleware, this.readBalance);
      this.router.get(`${this.path}/points/:_to`, authMiddleware, accessMiddleware.onlyAsMerchant, this.readCustomerBalance);
      this.router.get(`${this.path}/transactions`, authMiddleware, this.readTransactions);
      this.router.get(`${this.path}/partners_info`, authMiddleware, this.partnersInfoLength);
      this.router.get(`${this.path}/transactions_info`, authMiddleware, this.transactionInfoLength);*/
  }

  private inviteAFriend = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: InvitationDto = request.body;
    const user: User = request.user;
    if ((await this.invitation.findOne({ receiver_email: data.receiver })) ||
      (await this.user.findOne({ email: data.receiver }))) {
      next(new UnprocessableEntityException("User has been already invited!"));
    } else {
      let error: Error, results: Object;
      [error, results] = await to(this.invitation.create({
        sender_id: user._id, receiver_email: data.receiver,
        points: 100, complete: false
      }).catch());
      if (error) next(new UnprocessableEntityException('DB ERROR'));
      response.locals = {
        sender_name: user.name,
        sender_email: user.email,
        receiver_email: data.receiver
      }
      next();
    }
  }

  private emailSender = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
  }
}

export default CommunityController;
