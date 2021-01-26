import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import * as express from 'express';
var path = require('path');

/**
 * Middleware
 */
import FilesMiddleware from '../items/files.middleware';

/**
 * Helper's Instances
 */
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const deleteSync = FilesMiddleware.deleteSync;

/**
 * Exceptions
 */
import HttpException from '../../exceptions/HttpException';

function validationBody<T>(type: any): express.RequestHandler {
  return (req, res, next) => {
    validate(plainToClass(type, req.body))
      .then((errors: ValidationError[]) => {
        if (errors.length > 0) {

          if (req.file && (req.file.path).includes('static')) {
            const file = path.join(__dirname, `../assets/static/${req.file.filename}`);
            if (existFile(file)) deleteSync(file);
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
