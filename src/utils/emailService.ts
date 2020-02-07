import { NextFunction, Response } from 'express';
import * as nodemailer from 'nodemailer';
import to from 'await-to-ts';
var path = require('path');
import Promise from 'bluebird';

// Email
import Transporter from '../utils/mailer'
const Email = require('email-templates');
const email = new Email();

// Exceptions
import NotFoundException from '../exceptions/NotFound.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';

class EmailService {

  private emailSender = (options: { type: any; locals: any; from: any; to: any; subject: any; }) => {
    return Promise.all([email.render(options.type, options.locals)])
      .then((template: object) => {
        const mailOptions: nodemailer.SendMailOptions = {
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: template.toString()
        };
        return Transporter.sendMail(mailOptions);
      })
  }

  // public userInvitation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   let options = {
  //     from: process.env.EMAIL_FROM,
  //     to: 'dmytakis@gmail.com', // data.user.email
  //     subject: 'User Invitation',
  //     html: '',
  //     type: 'invitation',
  //     locals: { logo_url: `${process.env.API_URL}assets/logo.png`, home_page: `${process.env.APP_URL}`, link: `${process.env.APP_URL}auth/login/` },
  //   }
  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) next(new NotFoundException('Sending Email Fail'));
  //   response.status(200).send({
  //     message: "Your friend has been invited.",
  //     code: response.locals.statusCode || 200
  //   })
  // }

  public emailVerification = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    let options = {
      from: process.env.EMAIL_FROM,
      to: 'dmytakis@gmail.com', // data.user.email
      subject: 'Email Verification',
      html: '',
      type: 'verification',
      locals: { logo_url: `${process.env.API_URL}assets/logo.png`, home_page: `${process.env.APP_URL}`, link: `${process.env.APP_URL}auth/verify-email/${data.token}` },
    }
    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) next(new NotFoundException('Sending Email Fail'));
    response.status(200).send({
      // -- For Testing Purposes Only -- //
      tempData: { "token": data.token },
      // -- ////////////|\\\\\\\\\\\\ -- //
      message: response.locals.message || "Please, follow your link to Validate your Email.",
      code: response.locals.statusCode || 200
    })
  }

  public passwordRestoration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    let options = {
      from: process.env.EMAIL_FROM,
      to: 'dmytakis@gmail.com', // data.user.email
      subject: 'Password Restoration',
      html: '',
      type: 'restoration',
      locals: { logo_url: `${process.env.API_URL}assets/logo.png`, home_page: `${process.env.APP_URL}`, link: `${process.env.APP_URL}auth/reset-password/${data.token}` },
    }
    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) next(new NotFoundException('Sending Email Fail'));
    response.status(200).send({
      // -- For Testing Purposes Only -- //
      tempData: { "token": data.token },
      // -- ////////////|\\\\\\\\\\\\ -- //
      message: "Please, follow your link to Update your Password.",
      code: 200
    });
  }

  public userRegistration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    if (data.user.email) {
      let options = {
        from: process.env.EMAIL_FROM,
        to: 'dmytakis@gmail.com', // data.user.email
        subject: 'New Account',
        html: '',
        type: 'registration',
        locals: { logo_url: `${process.env.API_URL}assets/logo.png`, home_page: `${process.env.APP_URL}`, link: `${process.env.APP_URL}auth/login/`, password: data.user.password },
      }
      let error, results: object = {};
      [error, results] = await to(this.emailSender(options));
      if (error) next(new NotFoundException('Sending Email Fail'));

      response.locals.response = {
        tempData: { "password": data.user.password },
        message: "User has been Invited to enjoy our Community!",
        code: 200
      }
    }
    next();
  }
}
export default EmailService;
