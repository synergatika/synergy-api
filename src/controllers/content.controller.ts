import * as express from 'express';
import to from 'await-to-ts';
import path from 'path';
import { ObjectId } from 'mongodb';
import latinize from 'latinize';

/**
 * DTOs
 */
import { ContentDto, SectorsDto, ContentID } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import Controller from '../interfaces/controller.interface';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import { Content, Sector } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';

/**
 * Models
 */
import contentModel from '../models/content.model';
import sectorModel from '../models/sector.model';

class ContentController implements Controller {
  public path = '/content';
  public router = express.Router();
  private content = contentModel;
  private sector = sectorModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/sectors`, this.readSectors);
    this.router.post(`${this.path}/sectors`, authMiddleware, accessMiddleware.onlyAsAdmin, validationBodyMiddleware(SectorsDto), this.updateSectors);

    this.router.get(`${this.path}/`, this.readContent);
    this.router.get(`${this.path}/:content_id`, validationParamsMiddleware(ContentID), this.readContentById);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsAdmin, validationBodyMiddleware(ContentDto), this.createContent);
    this.router.put(`${this.path}/:content_id`, authMiddleware, accessMiddleware.onlyAsAdmin, validationParamsMiddleware(ContentID), validationBodyMiddleware(ContentDto), this.updateContent);
  }

  private readSectors = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    let error: Error, sectors: Sector[];
    [error, sectors] = await to(this.sector.find().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: sectors,
      code: 200
    });
  }

  private updateSectors = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const data: SectorsDto = request.body;

    let error: Error, sectors: Sector[];
    [error, sectors] = await to(this.sector.find().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    var toUpdate: Sector[] = data.sectors.filter((o) => { return o._id != '0' }).map((o) => { return { _id: o._id, slug: latinize((o.en_title).toLowerCase()).split(' ').join('_'), el_title: o.el_title, en_title: o.en_title } });
    var toDelete: ObjectId[] = sectors.map((o) => { return new ObjectId(o._id) });
    var toInsert: Sector[] = data.sectors.filter((o) => { return o._id == '0' }).map((o) => { return { slug: latinize((o.en_title).toLowerCase()).split(' ').join('_'), el_title: o.el_title, en_title: o.en_title } });

    let error_1: Error, result_1: any;
    [error_1, result_1] = await to(this.sector.deleteMany(
      { _id: { $in: toDelete } }
    ).catch());
    if (error_1) return next(new UnprocessableEntityException(`DB ERROR || ${error_1}`));

    let error_2: Error, result_2: any;
    [error_2, result_2] = await to(this.sector.insertMany(
      toInsert
    ).catch());
    if (error_2) return next(new UnprocessableEntityException(`DB ERROR || ${error_2}`));

    //toUpdate.forEach(element => {
    let error_3: Error, result_3: any;
    [error_3, result_3] = await to(this.sector.insertMany(
      toUpdate
    ).catch());
    //  });
    if (error_3) return next(new UnprocessableEntityException(`DB ERROR || ${error_3}`));

    response.status(200).send({
      message: 'Success! Sectors has been Updated!',
      code: 200
    });
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
