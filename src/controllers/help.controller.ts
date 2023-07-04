import * as express from "express";
import * as mongoose from "mongoose";
import to from "await-to-ts";
// import { API_VERSION } from "../version";

const path = require("path");

var pjson = require('../../package.json');

/**
 * Blockchain Service
 */
import { BlockchainService } from "../services/blockchain.service";

/**
 * Email Service
 */
import * as nodemailer from "nodemailer";
import Transporter from "../services/mailer.service";
const Email = require("email-templates");
const email = new Email();

/**
 * Interfaces
 */
import Controller from "../interfaces/controller.interface";

/**
 * Emails Util
 */
import EmailsUtil from '../utils/email.util';
const emailsUtil = new EmailsUtil();

class HelpController implements Controller {
  public path = "/status";
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.establishing);
  }

  private checkEthereum = async (result: any) => {
    const {
      ETH_REMOTE_API,
      ETH_CONTRACTS_PATH,
      ETH_API_ACCOUNT_PRIVKEY,
      ETH_REMOTE_WS,
      ETH_REMOTE_REST,
      ETH_REMOTE_NETWORK_TYPE,
    } = process.env;

    const timeOutPromise = new Promise(function (resolve, reject) {
      setTimeout(() => {
        resolve(false);
      }, 5000);
    });

    let start_time = new Date().getTime(),
      end_time = 0;
    let serviceInstance = null;
    try {
      serviceInstance = new BlockchainService(
        ETH_REMOTE_API,
        path.join(__dirname, ETH_CONTRACTS_PATH),
        ETH_API_ACCOUNT_PRIVKEY
      );
      if (serviceInstance == null) {
        result["ethereum_api_status"] = false;
      } else {
        const status = await Promise.race([
          timeOutPromise,
          serviceInstance.isConnected(),
        ]);

        if (`${process.env.PRODUCTION}` == 'true') {
          const clusterStatus = await Promise.race([
            timeOutPromise,
            serviceInstance.getClusterStatus(),
          ]);

          result = await this.parseClusterStatus(result, clusterStatus);
        }

        result["ethereum_api_up"] = status;
        result["ethereum_api_is_ok"] = await serviceInstance.isOk();
        result["ethereum_api_url"] = ETH_REMOTE_API;
        result["ethereum_api_ws_port"] = Number(ETH_REMOTE_WS);
        result["ethereum_api_rpc_port"] = Number(ETH_REMOTE_REST);
        result["ethereum_api_type"] = ETH_REMOTE_NETWORK_TYPE;
        result["ethereum_api_address"] = serviceInstance.address.from;
        if (status) {
          result[
            "ethereum_loyalty_app_address"
          ] = await serviceInstance.getLoyaltyAppAddress();
          result["ethereum_api_balance"] = parseInt(
            await serviceInstance.getBalance()
          );
        }
      }
    } catch (error) {
      result["ethereum_api_status"] = false;
      console.error("Blockchain connection is limited");
      // console.error(error);
    }
    end_time = new Date().getTime();
    result["ethereum_time_to_connect"] = Number(end_time - start_time);

    return result;
  };

  private parseClusterStatus = async (result: any, status: any) => {
    let node_count = 0,
      node_minter_count = 0;

    for (let index = 0; index < status.length; index++) {
      const node = status[index];
      result[`ethereum_node_${node.raftId}_id`] = node.nodeId;
      result[`ethereum_node_${node.raftId}_role`] = node.role;
      result[`ethereum_node_${node.raftId}_active`] = node.nodeActive;

      if (node.role === "minter") {
        node_count += node.nodeActive ? 1 : 0;
        node_minter_count += 1;
      }
    }

    result[`ethereum_cluster_availability`] =
      (node_count * 100) / node_minter_count;

    return result;
  };

  private checkMongoDB = async (result: any) => {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

    const timeOutPromise = new Promise(function (resolve, reject) {
      setTimeout(() => {
        resolve([true, null]);
      }, 5000);
    });

    let start_time = new Date().getTime(),
      end_time = 0;
    let error, conn;
    [error, conn] = (await Promise.race([
      to(
        mongoose
          .connect(
            `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
            {
              useCreateIndex: true,
              useNewUrlParser: true,
              useUnifiedTopology: true,
              useFindAndModify: false,
              reconnectTries: 5,
              reconnectInterval: 500, // in ms
            }
          )
          .catch()
      ),
      timeOutPromise,
    ])) as any;
    end_time = new Date().getTime();

    result["db_time_to_connect"] = Number(end_time - start_time);
    if (error) {
      result["db_connection_status"] = false;
    } else {
      result["db_connection_status"] = true;
    }

    return result;
  };

  private checkSMTP = async (result: any) => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_FROM } = process.env;

    let start_time = new Date().getTime(),
      end_time = 0;
    let smtpIsOnline = false;
    try {
      smtpIsOnline = await Transporter.verify();
    } catch (error) {
      console.error("SMTP connection is limited");
    }
    end_time = new Date().getTime();

    result["smtp_time_to_connect"] = Number(end_time - start_time);
    result["smtp_status"] = smtpIsOnline;
    if (smtpIsOnline == false) {
      result["smtp_email_host"] = EMAIL_HOST;
      result["smtp_email_port"] = Number(EMAIL_PORT);
      result["smtp_email_user"] = EMAIL_USER;
      result["smtp_email_from"] = EMAIL_FROM;
    } else {
      let email_error: Error, email_result: any;
      [email_error, email_result] = await to(emailsUtil.notificationSMTP().catch());
      // console.log("-----------------")
      // console.log(email_error)
      // console.log(email_result)
      // console.log("-----------------")
      if (email_error) throw (`EMAIL ERROR - Test: ${email_error}`);

      // let emailInfo = {
      //   to: `contact@sociality.gr`, // 'synergatika@gmail.com',
      //   subject: "Test email",
      //   html: "",
      //   type: "_test",
      //   locals: {
      //     home_page: `${process.env.APP_URL}`,
      //     "API_NAME": pjson.name,
      //     "API_VERSION": pjson.version
      //   },
      // };
      // let error,
      //   results: object = {};
      // [error, results] = await to(
      //   Promise.all([email.render(emailInfo.type, emailInfo.locals)]).then(
      //     (template: object) => {
      //       const mailOptions: nodemailer.SendMailOptions = {
      //         from: process.env.EMAIL_FROM,
      //         to: `${process.env.TEST_EMAIL}` || emailInfo.to,
      //         subject: emailInfo.subject, // Subject line
      //         html: template.toString(), // html body
      //       };
      //       return Transporter.sendMail(mailOptions);
      //     }
      //   )
      // );
      // console.error(emailInfo);
      // console.error(error);
      // console.error(results);
    }

    return result;
  };

  private establishing = async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction
  ) => {

    // let result: any = {
    //   api_version: API_VERSION,
    // };
    let result: any = {
      "API_NAME": pjson.name,
      "API_VERSION": pjson.version
    };

    result = await this.checkEthereum(result);
    result = await this.checkMongoDB(result);
    result = await this.checkSMTP(result);

    // if (process.env.PRODUCTION == "false") {
    //   result = {
    //     ...result,
    //     ...process.env
    //   };
    // }

    response.status(200).send({ ...result, current_date: new Date() });

    next();
  };
}
export default HelpController;
