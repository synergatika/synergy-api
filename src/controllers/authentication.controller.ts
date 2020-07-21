import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import to from 'await-to-ts';
import path from 'path';
import { ObjectId } from 'mongodb';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(process.env.ETH_REMOTE_API, path.join(__dirname, process.env.ETH_CONTRACTS_PATH), process.env.ETH_API_ACCOUNT_PRIVKEY);

/**
 * Email Service
 */
import EmailService from '../utils/emailService';
const emailService = new EmailService();

/**
 * DTOs
 */
import AuthenticationDto from '../authDtos/authentication.dto';
import RegisterUserWithPasswordDto from '../authDtos/registerUserWithPassword.dto';
import RegisterUserWithoutPasswordDto from '../authDtos/registerUserWithoutPassword.dto';
import RegisterPartnerWithPasswordDto from '../authDtos/registerPartnerWithPassword.dto';
import RegisterPartnerWithoutPasswordDto from '../authDtos/registerPartnerWithoutPassword.dto';
import CheckTokenDto from '../authDtos/checkToken.dto';
import ChangePassInDto from '../authDtos/changePassIn.dto';
import ChangePassOutDto from '../authDtos/changePassOut.dto';
import EmailDto from '../authDtos/email.params.dto';
import CardDto from '../authDtos/card.params.dto';
import IdentifierDto from '../authDtos/identifier.params.dto';
import DeactivatationDto from '../authDtos/deactivation.dto';

/**
 * Exceptions
 */
import NotFoundException from '../exceptions/NotFound.exception';
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../authInterfaces/dataStoredInToken';
import TokenData from '../authInterfaces/tokenData.interface';
import AuthTokenData from '../authInterfaces/authTokenData.interface';
import User from '../usersInterfaces/user.interface';
import Member from '../usersInterfaces/member.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Account from '../usersInterfaces/account.interface';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationBodyAndFileMiddleware from '../middleware//validators/body_file.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import accessMiddleware from '../middleware/auth/access.middleware';
import authMiddleware from '../middleware/auth/auth.middleware';
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';

/**
 * Helper's Instances
 */
const uploadFile = FilesMiddleware.uploadPerson;
const renameFile = FilesMiddleware.renameFile;
const createSlug = SlugHelper.partnerSlug;

/**
 * Models
 */
