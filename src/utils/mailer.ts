import * as nodemailer from 'nodemailer'

// create reusable transporter object using SMTP transport
const transporter: nodemailer.Transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  //host: process.env.EMAIL_HOST,
  //port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }

} as any);

export default transporter;
