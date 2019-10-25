import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import to from 'await-to-ts';

import Promise from 'bluebird';
const Email = require('email-templates');
const email = new Email();

// Exceptions
import NotFoundException from '../exceptions/NotFound.exception';
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../authInterfaces/dataStoredInToken';
import TokenData from '../authInterfaces/tokenData.interface';
import AuthTokenData from '../authInterfaces/authTokenData.interface';
import User from '../usersInterfaces/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Account from 'blockchainInterfaces/account.interface';

// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import accessMiddleware from '../middleware/access.middleware';
import authMiddleware from '../middleware/auth.middleware';
// Models
import userModel from '../models/user.model';
// Dtos
import AuthenticationDto from '../authDtos/authentication.dto';
import RegisterWithPasswordDto from '../authDtos/registerWithPassword.dto';
import RegisterWithOutPasswordDto from '../authDtos/registerWithOutPassword.dto';
import CheckTokenDto from '../authDtos/checkToken.dto'
import ChangePassInDto from '../authDtos/changePassIn.dto'
import ChangePassOutDto from '../authDtos/changePassOut.dto'
import EmailDto from '../authDtos/email.params.dto'
import AccessDto from '../authDtos/access.params.dto'

// Email
import Transporter from '../utils/mailer'
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService('localhost', '/mnt/c/Users/Dimitris Sociality/Documents/Project - Synergy API/synergy-api/dist', process.env.BLOCKCHAIN_OWNER_PK);

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationBodyMiddleware(RegisterWithPasswordDto),
      this.authRegister, this.registerAccount, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/authenticate`, validationBodyMiddleware(AuthenticationDto),
      this.authAuthenticate, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/logout`, authMiddleware, this.loggingOut);

    this.router.post(`${this.path}/register/:access`, authMiddleware, validationParamsMiddleware(AccessDto), accessMiddleware.registerWithoutPass, validationBodyMiddleware(RegisterWithOutPasswordDto),
      this.registerInside, this.registerAccount, this.emailSender);
    this.router.put(`${this.path}/set_pass/:email`, validationParamsMiddleware(EmailDto), validationBodyMiddleware(ChangePassInDto),
      this.changePassMiddle);

    this.router.put(`${this.path}/change_pass`, authMiddleware, validationBodyMiddleware(ChangePassInDto),
      this.changePassInside);

    this.router.get(`${this.path}/verify_email/:email`, validationParamsMiddleware(EmailDto),
      this.askVerification, this.emailSender);
    this.router.post(`${this.path}/verify_email`, validationBodyMiddleware(CheckTokenDto),
      this.checkVerification);

    this.router.get(`${this.path}/forgot_pass/:email`, validationParamsMiddleware(EmailDto),
      this.askRestoration, this.emailSender);
    this.router.post(`${this.path}/forgot_pass`, validationBodyMiddleware(CheckTokenDto),
      this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`, validationBodyMiddleware(ChangePassOutDto),
      this.changePassOutside);
  }

  private authRegister = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithPasswordDto = request.body;

    if (await this.user.findOne({ email: data.email })) {
      next(new NotFoundException('A user with these credentials already exists!'));
    } else {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const account: Account = this.createAccount(data.password);

      let error: Error, results: User;
      [error, results] = await to(this.user.create({
        ...data,
        access: 'customer',
        email_verified: false, pass_verified: true,
        password: hashedPassword,
        account: account
      }).catch());
      request.params.email = data.email;
      if (error) next(new UnprocessableEntityException('DB ERROR'));
      response.locals = {
        account: account,
        user: {
          email: data.email,
          password: data.password
        }
      }
      next();
    }
  }

  private createAccount(password: string): Account {
    const account: Account = serviceInstance.createWallet(password);
    return account;
  }

  private registerAccount = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    /* const data = response.locals;
 
     const newAccount = serviceInstance.unlockWallet(data.account, data.user.password);
     console.log(newAccount);
     console.log(data.account);
     console.log(serviceInstance.address);
     let error: Error, res;
     [error, res] = await to(serviceInstance.getLoyaltyAppContract()
       .then(instance => {
         console.log(typeof instance)
         console.log("Done")
         return instance.registerMember({ from: newAccount.address });
       })
       .catch(error => {
         console.log(error)
         console.log("Error");
         return new NotFoundException('Blockchain Problem');
       }));
     if (error) next(new UnprocessableEntityException("Blockchain Error"));
     console.log(error);
     console.log(res);
 */
    next();
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({
      email: data.email
    }, {
      name: false, imageURL: false,
      createdAt: false, updatedAt: false,
      contact: false, offers: false, campaigns: false,
      restorationToken: false, restorationExpiration: false,
      verificationToken: false, verificationExpiration: false
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    else if (user) {
      if (user.email_verified) {
        const isPasswordMatching = await bcrypt.compare(data.password, user.password);
        if (isPasswordMatching) {
          if (user.pass_verified) {
            user.password = undefined;
            response.status(200).send({
              data: {
                user: user,
                token: this.createToken(user)
              },
              code: 200
            });
          } else {
            response.status(204).send({
              message: "Please, update your password.",
              code: 204
            });
          }
        } else {
          next(new NotFoundException('Wrong Credentials.'));
        }
      } else {
        request.params.email = data.email;
        response.locals = {
          statusCode: 204
        }
        next();
      }
    } else {
      next(new NotFoundException('No user with these credentials.'));
    }
  }

  private loggingOut = (request: express.Request, response: express.Response) => {
    const token = {
      expiresIn: 0,
      token: ""
    }
    response.status(200).send(token);
  }

  private registerInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const accesss: AccessDto["access"] = request.params.access;
    const data: RegisterWithOutPasswordDto = request.body;

    if (await this.user.findOne({ email: data.email })) {
      next(new NotFoundException('A user with these credentials already exists!'));
    } else {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const account: Account = this.createAccount(tempPassword);

      let error: Error, user: User;
      [error, user] = await to(this.user.create({
        ...data,
        access: accesss,
        email_verified: true,
        pass_verified: false,
        password: hashedPassword,
        account: account
      }).catch());
      if (error) next(new UnprocessableEntityException('DB ERROR'));

      response.locals = {
        user: {
          name: data.name,
          email: data.email,
          password: tempPassword
        }, token: null, state: '3'
      }
      next();
    }
  }

  private changePassInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassInDto = request.body;

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({
      _id: request.user._id
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    else if (user) {
      const isPasswordMatching = await bcrypt.compare(data.oldPassword, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

        let error: Error, results: Object;
        [error, results] = await to(this.user.updateOne({
          _id: request.user._id
        }, {
          $set: {
            password: hashedPassword
          }
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        response.status(200).send({
          message: "Success! Your password has been Updated",
          code: 200
        });
      } else {
        next(new NotFoundException('Wrong Credentials.'));
      }
    } else {
      next(new NotFoundException('No user with these credentials.'));
    }
  }

  private changePassMiddle = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassInDto = request.body;
    const email: EmailDto["email"] = request.params.email;

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({
      email: email, pass_verified: false
    }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    else if (user) {
      const isPasswordMatching = await bcrypt.compare(data.oldPassword, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

        let error: Error, results: Object;
        [error, results] = await to(this.user.updateOne({
          email: email
        }, {
          $set: {
            pass_verified: true,
            password: hashedPassword
          }
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        response.status(200).send({
          message: "Success! Your password has been Updated",
          code: 200
        });
      } else {
        next(new NotFoundException('Wrong Credentials.'));
      }
    } else {
      next(new NotFoundException('No user with these credentials.'));
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.params.email;
    if (await this.user.findOne({ email: email, email_verified: false, pass_verified: true })) {
      const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));

      let error: Error, results: Object;
      [error, results] = await to(this.user.updateOne({
        email: email
      }, {
        $set: {
          verificationToken: token.token,
          verificationExpiration: token.expiresAt
        }
      }).catch());
      if (error) next(new UnprocessableEntityException('DB ERROR'));
      response.locals = {
        user: {
          email: email
        }, token: token.token, state: '1'
      };
      next();
    } else {
      next(new NotFoundException('No user with these credentials.'));
    }
  }

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;
    const now = new Date()
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({ verificationToken: data.token, verificationExpiration: { $gt: seconds }, email_verified: false, pass_verified: true })) {
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
      if (error) next(new UnprocessableEntityException('DB ERROR'));
      response.status(200).send({
        message: "Success! Your Email Address has been Verified",
        code: 200
      });
    } else {
      next(new NotFoundException("Link is wrong or has been expired"));
    }
  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.params.email;

    if (await this.user.findOne({ email: email })) {
      const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));

      let error: Error, results: Object;
      [error, results] = await to(this.user.updateOne({
        email: email
      }, {
        $set: {
          restorationToken: token.token,
          restorationExpiration: token.expiresAt
        }
      }).catch());
      if (error) next(new UnprocessableEntityException('DB ERROR'));
      response.locals = {
        user: {
          email: email
        }, token: token.token, state: '2'
      };
      next();
    } else {
      next(new NotFoundException('No user with these credentials.'));
    }
  }

  private checkRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;

    const now = new Date();
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: seconds } })) {
      response.status(200).send({
        message: "Success! You may now proceed to Updating your password!",
        code: 200
      });
    } else {
      next(new NotFoundException("Link is wrong or has been expired."));
    }
  }

  private changePassOutside = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassOutDto = request.body;
    const now = new Date();
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (data.newPassword === data.verPassword) {
      if (await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: seconds } })) {
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

        let error: Error, results: Object;
        [error, results] = await to(this.user.updateOne({
          restorationToken: data.token
        }, {
          $set: {
            password: hashedPassword
          },
          $unset: {
            restorationToken: "",
            restorationExpiration: ""
          }
        }).catch());
        if (error) next(new UnprocessableEntityException('DB ERROR'));
        response.status(200).send({
          message: "Success! You Password has been Updated!",
          code: 200
        });
      } else {
        next(new NotFoundException("Link is wrong or has been expired."));
      }
    } else {
      next(new NotFoundException("Password verification failed."));
    }
  }

  private generateToken(length: number, hours: number): AuthTokenData {
    let outString: string = '';
    let inOptions: string = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789';

    for (let i = 0; i < length; i++) {
      outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
    }

    let now = new Date()
    now.setHours(now.getHours() + hours);
    let seconds = Math.round(now.getTime() / 1000);

    return {
      token: outString,
      expiresAt: parseInt(seconds.toString())
    }
  }

  private emailSender = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data = response.locals;
    let emailInfo = {
      to: data.user.email,
      subject: "",
      // text: "",
      html: "<h3>Hello world?</h3><p>Test</p>",
      type: '',
      locals: {},
    };
    if (data.state === '1') { // Email Verification
      emailInfo.type = 'verification',
        emailInfo.locals = { email: data.user.email, token: data.token, link: `${process.env.APP_URL}` + 'verify/' + data.token },
        emailInfo.subject = "Email Verification";
      //  emailInfo.text = "Must Verify" + " | Token: " + data.token + " | Email: " + data.user.email + " | Link: " + "http://localhost:4200/verify/" + data.token
      // emailInfo.html = '<h4>Must Verify!</h4>' + '<p>' + 'Restore' + ' | Token: ' + data.token + ' | Email: '
      // + data.user.email + '</p>' + '<a href=' + '"' + `${process.env.APP_URL}` + 'verify/' + data.token + '"' + ' > ' + "Link" + ' </a>';
    } else if (data.state === '2') { // Password Restoration
      emailInfo.type = 'restoration',
        emailInfo.locals = { email: data.user.email, token: data.token, link: `${process.env.APP_URL}` + 'restore/' + data.token },
        emailInfo.subject = "Password Restoration";
      //  emailInfo.text = "Try Restore" + " | Token: " + data.token + " | Email: " + data.user.email + " | Link: " + "http://localhost:4200/restore/" + data.token
      //emailInfo.html = '<h4>Try Restore?</h4>' + '<p>' + 'Restore' + ' | Token: '
      //+ data.token + ' | Email: ' + data.user.email + '</p>' + '<a href=' + '"' + `${process.env.APP_URL}` + 'restore/' + data.token + '"' + '>' + "Link" + '</a>';
    } else if (data.state === '3') { // Email Invitation
      emailInfo.type = 'registration',
        emailInfo.locals = { email: data.user.email, password: data.user.password },
        emailInfo.subject = "New Account";
      //  emailInfo.text = "Your account" + " | Password: " + data.user.password + " | Email: " + data.user.email
      //emailInfo.html = '<h4>Password included! Change it for your safety</h4>' + '<p>' + 'Your account' + ' | Password: '
      //+ data.user.password + ' | Email: ' + data.user.email + '</p>';
    }



    let error, res: object = {};
    [error, res] = await to(Promise.all([email.render(emailInfo.type, emailInfo.locals)])
      .then((res: object) => {
        emailInfo.html = res.toString();
        var mailOptions: nodemailer.SendMailOptions = {
          from: process.env.EMAIL_FROM, //'Fred Foo ✔ <dimitris.sec@gmail.com>', // sender address
          to: 'dmytakis@gmail.com', // Dev
          //to: data.user.email, // Prod
          subject: emailInfo.subject, // Subject line
          // text: emailInfo.text, // plaintext body
          html: emailInfo.html // html body
        };
        return Transporter.sendMail(mailOptions);
      })
    );

    if (error) next(new NotFoundException('Email transmission failed'));
    else if (data.state === '1') { // Email Verification

      response.status(response.locals.statusCode || 200).send({
        // ---- // // For Testing Purposes Only
        tempData: { "token": data.token },
        // ---- //
        message: "Please, follow your link to Validate your Email.",
        code: response.locals.statusCode || 200
      });
    } else if (data.state === '2') { // Password Restoration
      response.status(200).send({
        // ---- // // For Testing Purposes Only
        tempData: { "token": data.token },
        // ---- //
        message: "Please, follow your link to Update your Password.",
        code: 200
      });
    } else if (data.state === '3') { // Email Invitation
      response.status(200).send({
        // ---- // // For Testing Purposes Only
        tempData: { "password": data.user.password },
        // ---- //
        message: "User has been Invited to enjoy our Community!",
        code: 200
      });
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
