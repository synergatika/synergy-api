import * as nodemailer from 'nodemailer'

//const transporter: nodemailer.Transporter = nodemailer.createTransport('smtps://dimitris.sec%40gmail.com:6947879557@smtp.gmail.com');
// create reusable transporter object using SMTP transport
const transporter: nodemailer.Transporter = nodemailer.createTransport({
    //service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
} as any);

export default transporter;
/*
// create reusable transporter object using SMTP transport and set default values for mail options.
transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'gmail.user@gmail.com',
        pass: 'userpass'
    }
}, {
    from: 'sender@address',
    headers: {
        'My-Awesome-Header': '123'
    }
});
*/
// setup e-mail data with unicode symbols
/*
var mailOptions: nodemailer.SendMailOptions = {
    from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
    to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world ✔', // plaintext body
    html: '<b>Hello world ✔</b>' // html body
};

// send mail with defined transport object
transporter.sendMail(mailOptions, (error: Error, info: nodemailer.SentMessageInfo): void => {
	// nothing
});

// promise send mail without callback
transporter
  .sendMail(mailOptions)
  .then((info: { messageId: any; }) => info.messageId)

// // create template based sender function
// var sendPwdReset = transporter.templateSender({
//     subject: 'Password reset for {{username}}!',
//     text: 'Hello, {{username}}, Please go here to reset your password: {{ reset }}',
//     html: '<b>Hello, <strong>{{username}}</strong>, Please <a href="{{ reset }}">go here to reset your password</a>: {{ reset }}</p>'
// }, {
//     from: 'sender@example.com',
// });

// // use template based sender to send a message
// sendPwdReset({
//     to: 'receiver@example.com'
// }, {
//     username: 'Node Mailer',
//     reset: 'https://www.example.com/reset?token=<unique-single-use-token>'
// })
// .then((info: { messageId: any; }) => info.messageId);*/
