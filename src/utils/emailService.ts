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
  // Email: To member (when orders a microcredit campaign). [OK]
  // Email: To partner (when a member orders a microcredit campaign). [OK]
  // Email: To member (when a campaign status has change - order or paid).
  // Email: To member (when the redeeming period starts).
  // Email: To member (when the redeeming period ends).
  // Email: To member (when redeem an order or part of an order).


  private translation = (lang: string) => {
    return (new Translation).content[lang];
  }

  private defaultLang = (): string => {
    return 'el-EL';
    // return 'en-EN';
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

  /**
  * Invitation(Registration) to User / Email Verification / Password Restoration
  */
  public userRegistration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();
    console.log("userRegistration")
    console.log(data)
    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      subject: this.translation(lang).registration.subject,//'New Account',
      html: '',
      type: 'registration',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).registration,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/login/`,
        password: data.extras.tempPassword
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public emailVerification = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();
    console.log("emailVerification")
    console.log(data)
    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      subject: this.translation(lang).verification.subject,//'Email Verification',
      html: '',
      type: 'verification',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).verification,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/verify-email/${data.extras.token}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public passwordRestoration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();
    console.log("passwordRestoration")
    console.log(data)
    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      subject: this.translation(lang).restoration.subject,//'Password Restoration',
      html: '',
      type: 'restoration',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).restoration,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/reset-password/${data.extras.token}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  /**
  * Actiovation Account / Deactivation Account
  */
  public accountActivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      subject: this.translation(lang).activation.subject,//'Account Activation',
      html: '',
      type: 'activation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).activation,
        logo_url: `${process.env.LOGO_URL}`,
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
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      subject: this.translation(lang).deactivation.subject,//'Account Activation',
      html: '',
      type: 'deactivation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).deactivation,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/login/`,
        reason: (data.decision == 'admin') ? this.translation(lang).deactivation.by_admin : this.translation(lang).deactivation.by_you,
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  /** (internal) Activation / Deactivation */
  public internalActivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `${process.env.EMAIL_FROM}`,
      subject: this.translation(lang).internal_activation.subject,//'Account Deactivation',
      html: '',
      type: 'internal_activation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).internal_activation,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        email: data.user.email,
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    next();
  }

  public internalDeactivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `${process.env.EMAIL_FROM}`,
      subject: this.translation(lang).internal_deactivation.subject,//'Account Deactivation',
      html: '',
      type: 'internal_deactivation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).internal_deactivation,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        email: data.user.email,
        reason: `${data.reason}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    next();
    // response.status(data.res.code).send(data.res.body);
  }

  /**
  * (internal) Communication By User
  */
  public internalCommunication = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();
    console.log("internalCommunication")
    console.log(data)
    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `${process.env.EMAIL_FROM}`,
      subject: this.translation(lang).internal_deactivation.subject,//'User Communication',
      html: '',
      type: 'internal_deactivation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).internal_deactivation,
        logo_url: `${process.env.LOGO_URL}`,
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

  /**
  * Invitation to User
  */
  public userInvitation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();
    console.log("userInvitation")
    console.log(data)
    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.receiver,
      subject: this.translation(lang).invitation.subject,//'User Invitation',
      html: '',
      type: 'invitation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).invitation,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        email: data.user.email
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  /**
  * Notification for New Support to Partner & Member
  */
  public newSupportPartner = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.partner.email,
      subject: this.translation(lang).new_support_partner.subject,
      html: '',
      type: 'create_support_partner',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).new_support_partner,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        method: `${data.extras.method.name}`,
        tokens: `${data.extras.tokens}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    // response.status(data.res.code).send(data.res.body);
    next();
  }

  public newSupportMember = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.member.email,
      subject: this.translation(lang).new_support_member.subject,
      html: '',
      type: 'create_support_member',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).new_support_member,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        method: `${data.extras.method.value}, ${data.extras.method.name}`,
        tokens: `${data.extras.tokens}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    // response.status(data.res.code).send(data.res.body);
    response.status(200).send({ data: response.locals.support, code: 200 })
  }
}
export default EmailService;
