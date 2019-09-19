import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';

// Exceptions
import AuthenticationException from '../exceptions/AuthenticationException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../authInterfaces/dataStoredInToken';
import TokenData from '../authInterfaces/tokenData.interface';
import AuthTokenData from '../authInterfaces/authTokenData.interface';
import User from '../usersInterfaces/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
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
import EmailDto from '../authDtos/email.dto'
// Email
import Transporter from '../utils/mailer'

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(RegisterWithPasswordDto), this.authRegister, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/authenticate`, validationMiddleware(AuthenticationDto), this.authAuthenticate);
    this.router.post(`${this.path}/logout`, authMiddleware, this.loggingOut);

    this.router.post(`${this.path}/register/:access`, authMiddleware, validationMiddleware(RegisterWithOutPasswordDto), this.registerInside, this.emailSender);

    //this.router.post(`${this.path}/register/customer`, validationMiddleware(RegisterWithOutPasswordDto), this.registerCustomer, this.emailSender);
    //this.router.post(`${this.path}/register/merchant`, validationMiddleware(RegisterWithOutPasswordDto), this.registerMerchant, this.emailSender);

    this.router.put(`${this.path}/change_pass`, authMiddleware, validationMiddleware(ChangePassInDto), this.changePassInside);

    this.router.get(`${this.path}/verify_email`, validationMiddleware(EmailDto), this.askVerification, this.emailSender);
    this.router.post(`${this.path}/verify_email`, validationMiddleware(CheckTokenDto), this.checkVerification);

    this.router.get(`${this.path}/forgot_pass`, validationMiddleware(EmailDto), this.askRestoration, this.emailSender);
    this.router.post(`${this.path}/forgot_pass`, validationMiddleware(CheckTokenDto), this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`, validationMiddleware(ChangePassOutDto), this.changePassOutside);
  }

  private authRegister = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'User with that credential already exists'));
    } else {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      this.user.create({
        ...data,
        access: 'customer',
        verified: 'false',
        password: hashedPassword,
      }, (error: Error, results: User): void => {
        if (error) next(new AuthenticationException(422, 'DB Error'));
        next();
      });
    }
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;
    const user = await this.user.findOne({ email: data.email }, {offers:false});
    if (user) {
      if (user.verified) {
        const isPasswordMatching = await bcrypt.compare(data.password, user.password);
        if (isPasswordMatching) {
          user.password = undefined;
          const tokenData = this.createToken(user);
          response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
          response.send(user);
        } else {
          next(new AuthenticationException(404, 'Wrong Credentials'));
        }
      } else {
        next(this.askVerification);
      }
    } else {
      next(new AuthenticationException(404, 'No user with this credentials'));
    }
  }

  private loggingOut = (request: express.Request, response: express.Response) => {
    response.setHeader('Set-Cookie', ['Authorization=;Max-age=0']);
    response.send(200);
  }

  private registerInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithOutPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'Already Exists!'));
    } else {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      this.user.create({
        ...data,
        access: request.params.access,
        verified: 'true',
        password: hashedPassword
      }, (error: Error, results: User): void => {
        if (error) next(new AuthenticationException(404, 'DB Error'));
        response.locals = {
          user: {
            name: data.name,
            email: data.email,
            password: tempPassword
          }, token: null, state: '3'
        }
        next();
      });
    }
  }
