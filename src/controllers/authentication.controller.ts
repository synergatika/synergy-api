import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import to from 'await-to-ts';
import path from 'path';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../services/blockchain.service';
const serviceInstance = new BlockchainService(
  `${process.env.ETH_REMOTE_API}`,
  path.join(__dirname, `${process.env.ETH_CONTRACTS_PATH}`),
  `${process.env.ETH_API_ACCOUNT_PRIVKEY}`
);
import BlockchainRegistrationService from '../utils/blockchain.util';
const registrationService = new BlockchainRegistrationService();

/**
 * Emails Util
 */
import EmailsUtil from '../utils/email.util';
const emailsUtil = new EmailsUtil();

/**
 * DTOs
 */
import {
  AuthenticationDto,
  RegisterUserWithPasswordDto, RegisterUserWithoutPasswordDto, RegisterPartnerWithPasswordDto, RegisterPartnerWithoutPasswordDto,
  CheckTokenDto,
  ChangePassInDto, ChangePassOutDto,
  EmailDto, CardDto,
  IdentifierDto,
  DeactivationDto, DeletionDto,
  UserID,
} from '../_dtos/index';

/**
 * Exceptions
 */
import { NotFoundException, UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { User, Member, Account, TokenData, DataStoredInToken, AuthTokenData, UserAccess, RegistrationTransaction, RegistrationTransactionType, TransactionStatus } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import accessMiddleware from '../middleware/auth/access.middleware';
import authMiddleware from '../middleware/auth/auth.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import blockchainStatus from '../middleware/items/status.middleware';

/**
 * Helper's Instances
 */
const createSlug = SlugHelper.partnerSlug;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/registration.transaction.model';

/**
 * Transactions Util
 */
import RegistrationTransactionsUtil from '../utils/registration.transactions';
const transactionsUtil = new RegistrationTransactionsUtil();

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();

  private usesBlockchain: boolean = `${process.env.USES_BLOCKCHAIN}` == 'true';

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {

    /**
     * Identifier & Card
     */

    this.router.get(`${this.path}/check_identifier/:identifier`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(IdentifierDto),
      this.checkIdentifier);

    this.router.put(`${this.path}/link_card/:email`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(EmailDto), validationBodyMiddleware(CardDto),
      this.link_card);

    this.router.put(`${this.path}/link_email/:card`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(CardDto), validationBodyMiddleware(EmailDto),
      this.link_email,
    );

    /**
     * Authentication
     */

    this.router.post(`${this.path}/authenticate`,
      validationBodyMiddleware(AuthenticationDto),
      this.authAuthenticate,
    );

    this.router.post(`${this.path}/logout`,
      authMiddleware,
      this.loggingOut);

    /**
     * Register & Invite
     */

    this.router.post(`${this.path}/register/one-click`,
      validationBodyMiddleware(EmailDto),
      this.oneClickRegister,
    );

    this.router.post(`${this.path}/register/auto-member`,
      validationBodyMiddleware(RegisterUserWithPasswordDto),
      this.autoRegisterMember,
    );

    this.router.post(`${this.path}/register/auto-partner`,
      validationBodyMiddleware(RegisterPartnerWithPasswordDto),
      this.autoRegisterPartner,
    );

    this.router.post(`${this.path}/register/invite-member`,
      authMiddleware, accessMiddleware.onlyAsAdminOrPartner,
      validationBodyMiddleware(RegisterUserWithoutPasswordDto),
      this.inviteMember,
    );

    this.router.post(`${this.path}/register/invite-partner`,
      authMiddleware, accessMiddleware.onlyAsAdmin,
      validationBodyMiddleware(RegisterPartnerWithoutPasswordDto),
      this.invitePartner,
    );

    /**
     * Verify Email Address
     */

    this.router.get(`${this.path}/verify_email/:email`,
      validationParamsMiddleware(EmailDto),
      this.askVerification);

    this.router.post(`${this.path}/verify_email`,
      validationBodyMiddleware(CheckTokenDto),
      this.checkVerification);

    /**
     * Change & Update Password
     */

    this.router.put(`${this.path}/set_pass/:email`,
      validationParamsMiddleware(EmailDto), validationBodyMiddleware(ChangePassInDto),
      this.changePassMiddle);

    this.router.put(`${this.path}/change_pass`,
      authMiddleware, validationBodyMiddleware(ChangePassInDto),
      this.changePassInside);

    this.router.get(`${this.path}/forgot_pass/:email`,
      validationParamsMiddleware(EmailDto),
      this.askRestoration,
    );

    this.router.post(`${this.path}/forgot_pass`,
      validationBodyMiddleware(CheckTokenDto),
      this.checkRestoration);

    this.router.put(`${this.path}/forgot_pass`,
      validationBodyMiddleware(ChangePassOutDto),
      this.changePassOutside);

    /**
     * Activate / Deactivate / Delete Account
     */

    this.router.put(`${this.path}/deactivate`,
      authMiddleware, validationBodyMiddleware(DeactivationDto),
      this.autoDeactivation,
    );

    this.router.put(`${this.path}/activate/:user_id`,
      authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(UserID),
      this.activateUser,
    );

    this.router.put(`${this.path}/deactivate/:user_id`,
      authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(UserID),
      this.deactivateUser,
    );

    this.router.put(`${this.path}/delete`,
      authMiddleware,
      this.autoDeletion,
    );
  }

  /**
   * 
   * Secondary Functions (General)
   * 
   */
  private isError = (err: unknown): err is Error => err instanceof Error;

  private generateToken(length: number, hours: number): AuthTokenData {
    let outString: string = '';
    let inOptions: string = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789';

    for (let i = 0; i < length; i++) {
      outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
    }

    let now = new Date()
    now.setHours(now.getHours() + hours);
    let seconds = now.getTime();

    return {
      token: outString,
      expiresAt: parseInt(seconds.toString())
    }
  }

  private createToken(user: User): TokenData {
    const expiresIn = parseInt(`${process.env.JWT_EXPIRATION}`); // an hour
    const secret = `${process.env.JWT_SECRET}`;
    const dataStoredInToken: DataStoredInToken = {
      _id: user._id.toString(),
    };
    return {
      expiresIn,
      token: jwt.sign(dataStoredInToken, secret, { expiresIn }),
    };
  }

  private currentDateTime(): Number {
    const now = new Date();
    return parseInt(now.getTime().toString());
  }

  private initializeMember = async (auto: boolean, blockchain: boolean, data: any) => {
    var user: User;
    var extras: any = {};

    if (!auto && blockchain) {
      const tempPassword = (data.email) ? this.generateToken(10, 1).token : data.card;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      extras['tempPassword'] = tempPassword;

      const encryptBy = (data.email) ? data.email : data.card;
      const account: Account = serviceInstance.createWallet(encryptBy);
      extras['encryptBy'] = encryptBy;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.MEMBER,
        account: account,
        pass_verified: false,
      };
    }
    else if (!auto && !blockchain) {
      const tempPassword = (data.email) ? this.generateToken(10, 1).token : data.card;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      extras['tempPassword'] = tempPassword;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.MEMBER,
        pass_verified: false,
      };
    }
    else if (auto && blockchain) {

      const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));
      const hashedPassword = await bcrypt.hash(data.password, 10);
      extras['token'] = token.token;

      const encryptBy = data.email;
      const account: Account = serviceInstance.createWallet(encryptBy);
      extras['encryptBy'] = encryptBy;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.MEMBER,
        account: account,
        email_verified: false,
        verificationToken: token.token,
        verificationExpiration: token.expiresAt,
      }
    }
    else if (auto && !blockchain) {
      const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));
      const hashedPassword = await bcrypt.hash(data.password, 10);
      extras['token'] = token.token;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.MEMBER,
        email_verified: false,
        verificationToken: token.token,
        verificationExpiration: token.expiresAt,
      }
    }
    return {
      user: user,
      extras: extras
    };
  }

  private initializePartner = async (auto: boolean, blockchain: boolean, data: any) => {
    var user: User;
    var extras: any = {};

    if (!auto && blockchain) {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      extras['tempPassword'] = tempPassword;

      const encryptBy = data.email;
      const account: Account = serviceInstance.createWallet(encryptBy);
      extras['encryptBy'] = encryptBy;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.PARTNER,
        account: account,
        pass_verified: false,
      }
    }
    else if (!auto && !blockchain) {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      extras['tempPassword'] = tempPassword;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.PARTNER,
        pass_verified: false,
      }
    }
    else if (auto && blockchain) {
      const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));
      const hashedPassword = await bcrypt.hash(data.password, 10);
      extras['token'] = token.token;

      const encryptBy = data.email;
      const account: Account = serviceInstance.createWallet(encryptBy);
      extras['encryptBy'] = encryptBy;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.PARTNER,
        activated: false,
        account: account,
        email_verified: false,
        verificationToken: token.token,
        verificationExpiration: token.expiresAt,
      }
    }
    else if (auto && !blockchain) {
      const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));
      const hashedPassword = await bcrypt.hash(data.password, 10);
      extras['token'] = token.token;

      user = {
        ...data,
        password: hashedPassword,
        access: UserAccess.PARTNER,
        activated: false,
        email_verified: false,
        verificationToken: token.token,
        verificationExpiration: token.expiresAt,
      }
    }

    return {
      user: user,
      extras: extras
    };
  }

  /**
   *
   * Main Functions (Route: `/auth`)
   *  
   */

  private checkIdentifier = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const identifier: IdentifierDto["identifier"] = request.params.identifier;

    const emailPatern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(identifier);
    const cardPatern = /^\d{16}$/.test(identifier);

    if (emailPatern) {
      let error: Error, user: Member;
      [error, user] = await to(userModel.findOne({ email: identifier })
        .select({ "_id": 1, "email": 1, "card": 1 }).catch());
      if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
      else if (!user) {
        response.status(200).send({
          data: { status: "email_none" },
          code: 200
        });
      } else if (user && user.card) {
        response.status(200).send({
          data: { status: "email_both" },
          code: 200
        });
      } else if (user && !user.card) {
        response.status(200).send({
          data: { status: "email_no_card" },
          code: 200
        });
      }
    } else if (cardPatern) {
      let error: Error, user: Member;
      [error, user] = await to(userModel.findOne({ card: identifier })
        .select({ "_id": 1, "email": 1, "card": 1 }).catch());
      if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
      else if (!user) {
        response.status(200).send({
          data: { status: "card_none" },
          code: 200
        });
      } else if (user && user.email) {
        response.status(200).send({
          data: { status: "card_both" },
          code: 200
        });
      } else if (user && !user.email) {
        response.status(200).send({
          data: { status: "card_no_email" },
          code: 200
        });
      }
    } else {
      return next(new NotFoundException('WRONG_IDENTIFIER'));
    }
  }

  private link_card = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.params.email;
    const data: CardDto = request.body;

    let error: Error, user: Member;
    [error, user] = await to(userModel.findOne({ email: email }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (!user) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
      // } else if (user.card) {
      //   return next(new NotFoundException('USER_HAS_CARD'));
    } else if (await userModel.findOne({ card: data.card })) {
      return next(new NotFoundException('USER_EXISTS'));
    } else if (!user.activated) {
      return next(new NotFoundException('USER_DEACTIVATED'));
    }

    let results: Object;
    [error, results] = await to(userModel.updateOne({
      email: email
    }, {
      $set: {
        card: data.card
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "A card has been linked to member's email.",
      code: 200
    });
  }

  private link_email = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const card: CardDto["card"] = request.params.card;
    const data: EmailDto = request.body;

    let error: Error, user: Member;
    [error, user] = await to(userModel.findOne({ card: card }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (!user) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    } else if (user.email) {
      return next(new NotFoundException('USER_HAS_EMAIL'));
    } else if (await userModel.findOne({ email: data.email })) {
      return next(new NotFoundException('USER_EXISTS'));
    } else if (!user.activated) {
      return next(new NotFoundException('USER_DEACTIVATED'));
    }

    const tempPassword = this.generateToken(10, 1).token;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const encryptBy = data.email;

    let account;
    if (this.usesBlockchain) account = serviceInstance.lockWallet((serviceInstance.unlockWallet(user.account, user.card)).privateKey, data.email)

    const extras = {
      encryptBy: encryptBy,
      tempPassword: tempPassword
    };

    let results: Object;
    [error, results] = await to(userModel.updateOne({
      card: card
    }, {
      $set: {
        email: data.email,
        password: hashedPassword,
        account: account
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.userRegistration2(request.headers['content-language'], data.email, tempPassword, 'invite', request.user).catch());
    if (email_error) throw (`EMAIL ERROR - UserRegistration: ${email_error}`);
    // if (email_error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    // response.locals = {
    //   res: this.prefixedResponse(200, "User has been Invited to enjoy our Community!", {}, { "password": tempPassword }),
    //   registeredBy: request.user,
    //   registrationType: 'invite',
    //   extras: extras,
    //   user: {
    //     email: data.email,
    //     password: tempPassword
    //   }, token: null
    // };
    // next();
    response.status(200).send(
      {
        // body: {
        message: "",
        data: {},
        tempData: { "password": tempPassword }
        // }
      }
    );
  }

  private oneClickRegister = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.body.email;
    const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));

    const existingUser = await userModel.findOne({ email: email });
    if (existingUser) {
      let error: Error, results: Object;
      [error, results] = await to(userModel.updateOne({
        email: email
      }, {
        $set: {
          oneClickToken: token.token,
          oneClickExpiration: token.expiresAt
        }
      }).catch());
      if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

      return response.status(200).send({
        data: {
          "registration": false,
          "oneClickToken": token.token
        },
        code: 200
      });
    }

    let tempPassword: string = this.generateToken(10, 1).token;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const encryptBy = email;
    let account: Account = serviceInstance.createWallet(encryptBy);

    const extras = {
      encryptBy: encryptBy,
      tempPassword: tempPassword
    };

    let error: Error, user: User;
    [error, user] = await to(userModel.create({
      email: email,
      password: hashedPassword,
      access: UserAccess.MEMBER,
      account: account,
      pass_verified: false,
      oneClickToken: token.token,
      oneClickExpiration: token.expiresAt,
      createdBy: 'One-Click'
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Registration - Member) */
    let transaction_error: Error, transaction_result;
    [transaction_error, transaction_result] = await to(transactionsUtil.createRegisterMemberTransaction(user, encryptBy).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    /** Email Block (Authentication - Registration) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.userRegistration2(request.headers['content-language'], user.email, tempPassword, 'one-click', null).catch());
    if (email_error) throw (`EMAIL ERROR - UserRegistration: ${email_error}`);
    //return next(new UnprocessableEntityException(`EMAIL ERROR || ${email_error}`));


    response.status(200).send(
      {
        // body: {
        message: "",
        data: { "registration": true, "oneClickToken": token.token },
        tempData: { "password": tempPassword }
        // }
      }
    );
    // response.locals = {
    //   user: user,
    //   registrationType: 'one-click',
    //   extras: extras,
    //   res: this.prefixedResponse(200, "", { "registration": true, "oneClickToken": token.token }, { "password": tempPassword })
    // }
    // next();
  }

  private autoRegisterMember = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterUserWithPasswordDto = request.body;

    const existingUser = await userModel.findOne({ email: data.email });
    if (existingUser) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    let potensialUser = await this.initializeMember(
      true,
      this.usesBlockchain,
      { ...data, createdBy: 'auto' }
    );

    let error: Error, user: User;
    [error, user] = await to(userModel.create(
      potensialUser.user
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Registration - Member) */
    let transaction_error: Error, transaction_result;
    [transaction_error, transaction_result] = await to(transactionsUtil.createRegisterMemberTransaction(user, potensialUser.extras.encryptBy).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    /** Email Block (Authentication - Verification) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.emailVerification2(request.headers['content-language'], user.email, potensialUser.extras.token).catch());
    if (email_error) throw (`EMAIL ERROR - EmailVerification: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
      tempData: { "token": potensialUser.extras.token }
    });
  }

  private autoRegisterPartner = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterPartnerWithPasswordDto = request.body;

    const existingUser = await userModel.findOne({ email: data.email });
    if (existingUser) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    let potensialUser = await this.initializePartner(
      true,
      this.usesBlockchain,
      { ...data, createdBy: 'auto', slug: await createSlug(request) }
    );

    let error: Error, user: User;
    [error, user] = await to(userModel.create(
      potensialUser.user
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Registration - Partner) */
    let transaction_error: Error, transaction_result;
    [transaction_error, transaction_result] = await to(transactionsUtil.createRegisterPartnerTransaction(user, potensialUser.extras.encryptBy).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    /** Email Block (Authentication - Verification) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.emailVerification2(request.headers['content-language'], user.email, potensialUser.extras.token).catch());
    if (email_error) throw (`EMAIL ERROR - EmailVerification: ${email_error}`);

    /** Email Block (Authentication - Activation Internal) */
    [email_error, email_result] = await to(emailsUtil.internalActivation2(request.headers['content-language'], user).catch());
    if (email_error) throw (`EMAIL ERROR - InternalActivation: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
      tempData: { "token": potensialUser.extras.token }
    });
  }

  private inviteMember = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterUserWithoutPasswordDto = request.body;

    if (
      ((data.email) && (await userModel.findOne({ email: data.email }))) ||
      ((data.card) && (await userModel.findOne({ card: data.card })))) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    let potensialUser = await this.initializeMember(
      false,
      this.usesBlockchain,
      { ...data, createdBy: request['user']._id }
    );

    let error: Error, user: User;
    [error, user] = await to(userModel.create(
      potensialUser.user
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Registration - Member) */
    let transaction_error: Error, transaction_result;
    [transaction_error, transaction_result] = await to(transactionsUtil.createRegisterMemberTransaction(user, potensialUser.extras.encryptBy).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    if (user.email) {
      /** Email Block (Authentication - Registration) */
      let email_error, email_result: any;
      [email_error, email_result] = await to(emailsUtil.userRegistration2(request.headers['content-language'], user.email, potensialUser.extras.tempPassword, 'invite', request.user).catch());
      if (email_error) throw (`EMAIL ERROR - UserRegistration: ${email_error}`);
    }

    response.status(200).send({
      message: "",
      data: {},
      tempData: { "password": potensialUser.extras.tempPassword }
    });
  }

  private invitePartner = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterPartnerWithoutPasswordDto = request.body;

    let existingUser = await userModel.findOne({ email: data.email });
    if (existingUser) return next(new NotFoundException('USER_EXISTS'));

    let potensialUser = await this.initializePartner(
      false,
      this.usesBlockchain,
      { ...data, createdBy: request['user']._id, slug: await createSlug(request) }
    );

    let error: Error, user: User;
    [error, user] = await to(userModel.create(
      { ...potensialUser.user }
    ).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Transaction Block (Registration - Partner) */
    let transaction_error: Error, transaction_result;
    [transaction_error, transaction_result] = await to(transactionsUtil.createRegisterPartnerTransaction(user, potensialUser.extras.encryptBy).catch());
    if (transaction_error) return next(new UnprocessableEntityException(`DB ERROR || ${transaction_error}`));

    /** Email Block (Authentication - Registration) */
    let email_error: Error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.userRegistration2(request.headers['content-language'], user.email, potensialUser.extras.tempPassword, 'invite', request.user).catch());
    if (email_error) throw (`EMAIL ERROR - UserRegistration: ${email_error}`);

    response.status(200).send({
      // body: {
      message: "",
      data: {},
      tempData: { "password": potensialUser.extras.tempPassword }
      // }
    });
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;

    let error: Error, user: User;
    [error, user] = await to(userModel.findOne({
      email: data.email
    }).select({
      "_id": 1,
      "name": 1,
      "email": 1,
      "password": 1,
      "imageURL": 1,
      "access": 1,
      "activated": 1,
      "email_verified": 1,
      "pass_verified": 1,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    if ((!user) || !(await bcrypt.compare(data.password, user.password))) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    if (!user.pass_verified) {
      response.status(202).send({
        data: { action: 'need_password_verification' },
        code: 202
      });
    } else if (!user.email_verified) {
      const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));

      let error: Error, result: User;
      [error, result] = await to(userModel.findOneAndUpdate({
        email: data.email
      }, {
        $set: {
          verificationToken: token.token,
          verificationExpiration: token.expiresAt
        }
      }).catch());
      if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

      /** Email Block (Authentication - Verification) */
      let email_error, email_result: any;
      [email_error, email_result] = await to(emailsUtil.emailVerification2(request.headers['content-language'], data.email, token.token).catch())
      if (email_error) throw (`EMAIL ERROR - EmailVerification: ${email_error}`);

      response.status(202).send({
        data: { action: 'need_email_verification' },
        tempData: { token: token.token },
        code: 202
      });
    } else if (!user.activated && user.access == UserAccess.MEMBER) {
      response.status(202).send({
        data: { action: 'need_account_activation' },
        code: 202
      });
    } else {
      user.password = undefined;
      response.status(200).send({
        data: {
          user: user,
          token: this.createToken(user)
        },
        code: 200
      });
    }
  }

  private loggingOut = (request: express.Request, response: express.Response) => {
    const token = {
      expiresIn: 0,
      token: ""
    }
    response.status(200).send(token);
  }

  private changePassInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassInDto = request.body;
    const user: User = request.user;

    if (!(await bcrypt.compare(data.oldPassword, user.password))) { // Is password matching?
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    let error: Error, results: Object;
    [error, results] = await to(userModel.updateOne({
      "_id": user._id
    }, {
      "$set": {
        "password": hashedPassword
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Your password has been Updated",
      code: 200
    });
  }

  private changePassMiddle = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassInDto = request.body;
    const email: EmailDto["email"] = request.params.email;

    let user: User = await userModel.findOne({
      email: email, email_verified: true, pass_verified: false
    });
    if ((!user) || (!(await bcrypt.compare(data.oldPassword, user.password)))) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    let error: Error, results: Object;
    [error, results] = await to(userModel.updateOne({
      "email": email
    }, {
      "$set": {
        "pass_verified": true,
        "password": await bcrypt.hash(data.newPassword, 10)
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Your password has been Updated",
      code: 200
    });
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.params.email;

    let user: User = await userModel.findOne({ email: email });
    if ((!user) || (user && user.email_verified)) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));

    let error: Error, result: User;
    [error, result] = await to(userModel.findOneAndUpdate({
      "email": email
    }, {
      "$set": {
        "verificationToken": token.token,
        "verificationExpiration": token.expiresAt
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Email Block (Authentication - Verification) */
    let email_error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.emailVerification2(request.headers['content-language'], email, token.token).catch());
    if (email_error) throw (`EMAIL ERROR - EmailVerification: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
      tempData: { "token": token.token }
    });
  }

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;

    let user: User = await userModel.findOne({
      verificationToken: data.token,
      verificationExpiration: { $gt: this.currentDateTime() },
      email_verified: false,
      pass_verified: true
    });
    if (!user) {
      return next(new NotFoundException("WRONG_TOKEN"));
    }

    let error, results: Object;
    [error, results] = await to(userModel.updateOne({
      "verificationToken": data.token
    }, {
      "$set": {
        "email_verified": true,
      },
      "$unset": {
        "verificationToken": '',
        "verificationExpiration": '',
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Your Email Address has been Verified",
      code: 200
    });
  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.params.email;

    let user: User = await userModel.findOne(
      { email: email }
    );
    if ((!user)) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    const token = this.generateToken(parseInt(`${process.env.TOKEN_LENGTH}`), parseInt(`${process.env.TOKEN_EXPIRATION}`));

    let error: Error, results: Object;
    [error, results] = await to(userModel.updateOne({
      "email": email
    }, {
      "$set": {
        "restorationToken": token.token,
        "restorationExpiration": token.expiresAt
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Email Block (Authentication - Restoration) */
    let email_error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.passwordRestoration2(request.headers['content-language'], email, token.token).catch());
    if (email_error) throw (`EMAIL ERROR - PasswordRestore: ${email_error}`);

    response.status(200).send({
      // body: {
      message: "",
      data: {},
      tempData: { "token": token.token }
      // }
    });

  }

  private checkRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;

    let user: User = await userModel.findOne({
      restorationToken: data.token,
      restorationExpiration: { $gt: this.currentDateTime() }
    });
    if (!user) {
      return next(new NotFoundException("WRONG_TOKEN"));
    }

    response.status(200).send({
      message: "Success! You may now proceed to Updating your password!",
      code: 200
    });
  }

  private changePassOutside = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassOutDto = request.body;

    let user: User = await userModel.findOne({
      restorationToken: data.token,
      restorationExpiration: { $gt: this.currentDateTime() }
    });
    if (!user) {
      return next(new NotFoundException("WRONG_TOKEN"));
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    let error: Error, results: Object;
    [error, results] = await to(userModel.updateOne({
      "restorationToken": data.token
    }, {
      "$set": {
        "password": hashedPassword,
      },
      "$unset": {
        "restorationToken": '',
        "restorationExpiration": ''
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! You Password has been Updated!",
      code: 200
    });
  }

  private activateUser = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user_id: UserID["user_id"] = request.params.user_id;

    if (await userModel.findOne({ _id: user_id, activated: true })) {
      return next(new NotFoundException("USER_ACTIVATED"));
    }

    let error: Error, user: User; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, user] = await to(userModel.findOneAndUpdate({
      "_id": user_id
    }, {
      "$set": {
        "activated": true
      }
    }, {
      "fields": { "email": 1, "name": 1, "access": 1 },
      "new": true
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Email Block (Authentication - Activation) */
    let email_error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.accountActivation2(request.headers['content-language'], user.email).catch());
    if (email_error) throw (`EMAIL ERROR - AccountActivation: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
    });
  }

  private deactivateUser = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const user_id: UserID["user_id"] = request.params.user_id;

    if (await userModel.findOne({ _id: user_id, activated: false })) {
      return next(new NotFoundException("USER_DECTIVATED"));
    }

    let error: Error, user: User; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, user] = await to(userModel.findOneAndUpdate({
      "_id": user_id
    }, {
      "$set": {
        "activated": false
      }
    }, {
      "fields": { "email": 1, "name": 1, "access": 1 },
      "new": true
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Email Block (Authentication - Deactivation) */
    let email_error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.accountDeactivation2(request.headers['content-language'], user.email, request.user).catch());
    if (email_error) throw (`EMAIL ERROR - AccountDeactivation: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
    });
  }

  private autoDeactivation = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: DeactivationDto = request.body;

    let error: Error, results: Object;
    [error, results] = await to(userModel.updateOne({
      "_id": request.user._id
    }, {
      "$set": {
        "activated": false
      },
      "$push": {
        "deactivations": {
          "reason": data.reason,
          "createdAt": new Date()
        }
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Email Block (Authentication - Deactivation) */
    let email_error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.accountDeactivation2(request.headers['content-language'], request.user.email, request.user).catch());
    if (email_error) throw (`EMAIL ERROR - AccountDeactivation: ${email_error}`);

    /** Email Block (Authentication - Deactivation Internal) */
    [email_error, email_result] = await to(emailsUtil.internalDeactivation2(request.headers['content-language'], request.user, data.reason).catch());
    if (email_error) throw (`EMAIL ERROR - InternalDeactivation: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
    });
  }

  private autoDeletion = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: DeletionDto = request.body;

    let user: User = await userModel.findOne({
      "_id": request.user._id
    });
    if ((!user) || (!(await bcrypt.compare(data.password, user.password)))) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    let error: Error, results: Object;
    [error, results] = await to(userModel.deleteOne({
      _id: request.user._id
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /** Email Block (Authentication - Deletion) */
    let email_error, email_result: any;
    [email_error, email_result] = await to(emailsUtil.accountDeletion2(request.headers['content-language'], request.user.email).catch());
    if (email_error) throw (`EMAIL ERROR - AccountDelete: ${email_error}`);

    /** Email Block (Authentication - Deletion Internal) */
    [email_error, email_result] = await to(emailsUtil.internalDeletion2(request.headers['content-language'], request.user).catch());
    if (email_error) throw (`EMAIL ERROR - InternalDelete: ${email_error}`);

    response.status(200).send({
      message: "",
      data: {},
    });
  }
}
export default AuthenticationController;




