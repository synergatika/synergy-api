import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import * as express from 'express';

// Exceptions
import HttpException from '../exceptions/HttpException';

function validationParams<T>(type: any): express.RequestHandler {
  return (req, res, next) => {
    validate(plainToClass(type, req.params))
      .then((errors: ValidationError[]) => {
        if (errors.length > 0) {
          const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ');
          next(new HttpException(400, message));
        } else {
          next();
        }
      });
  };
}
export default validationParams;
