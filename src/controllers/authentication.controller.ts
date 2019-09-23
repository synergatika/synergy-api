import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';

// Exceptions
import AuthenticationException from '../exceptions/AuthenticationException';
import DBException from '../exceptions/AuthenticationException';
// Interfaces
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../authInterfaces/dataStoredInToken';
import TokenData from '../authInterfaces/tokenData.interface';
import AuthTokenData from '../authInterfaces/authTokenData.interface';
import User from '../usersInterfaces/user.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
// Middleware
import validationMiddleware from '../middleware/validation.middleware';
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
import EmailDto from '../authDtos/email.dto'
// Email
import Transporter from '../utils/mailer'
import to from 'await-to-ts';
import UsersException from 'exceptions/UsersException';

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

    this.router.post(`${this.path}/register/:access`, authMiddleware, accessMiddleware.registerWithoutPass, validationMiddleware(RegisterWithOutPasswordDto), this.registerInside, this.emailSender);

    this.router.put(`${this.path}/change_pass`, authMiddleware, validationMiddleware(ChangePassInDto), this.changePassInside);

    this.router.get(`${this.path}/verify_email/:email`, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/verify_email`, validationMiddleware(CheckTokenDto), this.checkVerification);

    this.router.get(`${this.path}/forgot_pass/:email`, this.askRestoration, this.emailSender);
    this.router.post(`${this.path}/forgot_pass`, validationMiddleware(CheckTokenDto), this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`, validationMiddleware(ChangePassOutDto), this.changePassOutside);
  }

  private authRegister = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'A user with these credentials already exists!'));
    } else {
      const hashedPassword = await bcrypt.hash(data.password, 10);

      let error: Error, results: User;
      [error, results] = await to(this.user.create({
        ...data,
        access: 'customer',
        verified: 'false',
        password: hashedPassword,
      }).catch());
      if (error) next(new DBException(422, 'DB ERROR'));
      next();
    }
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;

    let error: Error, user: User;
    [error, user] = await to(this.user.findOne({
      email: data.email
    }, {
      offers: false
    }).catch());
    if (error) next(new DBException(422, 'DB ERROR'));
    else if (user) {
      if (user.verified) {
        const isPasswordMatching = await bcrypt.compare(data.password, user.password);
        if (isPasswordMatching) {
          user.password = undefined;
          response.status(200).send({
            data: {
              user: user,
              token: this.createToken(user)
            },
            message: "OK"
          });
        } else {
          next(new AuthenticationException(404, 'Wrong Credentials.'));
        }
      } else {
        next(this.askVerification);
      }
    } else {
      next(new AuthenticationException(404, 'No user with these credentials.'));
    }
  }

  private loggingOut = (request: express.Request, response: express.Response) => {
    response.setHeader('Set-Cookie', ['Authorization=;Max-age=0']);
    response.send(200);
  }

  private registerInside = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithOutPasswordDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      next(new AuthenticationException(404, 'A user with these credentials already exists!'));
    } else {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      let error: Error, user: User;
      [error, user] = await to(this.user.create({
        ...data,
        access: request.params.access,
        verified: 'true',
        password: hashedPassword
      }).catch());
      if (error) next(new DBException(422, 'DB ERROR'));
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
    if (error) next(new DBException(422, 'DB ERROR'));
    else if (user) {
      const isPasswordMatching = await bcrypt.compare(data.oldPassword, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

        let error: Error, results: Object;
        [error, results] = await to(this.user.updateOne({
          _id: request.user._id
        }, {
          password: hashedPassword
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
          data: {},
          message: "Success! Your password has been Updated"
        });
      } else {
        next(new AuthenticationException(404, 'Wrong Credentials.'));
      }
    } else {
      next(new AuthenticationException(404, 'There is no User with these credentials.'));
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email = request.params.email;
    if (await this.user.findOne({ email: email })) {
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
      if (error) next(new DBException(422, 'DB ERROR'));
      response.locals = {
        user: {
          email: email
        }, token: token.token, state: '1'
      };
      next();
    } else {
      next(new AuthenticationException(404, 'There is no User with these credentials.'));
    }
  }

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;
    const now = new Date()
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({ verificationToken: data.token, verificationExpiration: { $gt: seconds }, verified: false })) {
      let error: Error, results: Object;
      [error, results] = await to(this.user.updateOne({
        verificationToken: data.token
      }, {
        $set: {
          verified: true,
        },
        $unset: {
          verificationToken: "",
          verificationExpiration: "",
        }
      }).catch());
      if (error) next(new DBException(422, 'DB ERROR'));
      response.status(200).send({
        data: {},
        message: "Success! Your Email Address has been Verified"
      });
    } else {
      next(new AuthenticationException(404, "Link is wrong or has been expired"));
    }
  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email = request.params.email;
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
      if (error) next(new DBException(422, 'DB ERROR'));
      response.locals = {
        user: {
          email: email
        }, token: token.token, state: '2'
      };
      next();
    } else {
      next(new AuthenticationException(404, 'There is no User with these credentials.'));
    }
  }

  private checkRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: CheckTokenDto = request.body;
    const now = new Date();
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: seconds } })) {
      response.status(200).send({
        data: {},
        message: "Success! You may now proceed to Updating your password!"
      });
    } else {
      next(new AuthenticationException(404, "Link is wrong or has been expired."));
    }
  }

  private changePassOutside = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassOutDto = request.body;
    const now = new Date()
    const seconds = parseInt((Math.round(now.getTime() / 1000)).toString());

    if (data.newPassword === data.varPassword) {
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
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
          data: {},
          message: "Success! You Password has been Updated!"
        });
      } else {
        next(new AuthenticationException(404, "Link is wrong or has been expired."));
      }
    } else {
      next(new AuthenticationException(404, "Password verification failed."));
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

    let resEmail = {
      to: data.user.email,
      subject: "",
      text: "",
      html: ""
    };
    if (data.state === '1') { // Email Verification
      resEmail.subject = "Email Verification" + " | Token: " + data.token + " | Email: " + data.user.email,
        resEmail.text = "Must Verify",
        resEmail.html = '<b>Must Verify ✔</b>';
    } else if (data.state === '2') { // Password Restoration
      resEmail.subject = "Password Restoration" + " | Token: " + data.token + " | Email: " + data.user.email,
        resEmail.text = "Try Restore",
        resEmail.html = '<b>Try Restore ✔</b>';
    } else if (data.state === '3') { // Email Invitation
      resEmail.subject = "New Account" + " | Password: " + data.user.password + " | Email: " + data.user.email,
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
      else if (data.state === '1') { // Email Verification
        response.status(200).send({
          data: {},
          message: "Please, follow your link to Validate your Email."
        });
      } else if (data.state === '2') { // Password Restoration
        response.status(200).send({
          data: {},
          message: "Please, follow your link to Update your Password."
        });
      } else if (data.state === '3') { // Email Invitation
        response.status(200).send({
          data: { user: { name: data.user.name, email: data.user.email } },
          message: "User has been Invited to enjoy our Community!"
        });
      }
    });
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
