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
import to from 'await-to-ts';

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationBodyMiddleware(RegisterWithPasswordDto), this.authRegister, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/authenticate`, validationBodyMiddleware(AuthenticationDto), this.authAuthenticate, this.askVerification, this.emailSender);
    this.router.post(`${this.path}/logout`, authMiddleware, this.loggingOut);

    this.router.post(`${this.path}/register/:access`, authMiddleware, validationParamsMiddleware(AccessDto), accessMiddleware.registerWithoutPass, validationBodyMiddleware(RegisterWithOutPasswordDto), this.registerInside, this.emailSender);

    this.router.put(`${this.path}/change_pass`, authMiddleware, validationBodyMiddleware(ChangePassInDto), this.changePassInside);

    this.router.get(`${this.path}/verify_email/:email`, validationParamsMiddleware(EmailDto), this.askVerification, this.emailSender);
    this.router.post(`${this.path}/verify_email`, validationBodyMiddleware(CheckTokenDto), this.checkVerification);

    this.router.get(`${this.path}/forgot_pass/:email`, validationParamsMiddleware(EmailDto), this.askRestoration, this.emailSender);
    this.router.post(`${this.path}/forgot_pass`, validationBodyMiddleware(CheckTokenDto), this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`, validationBodyMiddleware(ChangePassOutDto), this.changePassOutside);

    // ---- // // For Testing Purposes Only
    this.router.put(`${this.path}/test/delete_users`, this.deleteTestUsers);
    // ---- //
  }

  // ---- // // For Testing Purposes Only
  private deleteTestUsers = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data = request.body;
    await this.user.deleteMany({ $or: [{ email: data.email1 }, { email: data.email2 }, { email: data.email3 }] });
    response.status(200).send({
      message: 'OK',
      code: 200
    })
  }
  // ---- //

  private authRegister = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: RegisterWithPasswordDto = request.body;
    //console.log(this.router);
    //console.log(data.email);

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
      request.params.email = data.email;


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
      name: false, imageURL: false,
      createdAt: false, updatedAt: false,
      contact: false, offers: false, campaigns: false,
      restorationToken: false, restorationExpiration: false,
      verificationToken: false, verificationExpiration: false
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
            code: 200
          });
        } else {
          next(new AuthenticationException(404, 'Wrong Credentials.'));
        }
      } else {
        request.params.email = data.email;
        next();
      }
    } else {
      next(new AuthenticationException(404, 'No user with these credentials.'));
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
      next(new AuthenticationException(404, 'A user with these credentials already exists!'));
    } else {
      const tempPassword = this.generateToken(10, 1).token;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      let error: Error, user: User;
      [error, user] = await to(this.user.create({
        ...data,
        access: accesss,
        verified: 'true',
        password: hashedPassword,
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
          $set: {
            password: hashedPassword
          }
        }).catch());
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
          message: "Success! Your password has been Updated",
          code: 200
        });
      } else {
        next(new AuthenticationException(404, 'Wrong Credentials.'));
      }
    } else {
      next(new AuthenticationException(404, 'No user with these credentials.'));
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const email: EmailDto["email"] = request.params.email;
    if (await this.user.findOne({ email: email, verified: false })) {
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
      next(new AuthenticationException(404, 'No user with these credentials.'));
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
        message: "Success! Your Email Address has been Verified",
        code: 200
      });
    } else {
      next(new AuthenticationException(404, "Link is wrong or has been expired"));
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
      if (error) next(new DBException(422, 'DB ERROR'));
      response.locals = {
        user: {
          email: email
        }, token: token.token, state: '2'
      };
      next();
    } else {
      next(new AuthenticationException(404, 'No user with these credentials.'));
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
      next(new AuthenticationException(404, "Link is wrong or has been expired."));
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
        if (error) next(new DBException(422, 'DB ERROR'));
        response.status(200).send({
          message: "Success! You Password has been Updated!",
          code: 200
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
    let emailInfo = {
      to: data.user.email,
      subject: "",
      // text: "",
      html: "<h3>Hello world?</h3><p>Test</p>"
    };
    if (data.state === '1') { // Email Verification
      emailInfo.subject = "Email Verification",
        //  emailInfo.text = "Must Verify" + " | Token: " + data.token + " | Email: " + data.user.email + " | Link: " + "http://localhost:4200/verify/" + data.token
        emailInfo.html = '<h4>Must Verify!</h4>' + '<p>' + 'Restore' + ' | Token: ' + data.token + ' | Email: ' + data.user.email + '</p>' + '<a href=' + '"http://localhost:4200/verify/' + data.token + '"' + '>' + "Link" + '</a>';
    } else if (data.state === '2') { // Password Restoration
      emailInfo.subject = "Password Restoration",
        //  emailInfo.text = "Try Restore" + " | Token: " + data.token + " | Email: " + data.user.email + " | Link: " + "http://localhost:4200/restore/" + data.token
        emailInfo.html = '<h4>Try Restore?</h4>' + '<p>' + 'Restore' + ' | Token: ' + data.token + ' | Email: ' + data.user.email + '</p>' + '<a href=' + '"http://localhost:4200/restore/' + data.token + '"' + '>' + "Link" + '</a>';
    } else if (data.state === '3') { // Email Invitation
      emailInfo.subject = "New Account",
        //  emailInfo.text = "Your account" + " | Password: " + data.user.password + " | Email: " + data.user.email
        emailInfo.html = '<h4>Password included! Change it for your safety</h4>' + '<p>' + 'Your account' + ' | Password: ' + data.user.password + ' | Email: ' + data.user.email + '</p>';
    }

    var mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_FROM, //'Fred Foo ✔ <dimitris.sec@gmail.com>', // sender address
      to: 'dmytakis@gmail.com', // Dev
      //to: data.user.email, // Prod
      subject: emailInfo.subject, // Subject line
      // text: emailInfo.text, // plaintext body
      html: emailInfo.html // html body
    };

    // send mail with defined transport object
    Transporter.sendMail(mailOptions, (error: Error, info: nodemailer.SentMessageInfo): void => {
      if (error) next(new AuthenticationException(404, 'Email transmission failed'));

      else if (data.state === '1') { // Email Verification
        response.status(200).send({
          // ---- // // For Testing Purposes Only
          tempData: { "token": data.token },
          // ---- //
          message: "Please, follow your link to Validate your Email.",
          code: 200
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
