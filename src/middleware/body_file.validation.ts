import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import * as express from 'express';

//Path
var path = require('path');

// Remove File
const fs = require('fs')
const { promisify } = require('util')
const unlinkSync = promisify(fs.unlink);

// Exceptions
import HttpException from '../exceptions/HttpException';

function validationBody<T>(type: any): express.RequestHandler {
  return (req, res, next) => {
    validate(plainToClass(type, req.body))
      .then((errors: ValidationError[]) => {
        if (errors.length > 0) {
          if (req.file && (req.file.path).includes('profile')) {
            unlinkSync(path.join(__dirname, `../assets/profile/${req.file.filename}`));
          } else if (req.file && (req.file.path).includes('items')) {
            unlinkSync(path.join(__dirname, `../assets/items/${req.file.filename}`));
          }
          const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ');
          next(new HttpException(400, message));
        } else {
          next();
        }
      });
  };
}

export default validationBody;