/*
  private registerCustomer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithOutPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'Already Exists!'));
    } else {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      this.user.create({
        ...data,
        access: 'customer',
        verified: 'true',
        password: hashedPassword
      }, (error: Error, results: User): void => {
        if (error) next(new AuthenticationException(404, 'DB Error'));
        response.locals = {
          user: {
            name: data.name,
            email: data.email,
            password: tempPassword
          }, token: null, state: '3'
        }
        next();
      });
    }
  }

  private registerMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithOutPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'Already Exists!'));
    } else {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      this.user.create({
        ...data,
        access: 'merchant',
        verified: 'true',
        password: hashedPassword,
      }, (error: Error, results: User): void => {
        if (error) next(new AuthenticationException(404, 'Something Wrong DB'))
        response.locals = {
          user: {
            name: data.name,
            email: data.email,
            password: tempPassword
          }, token: null, state: '3'
        };
        next();
      })
    }
  }
*/
  private changePassInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassInDto = request.body;
    const user = await this.user.findOne({ _id: request.user._id });
    if (user) {
      const isPasswordMatching = await bcrypt.compare(data.oldPassword, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        this.user.findByIdAndUpdate(
          {
            _id: request.user._id
          },
          {
            password: hashedPassword
          }, (error: Error, results: any): void => {
            if (error) next(new AuthenticationException(404, 'No User'));
            user.password = undefined;
            response.send({ "message": "Your password has been updated!" });
          });
      }
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: EmailDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));
      this.user.findOneAndUpdate(
        {
          email: data.email
        },
        {
          $set: {
            verificationToken: token.token,
            verificationExpiration: token.expiresAt
          }
        }, (error: Error, results: any): void => {
          if (error) next(new AuthenticationException(422, 'DB ERROR'));
          response.locals = {
            user: {
              email: data.email
            }, token: token.token, state: '1'
          };
          next();
        });
    } else {
      next(new AuthenticationException(404, 'No user'));
    }
  }

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;
    const now = new Date()
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({
      verificationToken: data.token,
      verificationExpiration: { $gt: seconds },
      verified: false
    })) {
      this.user.findOneAndUpdate(
        { verificationToken: data.token },
        {
          $set: {
            verified: true,
          },
          $unset: {
            verificationToken: "",
            verificationExpiration: "",
          }
        }, (error: Error, results: any): void => {
          if (error) next(new AuthenticationException(422, 'DB ERROR'));
          response.send({ "message": "Now, you can access our app! Just log in!" });
        });
    } else {
      next(new AuthenticationException(404, "wrong or expired link"));
    }
  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: EmailDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));
      this.user.findOneAndUpdate(
        {
          email: data.email
        },
        {
          $set: {
            restorationToken: token.token,
            restorationExpiration: token.expiresAt
          }
        }, (error: Error, results: any): void => {
          if (error) next(new AuthenticationException(422, 'DB ERROR'));
          response.locals = {
            user: {
              email: data.email
            }, token: token.token, state: '2'
          };
          next();
        })
    } else {
      next(new AuthenticationException(404, 'There is no user registered with that email!'));
    }
  }

  private checkRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;
    const now = new Date();
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({
      restorationToken: data.token,
      restorationExpiration: { $gt: seconds }
    })) {
      response.send({ "message": "Now, please type and verify a new password!" });
    } else {
      next(new AuthenticationException(404, "Expired or wrong link"));
    }
  }

  private changePassOutside = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassOutDto = request.body;
    const now = new Date()
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (data.newPassword === data.varPassword) {
      if (await this.user.findOne({
        restorationToken: data.token,
        restorationExpiration: { $gt: seconds }
      })) {
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        this.user.findOneAndUpdate(
          { restorationToken: data.token },
          {
            $set: {
              password: hashedPassword
            },
            $unset: {
              restorationToken: "",
              restorationExpiration: ""
            }
          }, (error: Error, results: any): void => {
            if (error) next(new AuthenticationException(422, 'DB ERROR'));
            response.send({ "message": "Your password has been updated! Please log in using your new credentials" });
          });
      } else {
        next(new AuthenticationException(404, "wrong or expired link"));
      }
    } else {
      next(new AuthenticationException(404, "passwords do not match"));
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
    const resData = response.locals;

    let resEmail = {
      to: resData.user.email,
      subject: "",
      text: "",
      html: ""
    };
    if (resData.state === '1') { // Email Verification
      resEmail.subject = "Email Verification" + " " + resData.token,
        resEmail.text = "Must Verify",
        resEmail.html = '<b>Must Verify ✔</b>';
    } else if (resData.state === '2') { // Password Restore
      resEmail.subject = "Password Restoration" + " " + resData.token,
        resEmail.text = "Try Restore",
        resEmail.html = '<b>Try Restore ✔</b>';
    } else if (resData.state === '3') { // Invite an merchant or a customer
      resEmail.subject = "An account has been created for you" + " " + resData.user.password,
        resEmail.text = "Your account",
        resEmail.html = '<b>Password included! Change it for your safety ✔</b>';
    }

    var mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_FROM, //'Fred Foo ✔ <dimitris.sec@gmail.com>', // sender address
      to: 'dmytakis@gmail.com', // list of receivers
      subject: resEmail.subject, // Subject line
      text: resEmail.text, // plaintext body
      html: resEmail.html // html body
    };

    // send mail with defined transport object
    Transporter.sendMail(mailOptions, (error: Error, info: nodemailer.SentMessageInfo): void => {
      if (error) next(new AuthenticationException(404, 'Email Fail'));
      response.send(info);
    });
  }

  private createCookie(tokenData: TokenData) {
    return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn}`;
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
