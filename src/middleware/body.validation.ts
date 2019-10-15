import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import * as express from 'express';
import HttpException from '../exceptions/HttpException';

function validationBody<T>(type: any): express.RequestHandler {
  return (req, res, next) => {
    validate(plainToClass(type, req.body))
      .then((errors: ValidationError[]) => {
        console.log(req.body);
        if (errors.length > 0) {
          const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ');
          console.log(message);
          next(new HttpException(400, message));
        } else {
          next();
        }
      });
  };
}

export default validationBody;