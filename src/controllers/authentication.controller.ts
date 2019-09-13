import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import AuthenticationException from '../exceptions/AuthenticationException';
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import TokenData from '../interfaces/tokenData.interface';
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

//import * as to from 'await-to-ts'
import { AES } from 'crypto-ts';

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(RegisterWithPasswordDto), this.authRegister);
    this.router.post(`${this.path}/authenticate`, validationMiddleware(AuthenticationDto), this.authAuthenticate);
    this.router.put(`${this.path}/change_pass`, authMiddleware, validationMiddleware(ChangePassInDto), this.changePassInside);
    this.router.get(`${this.path}/verify_email`, this.askVerification);
    this.router.post(`${this.path}/verify_email`, this.checkVerification);
    this.router.get(`${this.path}/forgot_pass`, this.askRestoration);
    this.router.post(`${this.path}/forgot_pass`, this.checkRestoration);
    this.router.put(`${this.path}/forgot_pass`, validationMiddleware(ChangePassOutDto), this.changePassOutside);
    this.router.post(`${this.path}/logout`, this.loggingOut);
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: AuthenticationDto = request.body;
    const user = await this.user.findOne({ email: data.email });
    if (user) {
      if (user.verify) {
        const isPasswordMatching = await bcrypt.compare(data.password, user.password);
        if (isPasswordMatching) {
          user.password = user.auth = undefined;
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
    if (request.user.type === "merchant") {
      if (await this.user.findOne({ email: data.email })) {
        next(new AuthenticationException(404, 'Already Exists!'));
      } else {
        const hashedPassword = await bcrypt.hash(this.generateToken(10, 1).token, 10);
        const user = await this.user.create({
          ...data,
          password: hashedPassword,
        })
        next(this.emailSender);
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
        const hashedPassword = await bcrypt.hash(this.generateToken(10, 1).token, 10);
        const user = await this.user.create({
          ...data,
          password: hashedPassword,
        })
        next(this.emailSender);
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
        password: hashedPassword,
      });
      user.password = undefined;
      const tokenData = this.createToken(user);
      response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
      response.send(user);
    }
  }

  private generateToken(length: number, hours: number): TokenData {
    let outString: string = '';
    let inOptions: string = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789';

    for (let i = 0; i < length; i++) {
      outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
    }

    let token = {
      token: outString,
      expiresIn: (new Date).setHours((new Date).getHours() + hours)
    }
    return token;
  }

  private emailSender = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: EmailDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token: TokenData = this.generateToken(32, 1);
      this.user.findOneAndUpdate(
        {
          email: data.email
        },
        {
          $set: {
            auth: {
              restorationToken: token.token,
              restorationExpiration: token.expiresIn
            }
          }
        })
        .then((user) => {
          if (user) {
            //next(this.emailSender);
            response.send(token);
          } else {
            next(new AuthenticationException(404, 'No user'));
          }
        });
    } else {
      next(new AuthenticationException(404, 'Something Wrong!'));
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: EmailDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token: TokenData = this.generateToken(10, 6);
      this.user.findByIdAndUpdate(
        {
          email: data.email
        },
        {
          $set: {
            auth: {
              verificationToken: token.token,
              verificationExpiration: token.expiresIn
            }
          }
        })
        .then((user) => {
          if (user) {
            next(this.emailSender);
            //response.send(user);
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
    if (await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: (Date.now()) } })) {
      response.send({ "message": "Now update your pass" });
    } else {
      next(new AuthenticationException(404, "Expired or wrong link"));
    }
  }

  private checkVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: TokenData = request.body;
    if (await this.user.findOne({
      verificationToken: data.token,
      verificationExpiration: { $gt: (Date.now()) },
      verify: false
    })) {
      const user = await this.user.findOneAndUpdate(
        { verificationToken: data.token },
        {
          $set: {
            verify: true,
          },
          $unset: {
            auth: {
              verificationToken: "",
              verificationExpiration: "",
            }
          }
        }
      )
      user.password = undefined;
      response.send(user);
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
              response.send(user);
            } else {
              next(new AuthenticationException(404, 'No User'));
            }
          });
      }
    }
  }

  private changePassOutside = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: ChangePassOutDto = request.body;
    if (data.newPassword === data.varPassword) {
      if (await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: (Date.now()) } })) {
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        const user = await this.user.findOneAndUpdate(
          { restoreToken: data.token },
          {
            $set: {
              password: hashedPassword
            },
            $unset: {
              auth: {
                restorationToken: "",
                restorationExpiration: ""
              }
            }
          }
        )
        user.password = undefined;
        response.send(user);
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
    const expiresIn = 60 * 60; // an hour
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
