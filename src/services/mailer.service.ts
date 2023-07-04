import * as nodemailer from 'nodemailer'

var options: any = {
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
}

// if (process.env.EMAIL_SERVICE != null) {
//   options.service = process.env.EMAIL_SERVICE;
// } else {
options.host = process.env.EMAIL_HOST;
options.port = process.env.EMAIL_PORT;
// }

// create reusable transporter object using SMTP transport
const transporter: nodemailer.Transporter = nodemailer.createTransport(options);

export default transporter;
