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

class EmailService {


  /** To add */
  // Email: To member (when orders a microcredit campaign).
  // Email: To partner (when a member orders a microcredit campaign).
  // Email: To member (when a campaign status has change - order or paid).
  // Email: To member (when the redeeming period starts).
  // Email: To member (when the redeeming period ends).
  // Email: To member (when redeem an order or part of an order).


  private content = {
    ["en-EN" as string]: {
      communication: {
        "subject": "You have an Email fror a User",
        "title": "",
        "body": ""
      },
      invitation: {
        "subject": "You have been invited to Synergy Community",
        "title": "",
        "body": ""
      },
      deactivation: {
        "subject": "Synergy Account deactivated",
        "title": "",
        "body": ""
      },
      reactivation: {
        "subject": "Synergy Account is Active again",
        "title": "",
        "body": ""
      },
      registration: {
        "subject": "Welcome to Synergy Team",
        "title": "",
        "body": ""
      },
      restoration: {
        "subject": "Update your Password",
        "title": "",
        "body": ""
      },
      verification: {
        "subject": "You need to verify your account",
        "title": "",
        "body": ""
      },
      common: {
        "IF_LINK": "If that doesn't work, copy and paste the following link in your browser:",
        "CHEERS": "Cheers,<br>Synergy Team",
        "FOOTER": "You received this email because we received a request for your account. If you didn't request you can safely delete this email."
      }
    },
    ["el-EL" as string]: {
      communication: {
        "subject": "Επικοινωνία από Χρήστη",
        "title": "",
        "body": ""
      },
      invitation: {
        "subject": "Έχεις πρόσκληση για την Κοινότητα του Synergy",
        "title": "",
        "body": ""
      },
      deactivation: {
        "subject": "Ο Λογαριασμοός σας απενεργοποιήθηκε",
        "title": "",
        "body": ""
      },
      reactivation: {
        "subject": "Ο Λογαρισμός σας είναι Ενεγός και πάλι",
        "title": "",
        "body": ""
      },
      registration: {
        "subject": "Καλώς ήρθατε στην κοινότητα του Synergy",
        "title": "",
        "body": ""
      },
      restoration: {
        "subject": "Ανανέωση Κωδικού Πρόσβασης",
        "title": "",
        "body": ""
      },
      verification: {
        "subject": "Επιβεβαίωση Διεύθυνσης Ηλεκτρονικού Ταχυδρομείου",
        "title": "",
        "body": ""
      },
      common: {
        "IF_LINK": "Εαν δεν μεταφερθείτε αυτόματα στη σελίδα μας, κάντε αντιγραφή/επικόλληση τον παρακάτω συνδεσμο",
        "CHEERS": "Χαιρετισμούς,<br>η Ομάδα του Synergy",
        "FOOTER": "Λάβατε αυτό το μήνυμα ηλεκτρονικού ταχυδρομίου, καθώς στάλθηκε μια αίτηση από το συγκεκριμένο λογαριασμό. Έαν, η αίτηση δεν στάλθηκε από εσάς, μπορείται να διαγράψετε με ασφάλεια αυτο το μήνυμα."
      }
    }
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
      }).catch(error => { console.log("ERROR", error) });
    // Dev
    // to: `${process.env.TEST_EMAIL}` || options.to,
    // Prod
    // to: options.to,
  }

  /**
   *
   */
  public emailVerification = async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const data = response.locals;
    const lang: string = request.headers['content-language'] || 'en-EN';

    let options = {
      from: process.env.EMAIL_FROM,
      to: data.user.email,
      subject: this.content[lang].verification.subject,//'Email Verification',
      html: '',
      type: 'verification',
      locals: {
        ...this.content[lang].common,
        ...this.content[lang].verification,
        logo_url: `https://app.synergatika.gr/assets/media/images/logo.png`,
        home_page: `${process.env.APP_URL}`,
        link: `${process.env.APP_URL}auth/verify-email/${data.token}`
      },
    }

    console.log("subject", this.content["el-EL"].verification.subject);
    console.log("options", options.locals)
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
      subject: this.content[lang].restoration.subject,//'Password Restoration',
      html: '',
      type: 'restoration',
      locals: {
        ...this.content[lang].common,
        ...this.content[lang].restoration,
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
        subject: this.content[lang].registration.subject,//'New Account',
        html: '',
        type: 'registration',
        locals: {
          ...this.content[lang].common,
          ...this.content[lang].registration,
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
      subject: this.content[lang].reactivation.subject,//'Account Activation',
      html: '',
      type: 'reactivation',
      locals: {
        ...this.content[lang].common,
        ...this.content[lang].reactivation,
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
      subject: this.content[lang].deactivation.subject,//'Account Deactivation',
      html: '',
      type: 'deactivation',
      locals: {
        ...this.content[lang].common,
        ...this.content[lang].deactivation,
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
      subject: this.content[lang].invitation.subject,//'User Invitation',
      html: '',
      type: 'invitation',// `invitation-${lang.toString()}`,
      locals: {
        ...this.content[lang].common,
        ...this.content[lang].invitation,
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
      subject: this.content[lang].communication.subject,//'User Communication',
      html: '',
      type: 'communication',
      locals: {
        ...this.content[lang].common,
        ...this.content[lang].communication,
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
