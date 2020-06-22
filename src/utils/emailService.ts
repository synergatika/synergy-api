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
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';

class EmailService {

  private emailSender = (options: { type: any; locals: any; from: any; to: any; subject: any; }) => {
    return Promise.all([email.render(options.type, options.locals)])
      .then((template: object) => {
        const mailOptions: nodemailer.SendMailOptions = {
          from: options.from,
          // Dev
          //to: `${process.env.TEST_EMAIL}` || options.to,
          // Prod
          to: options.to,
          subject: options.subject,
          html: template.toString()
        };
        return Transporter.sendMail(mailOptions);
      })
  }

  /**
   *
   */
  public emailVerification = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: 'Email Verification',
      html: '',
      type: 'verification',
      locals: {
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/verify-email/${data.token}`
      },
    }
    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public passwordRestoration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: 'Password Restoration',
      html: '',
      type: 'restoration',
      locals: {
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/reset-password/${data.token}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public userRegistration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    if (data.user.email) {
      let options = {
        from: process.env.EMAIL_FROM,
        to: data.user.email,
        subject: 'New Account',
        html: '',
        type: 'registration',
        locals: {
          logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
          home_page: `${process.env.APP_URL}`,
          link: `${process.env.APP_URL}auth/login/`,
          password: data.user.password
        },
      }

      let error, results: object = {};
      [error, results] = await to(this.emailSender(options));
      if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));
    }
    response.status(data.res.code).send(data.res.body);
  }

  public accountReactivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: 'Account Activation',
      html: '',
      type: 'reactivation',
      locals: {
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/login/`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public accountDeactivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;

    let options = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_FROM,
      subject: 'Account Deactivation',
      html: '',
      type: 'deactivation',
      locals: {
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        email: data.user.email,
        reason: `${data.reason}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }
}
export default EmailService;
