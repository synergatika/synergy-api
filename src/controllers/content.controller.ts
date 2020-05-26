import * as express from 'express';
import to from 'await-to-ts';
import path from 'path';
import { ObjectId } from 'mongodb';

// Dtos
import ContentID from '../contentDtos/content_id.params.dto';
import ContentDto from '../contentDtos/content.dto';
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';
// Interfaces
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Content from '../contentInterfaces/content.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
// Models
import contentModel from '../models/content.model';

class ContentController implements Controller {
  public path = '/content';
  public router = express.Router();
  private content = contentModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/`, this.readContent);
    this.router.get(`${this.path}/:content_id`, validationParamsMiddleware(ContentID), this.readContentById);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsAdmin, validationBodyMiddleware(ContentDto), this.createContent);
    this.router.put(`${this.path}/:content_id`, authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(ContentID), validationBodyMiddleware(ContentDto), this.updateContent);
  }

  private readContent = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    let error: Error, content: Content[];
    [error, content] = await to(this.content.find().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: content,
      code: 200
    });
  }

  private readContentById = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const content_id: ContentID["content_id"] = request.params.content_id;

    let error: Error, content: Content;
    [error, content] = await to(this.content.findOne({
      $or: [
        { _id: ObjectId.isValid(content_id) ? new ObjectId(content_id) : new ObjectId() },
        { name: content_id }
      ]
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: content,
      code: 200
    });
  }

  private createContent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: Content = request.body;

    let error: Error, results: Content;
    [error, results] = await to(this.content.create({
      ...data
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: 'Success! A new Content has been created!',
      code: 200
    });
  }

  private updateContent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const content_id: ContentID["content_id"] = request.params.content_id;
    const data: Content = request.body;

    let error: Error, results: Object;
    [error, results] = await to(this.content.updateOne({
      _id: content_id
    }, {
      $set: {
        name: data.name,
        el_title: data.el_title,
        en_title: data.en_title,
        el_content: data.el_content,
        en_content: data.en_content
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Content " + content_id + " has been updated!",
      code: 200
    });
  }
}

export default ContentController;
