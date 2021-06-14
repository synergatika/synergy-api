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
import { UnprocessableEntityException } from '../_exceptions/index';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';

import Translation from '../translation';
class EmailService {


  /** To add */
  // Email: To member (when orders a microcredit campaign). [OK]
  // Email: To partner (when a member orders a microcredit campaign). [OK]
  // Email: To member (when a campaign status has change - order or paid). [OK]
  // Email: To member (when the redeeming period starts). [OK]
  // Email: To member (when the redeeming period ends).
  // Email: To member (when redeem an order or part of an order). [OK]


  private translation = (lang: string) => {
    return (new Translation).content[lang];
  }

  private defaultLang = (): string => {
    return 'el-EL';
    // return 'en-EN';
  }

  private emailSender = (options: { type: any; locals: any; from: any; to: any; cc: any; bcc: any; subject: any; }) => {
    return Promise.all([email.render(options.type, options.locals)])
      .then((template: object) => {

        if (`${process.env.PRODUCTION}` == 'true') {
          options.to = options.to;
          options.cc = options.cc;
          options.bcc = options.bcc;
        } else {
          options.to = (options.to) ? `${process.env.TEST_EMAIL}` : ``;
          options.cc = (options.cc) ? `${process.env.TEST_EMAIL},${process.env.TEST_EMAIL}` : ``;
          options.bcc = (options.bcc) ? `${process.env.TEST_EMAIL},${process.env.TEST_EMAIL}` : ``;
        }

        const mailOptions: nodemailer.SendMailOptions = {
          from: options.from,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
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

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).registration.subject,//'New Account',
      html: '',
      type: 'registration',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).registration,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/login/`,
        password: data.extras.tempPassword,
        registeredBy: (data.registrationType == 'one-click') ? '' : (request.user && request.user.access == 'admin') ?
          `${this.translation(lang).registration.registeredBy[1]}` : `${this.translation(lang).registration.registeredBy[0]} ${request.user.name}`
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

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      cc: ``,
      bcc: ``,
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

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      cc: ``,
      bcc: ``,
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
  * Actiovation Account / Deactivation Account / Deletion Account
  */
  public accountActivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      cc: ``,
      bcc: ``,
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
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).deactivation.subject,//'Account Activation',
      html: '',
      type: 'deactivation',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).deactivation,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/login/`,
        title: (data.decision == 'admin') ?
          `${this.translation(lang).deactivation.title[0]}` : `${this.translation(lang).deactivation.title[1]}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(data.res.code).send(data.res.body);
  }

  public accountDeletion = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.user.email,
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).deletion.subject,//'Account Activation',
      html: '',
      type: 'deletion',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).deletion,
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

  /** (internal) Activation / Deactivation / Deletion */
  public internalActivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `${process.env.EMAIL_FROM}`,
      cc: ``,
      bcc: ``,
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
      cc: ``,
      bcc: ``,
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

  public internalDeletion = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `${process.env.EMAIL_FROM}`,
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).internal_deletion.subject,//'Account Deactivation',
      html: '',
      type: 'internal_deletion',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).internal_deletion,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        email: data.user.email
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

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `${process.env.EMAIL_FROM}`,
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).internal_communication.subject,//'User Communication',
      html: '',
      type: 'internal_communication',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).internal_communication,
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

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.receiver,
      cc: ``,
      bcc: ``,
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

    if (response.locals['extras'].method.bic == 'store') {
      return next();
    }

    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.partner.email,
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).new_support_partner.subject,
      html: '',
      type: 'create_support_partner',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).new_support_partner,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        campaign: `${data.support.campaign_title}`,
        method: `${this.translation(lang).payments.filter((o) => { return o.bic == data.extras.method.bic })[0].title}`,
        tokens: `${data.extras.tokens}`,
        payment: `${data.support.payment_id}`
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
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).new_support_member.subject,
      html: '',
      type: 'create_support_member',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).new_support_member,
        title: (data.extras.status == 'paid') ? this.translation(lang).new_support_member.title[0] : this.translation(lang).new_support_member.title[1],
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        campaign: `${data.support.campaign_title}`,
        method: `${data.extras.method.value},
          ${this.translation(lang).payments.filter((o) => { return o.bic == data.extras.method.bic })[0].title}`,
        tokens: `${data.extras.tokens}`,
        payment: `${data.support.payment_id}`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    response.status(200).send({
      data: {
        support_id: data.support.support_id,
        payment_id: data.support.payment_id,
        status: data.support.status,
        method: data.support.method,
      },
      code: 200
    });
    // response.status(data.res.code).send(data.res.body);
    //  response.status(200).send({ data: response.locals.support, code: 200 })
  }

  public changeSupportStatus = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.member.email,
      cc: ``,
      bcc: ``,
      subject: `${this.translation(lang).change_support_status.subject} (${data.support.payment_id})`,
      html: '',
      type: 'change_support_status',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).change_support_status,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        title: (data.support.status == 'paid') ?
          `'${this.translation(lang).change_support_status.title[0]}'` : `'${this.translation(lang).change_support_status.title[1]}'`
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error} `));

    response.status(200).send({
      data: {
        support_id: data.support.support_id,
        payment_id: data.support.payment_id,
        status: data.support.status,
        method: data.support.method,
      },
      code: 200
    });
    // response.status(data.res.code).send(data.res.body);
    //  response.status(200).send({ data: response.locals.support, code: 200 })
  }

  public redeemSupport = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: data.member.email,
      cc: ``,
      bcc: ``,
      subject: `${this.translation(lang).redeem_support.subject} (${data.support.payment_id})`,
      html: '',
      type: 'redeem_support',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).redeem_support,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        campaign: `${data.support.campaign_title}`,
        tokens: `${data.extras.tokens}/${data.support.initialTokens}`,
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error} `));

    response.status(200).send({
      message: 'Tokens Spent',
      code: 200
    });
  }

  public campaignStarts = async (campaign: any) => {
    const lang: string = this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM} `,
      to: ``,
      subject: `${this.translation(lang).campaign_starts.subject} (${campaign.title})`,
      cc: ``,
      bcc: (campaign.supports.map((a: any) => { if (a.member_email) return (a.member_email) })).join(),
      html: '',
      type: 'campaign_starts',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).campaign_starts,
        logo_url: `${process.env.LOGO_URL} `,
        home_page: `${process.env.APP_URL} `,
        campaign: `${campaign.title}`,
      },
    }

    let error, results: object = {};
    [error, results] = await to(this.emailSender(options));
    if (error) return;

    // response.status(data.res.code).send(data.res.body);
    //  response.status(200).send({ data: response.locals.support, code: 200 })
  }
}
export default EmailService;
