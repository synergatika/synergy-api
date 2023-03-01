import { NextFunction, Response } from 'express';
import * as nodemailer from 'nodemailer';
import to from 'await-to-ts';
var path = require('path');

// .env File
import 'dotenv/config';
import validateEnv from './validateEnv';
validateEnv();

import Promise from 'bluebird';

// Email
import Transporter from '../services/mailer.service'
const Email = require('email-templates');
const email = new Email();

// Exceptions
import { UnprocessableEntityException } from '../_exceptions/index';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';

import Translation from '../translation';
import { User, MicrocreditCampaign, MicrocreditSupport, MicrocreditSupportPayment, MicrocreditSupportStatus } from '../_interfaces/index';
import { EarnTokensDto, RedeemTokensDto } from '../_dtos/index';

class EmailsUtil {

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
      })
    // .catch(error => {
    //   console.log("error in sender catch", error)
    //   return error
    // });
  }

  /**
  * Invitation(Registration) to User / Email Verification / Password Restoration
  */
  // public userRegistration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.user.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).registration.subject,//'New Account',
  //     html: '',
  //     type: 'registration',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).registration,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       link: `${process.env.APP_URL}auth/login/`,
  //       password: data.extras.tempPassword,
  //       registeredBy: (data.registrationType == 'one-click') ? '' : (request.user && request.user.access == 'admin') ?
  //         `${this.translation(lang).registration.registeredBy[1]}` : `${this.translation(lang).registration.registeredBy[0]} ${request.user.name}`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(data.res.code).send(data.res.body);
  // }

  public userRegistration2 = async (_lang: string, email_to: string, tempPassword: string, registrationType: string, registeredBy: User) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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
        password: tempPassword,
        registeredBy: (registrationType == 'one-click') ? '' : (registeredBy && registeredBy.access == 'admin') ?
          `${this.translation(lang).registration.registeredBy[1]}` : `${this.translation(lang).registration.registeredBy[0]} ${registeredBy.name}`
      },
    }

    console.log("# userRegistration")
    console.log("email_to", email_to)
    console.log("password", tempPassword)
    console.log("registeredBy", (registrationType == 'one-click') ? '' : (registeredBy && registeredBy.access == 'admin') ?
      `${this.translation(lang).registration.registeredBy[1]}` : `${this.translation(lang).registration.registeredBy[0]} ${registeredBy.name}`)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
    // .then(result => { return result; }).catch(error => {
    //   console.log("error in resutn sender", error);
    //   return error
    // });
  }

  public emailVerification2 = async (_lang: string, email_to: string, token: string) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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
        link: `${process.env.APP_URL}auth/verify-email/${token}`
      },
    }

    console.log("# emailVerification")
    console.log("email_to", email_to)
    console.log("token", token)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
    //.then(result => { return result; }).catch(error => { return error });
  }

  // public emailVerification = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.user.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).verification.subject,//'Email Verification',
  //     html: '',
  //     type: 'verification',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).verification,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       link: `${process.env.APP_URL}auth/verify-email/${data.extras.token}`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(data.res.code).send(data.res.body);
  // }

  public passwordRestoration2 = async (_lang: string, email_to: string, token: string) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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
        link: `${process.env.APP_URL}auth/reset-password/${token}`
      },
    }

    console.log("# passwordRestoration")
    console.log("email_to", email_to)
    console.log("token", token)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public passwordRestoration = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.user.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).restoration.subject,//'Password Restoration',
  //     html: '',
  //     type: 'restoration',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).restoration,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       link: `${process.env.APP_URL}auth/reset-password/${data.extras.token}`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(data.res.code).send(data.res.body);
  // }

  /**
  * Actiovation Account / Deactivation Account / Deletion Account
  */

  public accountActivation2 = async (_lang: string, email_to: string) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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

    console.log("# accountActivation")
    console.log("email_to", email_to)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public accountActivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.user.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).activation.subject,//'Account Activation',
  //     html: '',
  //     type: 'activation',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).activation,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       link: `${process.env.APP_URL}auth/login/`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(data.res.code).send(data.res.body);
  // }

  public accountDeactivation2 = async (_lang: string, email_to: string, deletedBy: User) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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
        title: (deletedBy.access == 'admin') ?
          `${this.translation(lang).deactivation.title[0]}` : `${this.translation(lang).deactivation.title[1]}`
      },
    }

    console.log("# accountDeactivation")
    console.log("email_to", email_to)
    console.log("title", (deletedBy.access == 'admin') ?
      `${this.translation(lang).deactivation.title[0]}` : `${this.translation(lang).deactivation.title[1]}`)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public accountDeactivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.user.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).deactivation.subject,//'Account Activation',
  //     html: '',
  //     type: 'deactivation',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).deactivation,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       link: `${process.env.APP_URL}auth/login/`,
  //       title: (data.decision == 'admin') ?
  //         `${this.translation(lang).deactivation.title[0]}` : `${this.translation(lang).deactivation.title[1]}`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(data.res.code).send(data.res.body);
  // }

  public accountDeletion2 = async (_lang: string, email_to: string) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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

    console.log("# accountDeletion")
    console.log("email_to", email_to)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public accountDeletion = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.user.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).deletion.subject,//'Account Activation',
  //     html: '',
  //     type: 'deletion',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).deletion,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       link: `${process.env.APP_URL}auth/login/`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(data.res.code).send(data.res.body);
  // }

  /** (internal) Activation / Deactivation / Deletion */

  public internalActivation2 = async (_lang: string, user: User) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `synergatika@gmail.com`, //`${process.env.EMAIL_FROM}`,
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
        email: user.email,
      },
    }

    console.log("# internalActivation")
    console.log("to", `synergatika@gmail.com`)
    console.log("user.email", user.email)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public internalActivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: `synergatika@gmail.com`, //`${process.env.EMAIL_FROM}`,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).internal_activation.subject,//'Account Deactivation',
  //     html: '',
  //     type: 'internal_activation',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).internal_activation,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       email: data.user.email,
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   next();
  // }

  public internalDeactivation2 = async (_lang: string, user: User, reason: string) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `synergatika@gmail.com`,//`${process.env.EMAIL_FROM}`,
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
        email: `${user.email}`,
        reason: `${reason}`
      },
    }

    console.log("# internalActivation")
    console.log("to", `synergatika@gmail.com`)
    console.log("user.email", user.email)
    console.log("reason", reason)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public internalDeactivation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: `synergatika@gmail.com`,//`${process.env.EMAIL_FROM}`,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).internal_deactivation.subject,//'Account Deactivation',
  //     html: '',
  //     type: 'internal_deactivation',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).internal_deactivation,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       email: data.user.email,
  //       reason: `${data.reason}`
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   next();
  //   // response.status(data.res.code).send(data.res.body);
  // }

  public internalDeletion2 = async (_lang: string, user: User) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `synergatika@gmail.com`,//`${process.env.EMAIL_FROM}`,
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
        email: user.email
      },
    }

    console.log("# internalDeletion")
    console.log("to", `synergatika@gmail.com`)
    console.log("user.email", user.email)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public internalDeletion = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: `synergatika@gmail.com`,//`${process.env.EMAIL_FROM}`,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).internal_deletion.subject,//'Account Deactivation',
  //     html: '',
  //     type: 'internal_deletion',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).internal_deletion,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       email: data.user.email
  //     },
  //   }

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   next();
  //   // response.status(data.res.code).send(data.res.body);
  // }

  /**
  * (internal) Communication By User
  */
  // public internalCommunication = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  public internalCommunication = async (_lang: string, sender: string, content: string) => {
    // const data = response.locals;
    // const lang: string = request.headers['content-language'] || this.defaultLang();
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: `synergatika@gmail.com`,//`${process.env.EMAIL_FROM}`,
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
        sender: sender,
        content: `${content}`
        // sender: data.sender,
        // content: `${data.content}`
      },
    }

    console.log("# internalCommunication")
    console.log("to", `synergatika@gmail.com`)
    console.log("sender", sender)
    console.log("content", content)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();

    // let error, results: object = {};
    // [error, results] = await to(this.emailSender(options));
    // if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    // response.status(data.res.code).send(data.res.body);
  }

  /**
  * Invitation to User
  */
  // public userInvitation = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  public userInvitation = async (_lang: string, email_to: string, user: User) => {
    const lang: string = _lang || this.defaultLang();
    // const data = response.locals;
    // const lang: string = request.headers['content-language'] || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to, //data.receiver,
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
        // email: data.user.email
        email: user.email
      },
    }

    console.log("# userInvitation")
    console.log("email_to", email_to)
    console.log("email", user.email)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
    // let error, results: object = {};
    // [error, results] = await to(this.emailSender(options));
    // if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

    // response.status(data.res.code).send(data.res.body);
  }

  /**
  * Notification for New Support to Partner & Member
  */
  public newSupportPartner = async (_lang: string, email_to: string, campaign: MicrocreditCampaign, payment: MicrocreditSupportPayment, data: EarnTokensDto) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
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
        campaign: `${campaign.title}`,
        method: `${this.translation(lang).payments.filter((o) => { return o.bic == payment.method.bic })[0].title}`,
        tokens: `${data._amount}`,
        payment: `${payment._id}`
      },
    }

    console.log("# newSupportPartner")
    console.log("email_to", email_to)
    console.log("campaign", `${campaign.title}`)
    console.log("method", `${this.translation(lang).payments.filter((o) => { return o.bic == payment.method.bic })[0].title}`)
    console.log("tokens", `${data._amount}`)
    console.log("payment", `${payment._id}`)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public newSupportPartner2 = async (request: RequestWithUser, response: Response, next: NextFunction) => {

  //   if (response.locals['extras'].method.bic == 'store') {
  //     return next();
  //   }

  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.partner.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).new_support_partner.subject,
  //     html: '',
  //     type: 'create_support_partner',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).new_support_partner,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       campaign: `${data.support.campaign_title}`,
  //       method: `${this.translation(lang).payments.filter((o) => { return o.bic == data.extras.method.bic })[0].title}`,
  //       tokens: `${data.extras.tokens}`,
  //       payment: `${data.support.payment_id}`
  //     },
  //   }

  //   console.log("# newSupportPartner2")
  //   console.log("---------------");

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   // response.status(data.res.code).send(data.res.body);
  //   next();
  // }

  public newSupportMember = async (_lang: string, email_to: string, campaign: MicrocreditCampaign, payment: MicrocreditSupportPayment, data: EarnTokensDto) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
      cc: ``,
      bcc: ``,
      subject: this.translation(lang).new_support_member.subject,
      html: '',
      type: 'create_support_member',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).new_support_member,
        title: (data.paid) ? this.translation(lang).new_support_member.title[0] : this.translation(lang).new_support_member.title[1],
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        campaign: `${campaign.title}`,
        method: `${payment.method.value},
          ${this.translation(lang).payments.filter((o) => { return o.bic == payment.method.bic })[0].title}`,
        tokens: `${data._amount}`,
        payment: `${payment._id}`
      },
    }

    console.log("# newSupportMember")
    console.log("email_to", email_to)
    console.log("campaign", `${campaign.title}`)
    console.log("method", `${payment.method.value},
    ${this.translation(lang).payments.filter((o) => { return o.bic == payment.method.bic })[0].title}`)
    console.log("tokens", `${data._amount}`)
    console.log("payment", `${payment._id}`)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public newSupportMember2 = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.member.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: this.translation(lang).new_support_member.subject,
  //     html: '',
  //     type: 'create_support_member',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).new_support_member,
  //       title: (data.extras.status == 'paid') ? this.translation(lang).new_support_member.title[0] : this.translation(lang).new_support_member.title[1],
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       campaign: `${data.support.campaign_title}`,
  //       method: `${data.extras.method.value},
  //         ${this.translation(lang).payments.filter((o) => { return o.bic == data.extras.method.bic })[0].title}`,
  //       tokens: `${data.extras.tokens}`,
  //       payment: `${data.support.payment_id}`
  //     },
  //   }

  //   console.log("# newSupportMember2")
  //   console.log("---------------");

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error}`));

  //   response.status(200).send({
  //     data: {
  //       support_id: data.support.support_id,
  //       payment_id: data.support.payment_id,
  //       status: data.support.status,
  //       method: data.support.method,
  //     },
  //     code: 200
  //   });
  //   // response.status(data.res.code).send(data.res.body);
  //   //  response.status(200).send({ data: response.locals.support, code: 200 })
  // }

  public changeSupportStatus = async (_lang: string, email_to: string, support: MicrocreditSupport) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
      cc: ``,
      bcc: ``,
      subject: `${this.translation(lang).change_support_status.subject} (${support.payment._id})`,
      html: '',
      type: 'change_support_status',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).change_support_status,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        title: (support.status == MicrocreditSupportStatus.PAID) ?
          `'${this.translation(lang).change_support_status.title[0]}'` : `'${this.translation(lang).change_support_status.title[1]}'`
      },
    }

    console.log("# changeSupportStatus")
    console.log("email_to", email_to)
    console.log("title", (support.status == MicrocreditSupportStatus.PAID) ?
      `'${this.translation(lang).change_support_status.title[0]}'` : `'${this.translation(lang).change_support_status.title[1]}'`)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public changeSupportStatus2 = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.member.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: `${this.translation(lang).change_support_status.subject} (${data.support.payment_id})`,
  //     html: '',
  //     type: 'change_support_status',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).change_support_status,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       title: (data.support.status == 'paid') ?
  //         `'${this.translation(lang).change_support_status.title[0]}'` : `'${this.translation(lang).change_support_status.title[1]}'`
  //     },
  //   }

  //   console.log("# changeSupportStatus")
  //   console.log("---------------");

  //   return this.emailSender(options);
  // }

  public redeemSupport = async (_lang: string, email_to: string, campaign: MicrocreditCampaign, support: MicrocreditSupport, data: RedeemTokensDto) => {
    const lang: string = _lang || this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM}`,
      to: email_to,
      cc: ``,
      bcc: ``,
      subject: `${this.translation(lang).redeem_support.subject} (${support.payment._id})`,
      html: '',
      type: 'redeem_support',
      locals: {
        ...this.translation(lang).common,
        ...this.translation(lang).redeem_support,
        logo_url: `${process.env.LOGO_URL}`,
        home_page: `${process.env.APP_URL}`,
        campaign: `${campaign.title}`,
        tokens: `${data._tokens}/${support.initialTokens}`,
      },
    }

    console.log("# redeemSupport")
    console.log("email_to", email_to)
    console.log("campaign", campaign)
    console.log("tokens", `${data._tokens}/${support.initialTokens}`)
    console.log("---------------");

    return await to(this.emailSender(options)).catch();
  }

  // public redeemSupport2 = async (request: RequestWithUser, response: Response, next: NextFunction) => {
  //   const data = response.locals;
  //   const lang: string = request.headers['content-language'] || this.defaultLang();

  //   let options = {
  //     from: `${process.env.EMAIL_FROM}`,
  //     to: data.member.email,
  //     cc: ``,
  //     bcc: ``,
  //     subject: `${this.translation(lang).redeem_support.subject} (${data.support.payment_id})`,
  //     html: '',
  //     type: 'redeem_support',
  //     locals: {
  //       ...this.translation(lang).common,
  //       ...this.translation(lang).redeem_support,
  //       logo_url: `${process.env.LOGO_URL}`,
  //       home_page: `${process.env.APP_URL}`,
  //       campaign: `${data.support.campaign_title}`,
  //       tokens: `${data.extras.tokens}/${data.support.initialTokens}`,
  //     },
  //   }

  //   console.log("# redeemSupport2")
  //   console.log("---------------");

  //   let error, results: object = {};
  //   [error, results] = await to(this.emailSender(options));
  //   if (error) return next(new UnprocessableEntityException(`EMAIL ERROR || ${error} `));

  //   response.status(200).send({
  //     message: 'Tokens Spent',
  //     code: 200
  //   });
  // }

  public campaignStarts = async (emails_to: string[], campaign: MicrocreditCampaign) => {
    const lang: string = this.defaultLang();

    let options = {
      from: `${process.env.EMAIL_FROM} `,
      to: ``,
      subject: `${this.translation(lang).campaign_starts.subject} (${campaign.title})`,
      cc: ``,
      bcc: emails_to,
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
export default EmailsUtil;
