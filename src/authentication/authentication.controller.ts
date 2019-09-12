import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import AuthenticationException from '../exceptions/AuthenticationException';
import Controller from '../interfaces/controller.interface';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import TokenData from '../interfaces/tokenData.interface';
import validationMiddleware from '../middleware/validation.middleware';
import authMiddleware from '../middleware/auth.middleware';
import CreateUserDto from '../users/user.dto';
import User from '../users/user.interface';
import userModel from './../users/users.model';
import LogInDto from './logIn.dto';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import ChangePassDto from './changePass.dto'
import * as to from 'await-to-ts'

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(CreateUserDto), this.authRegister);
    this.router.post(`${this.path}/authenticate`, validationMiddleware(LogInDto), this.authAuthenticate);
    this.router.put(`${this.path}/change_pass`, authMiddleware, validationMiddleware(ChangePassDto), this.changePassInside);
    this.router.put(`${this.path}/forgot_pass`, this.askRestoration);
    this.router.post(`${this.path}/logout`, this.loggingOut);
  }

  private authAuthenticate = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: LogInDto = request.body;
    const user = await this.user.findOne({ email: data.email });
    if (user) {
    //  if (user.verify) {
        const isPasswordMatching = await bcrypt.compare(data.password, user.password);
        if (isPasswordMatching) {
          user.password = user.restoreExpiration = user.restoreToken = undefined;
          const tokenData = this.createToken(user);
          response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
          response.send(user);
        } else {
          next(new AuthenticationException(404, 'Wrong Credentials'));
        }
    //  } else {
    //    next(new AuthenticationException(404, 'You need to verify email. We send you email'));
    //  }
    } else {
      next(new AuthenticationException(404, 'No user with this credentials'));
    }
  }

  private authRegister = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    // if (request.user) -> userData.type = undefined -> type=suporter
    const data: CreateUserDto = request.body;
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
    let token = {
      token: "AbCDeFgHIJ123456789",
      expiresIn: (new Date).setHours((new Date).getHours() + hours)
    }
    return token;
  }

  private emailSender = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

  }

  private askRestoration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: LogInDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token: TokenData = await this.generateToken(10, 1);
      this.user.findByIdAndUpdate(
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
            next(this.emailSender);
            //response.send(user);
          } else {
            next(new AuthenticationException(404, 'No user'));
          }
        });
    } else {
      next(new AuthenticationException(404, 'Something Wrong!'));
    }
  }

  private askVerification = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: LogInDto = request.body;
    if (await this.user.findOne({ email: data.email })) {
      const token: TokenData = await this.generateToken(10, 1);
      this.user.findByIdAndUpdate(
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

  private checkRestorationToken = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data = request.body;
    if (await this.user.findOne({ restorationToken: data.token, restorationExpiration: { $gt: (new Date) } })) {
      response.send("ok");
    } else {
      next(new AuthenticationException(404, "Expired or wrong link"));
    }
  }

  private checkVerificationToken = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data = request.body;
    if (await this.user.findOne({ restoreToken: data.token, restoreExpiration: { $gt: (new Date) } })) {
      const user = await this.user.findOneAndUpdate(
        { verificationToken: data.token },
        {
          $set: {
            verify: true,
          },
          $unset: {
            verificationToken: "",
            verificationExpiration: "",
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
    const data: ChangePassDto = request.body;
    const user = await this.user.findOne({ _id: request.user._id });
    if (user) {
      const isPasswordMatching = await bcrypt.compare(data.password, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const hashedPassword = await bcrypt.hash(data.new, 10);
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
    const data = request.body;
    if (await this.user.findOne({ restoreToken: data.token, restoreExpiration: { $gt: (new Date) } })) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await this.user.findOneAndUpdate(
        { restoreToken: data.token },
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
      response.send(user);
    } else {
      next(new AuthenticationException(404, "wrong or expired link"));
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
