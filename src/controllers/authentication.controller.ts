import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';

import AuthenticationException from '../exceptions/AuthenticationException';
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import TokenData from '../interfaces/tokenData.interface';
import AuthTokenData from '../authDtos/authTokenData.interface';
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import User from '../users/user.interface';
import userModel from '../users/users.model';
import AuthenticationDto from '../authDtos/authentication.dto';
import RegisterWithPasswordDto from '../authDtos/registerWithPassword.dto';
import RegisterWithOutPasswordDto from '../authDtos/registerWithOutPassword.dto';
import ChangePassInDto from '../authDtos/changePassIn.dto'
import ChangePassOutDto from '../authDtos/changePassOut.dto'
import EmailDto from '../authDtos/email.dto'

import RequestWithUser from '../interfaces/requestWithUser.interface';
import Transporter from '../utils/mailer'
import SendmailTransport from 'nodemailer/lib/sendmail-transport';

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
    this.router.put(`${this.path}/change_pass`, authMiddleware, validationMiddleware(ChangePassInDto), this.changePassInside);
    this.router.get(`${this.path}/verify_email`, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/verify_email`, this.checkVerification);
    this.router.get(`${this.path}/forgot_pass`, this.askRestoration, this.emailSender);
    this.router.post(`${this.path}/forgot_pass`, this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`, validationMiddleware(ChangePassOutDto), this.changePassOutside);
    this.router.post(`${this.path}/logout`, this.loggingOut);

    this.router.post(`${this.path}/register/customer`, validationMiddleware(RegisterWithOutPasswordDto), this.registerCustomer, this.emailSender);
    this.router.post(`${this.path}/register/merchant`, validationMiddleware(RegisterWithOutPasswordDto), this.registerMerchant, this.emailSender);

  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;
    const user = await this.user.findOne({ email: data.email });
    if (user) {
      if (user.verified) {
        const isPasswordMatching = await bcrypt.compare(data.password, user.password);
        if (isPasswordMatching) {
          user.password = user.restorationExpiration = undefined;
          const tokenData = this.createToken(user);
          response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
          response.send(user);
        } else {
          next(new AuthenticationException(404, 'Wrong Credentials'));
        }
      } else {
        next(new AuthenticationException(404, 'You need to verify email. We send you email'));
      }
    } else {
      next(new AuthenticationException(404, 'No user with this credentials'));
    }
  }

  private registerCustomer = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithOutPasswordDto = request.body;
    if ((request.user.access === 'merchant') || (request.user.access === 'admin')) {
      if (await this.user.findOne({ email: data.email })) {
        next(new AuthenticationException(404, 'Already Exists!'));
      } else {
        const tempPassword = this.generateToken(10, 1).token;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const user = await this.user.create({
          ...data,
          access: 'customer',
          verified: 'true',
          password: hashedPassword,
        })
        response.locals.user = {
          name: data.name,
          email: data.email,
          password: tempPassword
        }
        response.locals.state = 3;
        next();
      }
    } else {
      next(new AuthenticationException(404, 'Not Authorized'));
    }
  }

  private registerMerchant = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithOutPasswordDto = request.body;
    if (request.user.access === "admin") {
      if (await this.user.findOne({ email: data.email })) {
        next(new AuthenticationException(404, 'Already Exists!'));
      } else {
        const tempPassword = this.generateToken(10, 1).token;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const user = await this.user.create({
          ...data,
          access: 'merchant',
          verified: 'true',
          password: hashedPassword,
        })
        response.locals.user = {
          name: data.name,
          email: data.email,
          password: tempPassword
        }
        response.locals.state = 3;
        next();
      }
    } else {
      next(new AuthenticationException(404, 'Not Authorized'));
    }
  }

  private authRegister = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'User with that credential already exists'));
    } else {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await this.user.create({
        ...data,
        access: 'customer',
        verified: 'false',
        password: hashedPassword,
      });
      user.password = undefined;
      response.locals = user;
      next();
      // const tokenData = this.createToken(user);
      // response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
      // response.send(user);
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

    let token = {
      token: outString,
      expiresIn: parseInt(seconds.toString())
    }
    return token;
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
      resEmail.subject = "Email Verification" + " " + resData.token.token,
        resEmail.text = "Must Verify",
        resEmail.html = '<b>Must Verify ✔</b>';
    } else if (resData.state === '2') { // Password Restore
      resEmail.subject = "Password Restoration",
        resEmail.text = "Try Restore",
        resEmail.html = '<b>Try Restore ✔</b>';
    } else if (resData.state === '3') { // Invite an merchant or a customer
      resEmail.subject = "An account has been created for you" + " " + resData.user.password,
        resEmail.text = "Your account",
        resEmail.html = '<b>Try Restore ✔</b>';
    }

    var mailOptions: nodemailer.SendMailOptions = {
      from: 'Fred Foo ✔ <dimitris.sec@gmail.com>', // sender address
      to: 'dmytakis@gmail.com', // list of receivers
      subject: resEmail.subject, // Subject line
      text: resEmail.text, // plaintext body
      html: resEmail.html // html body
    };

    console.log(response.locals.token);
    console.log(response.locals.user);
    console.log(response.locals.state);
    // send mail with defined transport object
    Transporter.sendMail(mailOptions, (error: Error, info: nodemailer.SentMessageInfo): void => {
      if (error) {
        next(new AuthenticationException(404, 'Email Fail'));
      } else {
        response.send(info);
      }
    });
  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: EmailDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token: AuthTokenData = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));
      this.user.findOneAndUpdate(
        {
          email: data.email
        },
        {
          $set: {
            restorationToken: token.token,
            restorationExpiration: token.expiresIn
          }
        })
        .then((user) => {
          if (user) {
            response.locals.user.email = data.email;
            response.locals = token;
            next();
          } else {
            next(new AuthenticationException(404, 'No user'));
          }
        });
    } else {
      next(new AuthenticationException(404, 'There is no user registered with that email!'));
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: EmailDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token: AuthTokenData = this.generateToken(parseInt(process.env.TOKEN_LENGTH), parseInt(process.env.TOKEN_EXPIRATION));
      this.user.findOneAndUpdate(
        {
          email: data.email
        },
        {
          $set: {
            verificationToken: token.token,
            verificationExpiration: token.expiresIn
          }
        })
        .then((user) => {
          if (user) {
            response.locals.token = token;
            response.locals.user.email = data.email;
            response.locals.state = '1';

            next();
          } else {
            next(new AuthenticationException(404, 'No user'));
          }
        });
    } else {
      next(new AuthenticationException(404, 'No user'));
    }
  }

  private checkRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: TokenData = request.body;
    const now = new Date()
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

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: TokenData = request.body;
    const now = new Date()
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({
      verificationToken: data.token,
      verificationExpiration: { $gt: seconds },
      verified: false
    })) {
      const user = await this.user.findOneAndUpdate(
        { verificationToken: data.token },
        {
          $set: {
            verified: true,
          },
          $unset: {
            verificationToken: "",
            verificationExpiration: "",
          }
        }
      )
      user.password = undefined;
      response.send({ "message": "Now, you can access our app! Just log in!" });
    } else {
      next(new AuthenticationException(404, "wrong or expired link"));
    }
  }

  private changePassInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassInDto = request.body;
    const user = await this.user.findOne({ _id: request.user._id });
    if (user) {
      const isPasswordMatching = await bcrypt.compare(data.oldPassword, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        this.user.findByIdAndUpdate({ _id: request.user._id }, { password: hashedPassword })
          .then((user) => {
            if (user) {
              user.password = undefined;
              response.send({ "message": "Your password has been updated!" });
            } else {
              next(new AuthenticationException(404, 'No User'));
            }
          });
      }
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
        const user = await this.user.findOneAndUpdate(
          { restorationToken: data.token },
          {
            $set: {
              password: hashedPassword
            },
            $unset: {
              restorationToken: "",
              restorationExpiration: ""
            }
          }
        )
        user.password = undefined;
        response.send({ "message": "Your password has been updated! Please log in using your new credentials" });
      } else {
        next(new AuthenticationException(404, "wrong or expired link"));
      }
    } else {
      next(new AuthenticationException(404, "passwords do not match"));
    }

  }

  private loggingOut = (request: express.Request, response: express.Response) => {
    response.setHeader('Set-Cookie', ['Authorization=;Max-age=0']);
    response.send(200);
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