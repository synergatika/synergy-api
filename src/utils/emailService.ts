import { NextFunction, Response } from 'express';
import * as nodemailer from 'nodemailer';
import to from 'await-to-ts';
var path = require('path');

// .env File
import 'dotenv/config';
import validateEnv from '../utils/validateEnv';
validateEnv();

import Promise from 'bluebird';

// Email
import Transporter from '../utils/mailer'
const Email = require('email-templates');
const email = new Email();

// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';

import Translation from '../translation';
class EmailService {


  /** To add */
  // Email: To member (when orders a microcredit campaign).
  // Email: To partner (when a member orders a microcredit campaign).
  // Email: To member (when a campaign status has change - order or paid).
  // Email: To member (when the redeeming period starts).
  // Email: To member (when the redeeming period ends).
  // Email: To member (when redeem an order or part of an order).


  private translation = (lang: string) => {
    return (new Translation).content[lang];
  }

  private emailSender = (options: { type: any; locals: any; from: any; to: any; subject: any; }) => {
    return Promise.all([email.render(options.type, options.locals)])
      .then((template: object) => {
        const mailOptions: nodemailer.SendMailOptions = {
          from: options.from,
          to: (`${process.env.PRODUCTION}` == 'true') ? options.to : `${process.env.TEST_EMAIL}`,
          subject: options.subject,
          html: template.toString()
        };
        return Transporter.sendMail(mailOptions);
      }).catch(error => { return error });
  }

  public emailVerification = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: this.translation(lang).verification.subject,//'Email Verification',
      html: '',
      type: 'verification',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).verification,
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
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: this.translation(lang).restoration.subject,//'Password Restoration',
      html: '',
      type: 'restoration',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).restoration,
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
    const lang: string = request.headers['content-language'] || 'en-EN';

    if (data.user.email) {
      let options = {
        from: process.env.EMAIL_FROM,
        to: data.user.email,
        subject: this.translation(lang).registration.subject,//'New Account',
        html: '',
        type: 'registration',
        locals: {
          ...this.translation(lang).common,
          ...this.translation(lang).registration,
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
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: this.translation(lang).reactivation.subject,//'Account Activation',
      html: '',
      type: 'reactivation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).reactivation,
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
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_FROM,
      subject: this.translation(lang).deactivation.subject,//'Account Deactivation',
      html: '',
      type: 'deactivation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).deactivation,
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

  public userInvitation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.receiver,
      subject: this.translation(lang).invitation.subject,//'User Invitation',
      html: '',
      type: 'invitation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).invitation,
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        email: data.user.email
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public userCommunication = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_FROM,
      subject: this.translation(lang).communication.subject,//'User Communication',
      html: '',
      type: 'communication',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).communication,
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        sender: data.sender,
        content: `${data.content}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }
}
export default EmailService;