import userModel from '../models/user.model';
import transactionModel from '../models/registration.transaction.model';

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;
  private transaction = transactionModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/one-click/register`,
      validationBodyMiddleware(EmailDto), this.oneClickRegister, this.registerAccount, emailService.userRegistration);

    this.router.get(`${this.path}/check_identifier/:identifier`,
      authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(IdentifierDto), this.checkIdentifier);
    this.router.put(`${this.path}/link_card/:email`,
      authMiddleware, accessMiddleware.registerMember, validationParamsMiddleware(EmailDto), validationBodyMiddleware(CardDto), this.link_card);
    this.router.put(`${this.path}/link_email/:card`,
      authMiddleware, accessMiddleware.registerMember, validationParamsMiddleware(CardDto), validationBodyMiddleware(EmailDto), this.link_email, emailService.userRegistration);

    this.router.post(`${this.path}/authenticate`,
      validationBodyMiddleware(AuthenticationDto), this.authAuthenticate, this.askVerification, emailService.emailVerification);
    this.router.post(`${this.path}/logout`,
      authMiddleware, this.loggingOut);

    this.router.post(`${this.path}/auto-register/member`,
      validationBodyMiddleware(RegisterUserWithPasswordDto), this.authAutoRegisterMember, this.registerAccount, this.askVerification, emailService.emailVerification);

    this.router.post(`${this.path}/auto-register/partner`,
      uploadFile.single('imageURL'), validationBodyAndFileMiddleware(RegisterPartnerWithPasswordDto), this.authAutoRegisterPartner, this.registerAccount, this.askVerification, emailService.emailVerification);

    this.router.post(`${this.path}/register/member`,
      authMiddleware, accessMiddleware.registerMember, validationBodyMiddleware(RegisterUserWithoutPasswordDto), this.registerMember, this.registerAccount, emailService.userRegistration);
    this.router.post(`${this.path}/register/partner`,
      authMiddleware, accessMiddleware.registerPartner, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(RegisterPartnerWithoutPasswordDto), this.registerPartner, this.registerAccount, emailService.userRegistration);

    this.router.put(`${this.path}/set_pass/:email`,
      validationParamsMiddleware(EmailDto), validationBodyMiddleware(ChangePassInDto), this.changePassMiddle);

    this.router.put(`${this.path}/change_pass`,
      authMiddleware, validationBodyMiddleware(ChangePassInDto), this.changePassInside);

    this.router.get(`${this.path}/verify_email/:email`,
      validationParamsMiddleware(EmailDto), this.askVerification, emailService.emailVerification);
    this.router.post(`${this.path}/verify_email`,
      validationBodyMiddleware(CheckTokenDto), this.checkVerification);

    this.router.get(`${this.path}/forgot_pass/:email`,
      validationParamsMiddleware(EmailDto), this.askRestoration, emailService.passwordRestoration);
    this.router.post(`${this.path}/forgot_pass`,
      validationBodyMiddleware(CheckTokenDto), this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`,
      validationBodyMiddleware(ChangePassOutDto), this.changePassOutside);

    this.router.put(`${this.path}/deactivate`,
      authMiddleware, validationBodyMiddleware(DeactivatationDto), this.deactivateAccount, emailService.accountDeactivation);
  }

  private oneClickRegister = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.body.email;
    const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));

    if (await this.user.findOne({ email: email })) {
      let error: Error, results: Object;
      [error, results] = await to(this.user.updateOne({
        email: email
      }, {
        $set: {
          oneClickToken: token.token,
          oneClickExpiration: token.expiresAt
        }
      }).catch());
      if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

      response.status(200).send({
        data: {
          "registration": false,
          "oneClickToken": token.token
        },
        code: 200
      });
    } else {
      let tempPassword: string = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      let account: Account = serviceInstance.createWallet(email);
      //  account = serviceInstance.createWallet(tempPassword);

      let error: Error, user: User;
      [error, user] = await to(this.user.create({
        email: email, password: hashedPassword,
        access: 'member', account: account,
        email_verified: true, pass_verified: false,
        oneClickToken: token.token, oneClickExpiration: token.expiresAt,
        createdBy: 'One-Click',
      }).catch());
      if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

      response.locals = {
        res: {
          code: 200,
          body: {
            // -- For Testing Purposes Only -- //
            tempData: { "password": tempPassword },
            // -- ////////////|\\\\\\\\\\\\ -- //
            data: {
              "registration": true,
              "oneClickToken": token.token
            },
            code: 200
          }
        }, user: {
          user_id: user._id,
          access: 'member',
          email: email,
          password: tempPassword
        }, account: account
      }
      next();
    }
  }

  private checkIdentifier = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const identifier: IdentifierDto["identifier"] = request.params.identifier;

    const emailPatern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(identifier);
    const cardPatern = /^\d{16}$/.test(identifier);

    if (emailPatern) {
      let error: Error, user: Member;
      [error, user] = await to(this.user.findOne({ email: identifier })
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
      [error, user] = await to(this.user.findOne({ card: identifier })
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
    [error, user] = await to(this.user.findOne({ email: email }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (!user) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    } else if (user.card) {
      return next(new NotFoundException('USER_HAS_CARD'));
    } else if (await this.user.findOne({ card: data.card })) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    let results: Object;
    [error, results] = await to(this.user.updateOne({
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
    [error, user] = await to(this.user.findOne({ card: card }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (!user) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    } else if (user.email) {
      return next(new NotFoundException('USER_HAS_EMAIL'));
    } else if (await this.user.findOne({ email: data.email })) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    const tempPassword = this.generateToken(10, 1).token;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const account = serviceInstance.lockWallet((serviceInstance.unlockWallet(user.account, user.card)).privateKey, tempPassword)

    let results: Object;
    [error, results] = await to(this.user.updateOne({
      card: card
    }, {
      $set: {
        email: data.email,
        password: hashedPassword,
        account: account
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals = {
      res: {
        code: 200,
        body: {
          // -- For Testing Purposes Only -- //
          tempData: { "password": tempPassword },
          // -- ////////////|\\\\\\\\\\\\ -- //
          message: "User has been Invited to enjoy our Community!",
          code: 200
        }
      },
      user: {
        email: data.email,
        password: tempPassword
      }, token: null
    };
    next();
  }

  private authAutoRegisterMember
    = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
      const data: RegisterUserWithPasswordDto = request.body;

      if (await this.user.findOne({ email: data.email })) {
        return next(new NotFoundException('USER_EXISTS'));
      } else {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const account: Account = serviceInstance.createWallet(data.email);
        //      const account: Account = serviceInstance.createWallet(data.password);

        let error: Error, results: User;
        [error, results] = await to(this.user.create({
          ...data, password: hashedPassword,
          access: 'member', account: account,
          email_verified: false, pass_verified: true
        }).catch());
        if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

        request.params.email = data.email;
        response.locals = {
          user: {
            user_id: results._id,
            access: 'member',
            email: data.email,
            password: data.password
          }, account: account
        }
        next();
      }
    }

  private authAutoRegisterPartner
    = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
      const data: RegisterPartnerWithPasswordDto = request.body;
      const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));

      if (await this.user.findOne({ email: data.email })) {
        return next(new NotFoundException('USER_EXISTS'));
      } else {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        //    const account: Account = serviceInstance.createWallet(data.password);
        const account: Account = serviceInstance.createWallet(data.email);
        const user_id = new ObjectId();

        let error: Error, results: User;
        [error, results] = await to(this.user.create({
          _id: user_id, ...data,
          payments: JSON.parse(data.payments), password: hashedPassword,
          access: 'partner', account: account,
          email_verified: false, pass_verified: true,
          oneClickToken: token.token, oneClickExpiration: token.expiresAt,
          slug: await createSlug(request),
          imageURL: `${process.env.API_URL}assets/profile/${user_id}${request.file.filename}`
        }).catch());
        if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

        await renameFile(
          path.join(__dirname, '../assets/profile/' + request.file.filename),
          path.join(__dirname, '../assets/profile/' + results._id + request.file.filename));

        request.params.email = data.email;
        response.locals = {
          res: {
            code: 200,
            body: {
              code: 200,
              data: {
                registration: true,
                oneClickToken: token.token
              },
            }
          },
          user: {
            user_id: results._id,
            access: 'partner',
            email: data.email,
            password: data.password
          }, account: account
        }
        next();
      }
    }

  private registerMember = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterUserWithoutPasswordDto = request.body;

    let authData = {};
    let tempPassword: string = '';
    let account: Account;

    if (((data.email) && (await this.user.findOne({ email: data.email }))) || ((data.card) && (await this.user.findOne({ card: data.card })))) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    if (data.email) {
      tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      //  account = serviceInstance.createWallet(tempPassword);
      account = serviceInstance.createWallet(data.email);

      authData = {
        ...data,
        ...{ access: 'member', password: hashedPassword, account: account, createdBy: request.user._id, email_verified: true, pass_verified: false }
      };
    } else {
      account = serviceInstance.createWallet(data.card);
      authData = {
        ...data,
        ...{ access: 'member', account: account, createdBy: request.user._id, email_verified: true, pass_verified: false }
      };
    }

    let error: Error, user: User;
    [error, user] = await to(this.user.create({
      ...authData
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals = {
      res: {
        code: 200,
        body: {
          // -- For Testing Purposes Only -- //
          tempData: { "password": tempPassword },
          // -- ////////////|\\\\\\\\\\\\ -- //
          message: "User has been Invited to enjoy our Community!",
          code: 200
        }
      }, user: {
        user_id: user._id,
        access: 'member',
        email: data.email,
        password: tempPassword || data.card
      }, account: account
    }
    next();
  }

  private registerPartner = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterPartnerWithoutPasswordDto = request.body;

    if (await this.user.findOne({ email: data.email })) {
      return next(new NotFoundException('USER_EXISTS'));
    }

    const tempPassword = this.generateToken(10, 1).token;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    //    const account: Account = serviceInstance.createWallet(tempPassword);
    const account: Account = serviceInstance.createWallet(data.email);

    let error: Error, user: User;
    [error, user] = await to(this.user.create({
      email: data.email,
      name: data.name,
      description: data.description,
      subtitle: data.subtitle,
      imageURL: `${process.env.API_URL}assets/profile/${request.file.filename}`,
      address: {
        street: data.street,
        city: data.city,
        postCode: data.postCode,
        coordinates: [data.lat, data.long]
      },
      timetable: data.timetable,
      contact: {
        phone: data.phone,
        websiteURL: data.websiteURL
      },
      payments: JSON.parse(data.payments),
      // payments: {
      //   nationalBank: data.nationalBank,
      //   pireausBank: data.pireausBank,
      //   eurobank: data.eurobank,
      //   alphaBank: data.alphaBank,
      //   paypal: data.paypal
      // },
      slug: await createSlug(request),
      sector: data.sector, access: 'partner',
      password: hashedPassword, account: account,
      createdBy: request.user._id,
      email_verified: true, pass_verified: false,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals = {
      res: {
        code: 200,
        body: {
          // -- For Testing Purposes Only -- //
          tempData: { "password": tempPassword },
          // -- ////////////|\\\\\\\\\\\\ -- //
          message: "User has been Invited to enjoy our Community!",
          code: 200
        }
      },
      user: {
        user_id: user._id,
        access: 'partner',
        email: data.email,
        password: tempPassword
      }, account: account,
      token: null
    }
    next();
  }

  private registerAccount = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data = response.locals;

    //  const newAccount = serviceInstance.unlockWallet(data.account, data.user.password);
    const newAccount = serviceInstance.unlockWallet(data.account, data.user.email || data.user.password);

    if (data.user.access === 'member') {
      await serviceInstance.getLoyaltyAppContract()
        .then((instance) => {
          return instance.methods['registerMember(address)'].sendTransaction(newAccount.address, serviceInstance.address)
            .then(async (result: any) => {
              await this.transaction.create({
                ...result,
                data: { user_id: data.user.user_id }, type: "RegisterMember"
              });
              next();
            })
            .catch((error: Error) => {
              next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
            })
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        })
    } else if (data.user.access === 'partner') {
      await serviceInstance.getLoyaltyAppContract()
        .then((instance) => {
          return instance.registerPartner(newAccount.address, serviceInstance.address)
            .then(async (result: any) => {
              await this.transaction.create({
                ...result,
                data: { user_id: data.user.user_id }, type: "RegisterPartner"
              });
              next();
            })
            .catch((error: Error) => {
              next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
            })
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        })
    }
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({
      email: data.email
    }).select({
      "_id": 1,
      "name": 1, "imageURL": 1,
      "email": 1, "password": 1,
      "email_verified": 1, "pass_verified": 1, "activated": 1,
      "access": 1,
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if ((!user) || !(await bcrypt.compare(data.password, user.password))) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    if (!user.activated) {
      response.status(202).send({
        data: { action: 'need_account_activation' },
        code: 202
      });
    } else if (!user.pass_verified) {
      response.status(202).send({
        data: { action: 'need_password_verification' },
        code: 202
      });
    } else if (!user.email_verified) {
      request.params.email = data.email;
      response.locals = {
        res: {
          code: 202,
          body: {
            code: 202,
            data: { action: 'need_email_verification' },
          }
        }
      }
      next();
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

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    if (parseInt((user.createdAt).getTime().toString()) < 1590318932724) {
      let account: Account = serviceInstance.lockWallet((serviceInstance.unlockWallet(user.account, data.oldPassword)).privateKey, user.email);
      user.account = account;
    }
    //  const account: Account = serviceInstance.lockWallet((serviceInstance.unlockWallet(user.account, data.oldPassword)).privateKey, data.newPassword);

    let error: Error, results: Object;
    [error, results] = await to(this.user.updateOne({
      _id: user._id
    }, {
      $set: {
        account: user.account,
        password: hashedPassword
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

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({
      email: email, email_verified: true, pass_verified: false
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if ((!user) || (!(await bcrypt.compare(data.oldPassword, user.password)))) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    //  const account = serviceInstance.lockWallet((serviceInstance.unlockWallet(user.account, data.oldPassword)).privateKey, data.newPassword)

    let results: Object;
    [error, results] = await to(this.user.updateOne({
      email: email
    }, {
      $set: {
        //      account: account,
        pass_verified: true,
        password: hashedPassword
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

    let error: Error, user: Member;
    [error, user] = await to(this.user.findOne({ email: email }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if ((!user) || (user && user.email_verified) || (user && !user.activated)) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));

    let results: Object;
    [error, results] = await to(this.user.updateOne({
      email: email
    }, {
      $set: {
        verificationToken: token.token,
        verificationExpiration: token.expiresAt
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals["res"] = (response.locals.res) ? {
      code: response.locals.res.code,
      body: {
        code: 200,
        data: response.locals.res.body.data,
        // -- For Testing Purposes Only -- //
        tempData: { "token": token.token },
        // -- ////////////|\\\\\\\\\\\\ -- //
      }
    } : {
        code: 200,
        body: {
          code: 200,
          message: "Please, follow your link to Validate your Email.",
          // -- For Testing Purposes Only -- //
          tempData: { "token": token.token },
          // -- ////////////|\\\\\\\\\\\\ -- //
        }
      }
    response.locals["user"] = {
      email: email
    };
    response.locals["token"] = token.token;

    next();
  }

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    if (!(await this.user.findOne({ verificationToken: data.token, verificationExpiration: { $gt: seconds }, email_verified: false, pass_verified: true }))) {
      return next(new NotFoundException("WRONG_TOKEN"));
    }

    let error: Error, results: Object;
    [error, results] = await to(this.user.updateOne({
      verificationToken: data.token
    }, {
      $set: {
        email_verified: true,
      },
      $unset: {
        verificationToken: "",
        verificationExpiration: "",
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

    let error: Error, user: Member;
    [error, user] = await to(this.user.findOne({ email: email }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if ((!user) || (user && !user.activated)) {
      return next(new NotFoundException('WRONG_CREDENTIALS'));
    }

    const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));

    let results: Object;
    [error, results] = await to(this.user.updateOne({
      email: email
    }, {
      $set: {
        restorationToken: token.token,
        restorationExpiration: token.expiresAt
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals = {
      res: {
        code: 200,
        body: {
          // -- For Testing Purposes Only -- //
          tempData: { "token": token.token },
          // -- ////////////|\\\\\\\\\\\\ -- //
          message: "Please, follow your link to Update your Password.",
          code: 200
        },
      },
      user: {
        email: email
      }, token: token.token
    };
    next();
  }

  private checkRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());
    if (!(await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: seconds } }))) {
      return next(new NotFoundException("WRONG_TOKEN"));
    }

    response.status(200).send({
      message: "Success! You may now proceed to Updating your password!",
      code: 200
    });
  }

  private recoverAccount = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data = response.locals;

    if (data.user.access === 'member') {
      await serviceInstance.getLoyaltyAppContract()
        .then((instance) => {
          return instance.recoverPoints(data.oldAccount.address, data.account.address, serviceInstance.address)
            .then(async (result: any) => {
              await this.transaction.create({
                ...result, type: "RecoverPoints"
              });
              next();
            })
            .catch((error: Error) => {
              next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
            })
        })
        .catch((error: Error) => {
          next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`))
        });
    } else if (data.user.access === 'partner') {

    }
    response.status(200).send({
      message: "Success! You Password has been Updated!",
      code: 200
    });
  }

  private changePassOutside = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassOutDto = request.body;

    if (data.newPassword !== data.verPassword) {
      return next(new NotFoundException("WRONG_CREDENTIALS"));
    }

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: seconds } }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    if (!user) {
      return next(new NotFoundException("WRONG_TOKEN"));
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    //  const account = serviceInstance.createWallet(data.newPassword)

    let results: Object;
    [error, results] = await to(this.user.updateOne({
      restorationToken: data.token
    }, {
      $set: {
        password: hashedPassword,
        //          account: account
      },
      // $push: {
      //   previousAccounts: user.account
      // },
      $unset: {
        restorationToken: "",
        restorationExpiration: ""
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    /*
        response.locals = {
          user: {
            user_id: user._id,
            access: user.access,
            email: user.email,
            password: data.newPassword
          }, account: account,
          oldAccount: user.account
        }
        next();
      */
    response.status(200).send({
      message: "Success! You Password has been Updated!",
      code: 200
    });
  }

  private deactivateAccount = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: DeactivatationDto = request.body;

    let error: Error, results: Object;
    [error, results] = await to(this.user.updateOne({
      _id: request.user._id
    }, {
      $set: {
        activated: false
      },
      $push: {
        deactivations: {
          reason: data.reason,
          createdAt: new Date()
        }
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.locals = {
      res: {
        code: 200,
        body: {
          message: "Your account has been successfully deactivated.",
          code: 200
        }
      },
      user: {
        email: request.user.email
      },
      reason: data.reason
    };
    next();
  }

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
    const expiresIn = parseInt(process.env.JWT_EXPIRATION); // an hour
    const secret = process.env.JWT_SECRET;
    const dataStoredInToken: DataStoredInToken = {
      _id: user._id,
    };
    return {
      expiresIn,
      token: jwt.sign(dataStoredInToken, secret, { expiresIn }),
    };
  }

}
export default AuthenticationController;
