import { NextFunction, Response } from 'express';
import to from 'await-to-ts'
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';

class FilesMiddleware {
  static uploadFile = multer({
    storage: multer.diskStorage({
      destination: function(req: RequestWithUser, file, cb) {
        cb(null, path.join(__dirname, `../assets/${req.params.path}`));
      },
      filename: function(req: RequestWithUser, file, cb) {
        cb(null, req.params.type + '_' + new Date().getTime() + path.extname(file.originalname));
      }
    })
  });
  static existsFile = fs.existsSync;
  static deleteSync = fs.unlinkSync;
  static deleteFile = promisify(fs.unlink);
  static renameFile = promisify(fs.rename);

  // static uploadPerson = multer({
  //   storage: multer.diskStorage({
  //     destination: function (req: RequestWithUser, file, cb) {
  //       cb(null, path.join(__dirname, '../assets/profile'));
  //     },
  //     filename: function (req: RequestWithUser, file, cb) {
  //       (req.user) ? cb(null, (req.user._id).toString() + '_' + new Date().getTime()) : cb(null, '_' + new Date().getTime());
  //     }
  //   })
  // });
  // static uploadItem = multer({
  //   storage: multer.diskStorage({
  //     destination: function (req: RequestWithUser, file, cb) {
  //       cb(null, path.join(__dirname, '../assets/items'));
  //     },
  //     filename: function (req: RequestWithUser, file, cb) {
  //       cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  //     }
  //   })
  // });
  // static deleteFile = promisify(fs.unlink);
  // static renameFile = promisify(fs.rename);
}
export default FilesMiddleware;
