import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
// import path from 'path';

/**
 * DTOs
 */
import { PartnerID, EventID, EventDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Controller from '../interfaces/controller.interface';
import { User, Event, Partner, ItemAccess, UserAccess } from '../_interfaces/index';

/**
 * Middleware
 */
// import validationBodyMiddleware from '../middleware/validators/body.validation';
import validationParamsMiddleware from '../middleware/validators/params.validation';
import validationBodyAndFileMiddleware from '../middleware/validators/body_file.validation';
import authMiddleware from '../middleware/auth/auth.middleware';
import accessMiddleware from '../middleware/auth/access.middleware';
import itemsMiddleware from '../middleware/items/items.middleware';
import FilesMiddleware from '../middleware/items/files.middleware';
import SlugHelper from '../middleware/items/slug.helper';
import OffsetHelper from '../middleware/items/offset.helper';

/**
 * Helper's Instances
 */
// const uploadFile = FilesMiddleware.uploadFile;
const uploadFile = FilesMiddleware.uploadFile;
// const existFile = FilesMiddleware.existsFile;
// const deleteFile = FilesMiddleware.deleteFile;
// const deleteSync = FilesMiddleware.deleteSync;
const createSlug = SlugHelper.eventSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import eventModel from '../models/event.model';

/**
 * Files Util
 */
import FilesUtil from '../utils/files.util';
const filesUtil = new FilesUtil();

class EventsController implements Controller {
  public path = '/events';
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`,
      this.readEvents);

    this.router.get(`${this.path}/private/:offset`,
      authMiddleware,
      this.readEvents);

    this.router.post(`${this.path}/`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      uploadFile('static', 'event').single('imageURL'),
      validationBodyAndFileMiddleware(EventDto),
      this.createEvent);

    this.router.get(`${this.path}/public/:partner_id/:offset`,
      validationParamsMiddleware(PartnerID),
      this.readEventsByStore);

    this.router.get(`${this.path}/private/:partner_id/:offset`,
      authMiddleware,
      validationParamsMiddleware(PartnerID),
      this.readEventsByStore);

    this.router.get(`${this.path}/:partner_id/:event_id`,
      validationParamsMiddleware(EventID),
      this.readEvent);

    this.router.put(`${this.path}/:partner_id/:event_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(EventID),
      accessMiddleware.belongsTo,
      uploadFile('static', 'event').single('imageURL'),
      validationBodyAndFileMiddleware(EventDto),
      itemsMiddleware.eventMiddleware,
      this.updateEvent);

    this.router.delete(`${this.path}/:partner_id/:event_id`,
      authMiddleware, accessMiddleware.onlyAsPartner,
      validationParamsMiddleware(EventID),
      accessMiddleware.belongsTo,
      itemsMiddleware.eventMiddleware,
      this.deleteEvent);

    this.router.post(`${this.path}/image`,
      authMiddleware,
      uploadFile('content', 'event').array('content_image', 8),
      this.uploadContentImages);
  }

  /**
   * 
   * Secondary Functions (General)
   * 
   */

  private checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }

  /**
   * 
   * Main Functions (Route: `/events`)
   * 
   */

  private uploadContentImages = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    response.status(200).send({
      data: {
        files: request.files,
        path: `${process.env.API_URL}assets/content/`
      },
      success: true
    });
  }

  private readEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access == 'partner') access_filter.push(ItemAccess.PARTNERS);
    /** ***** * ***** */

    let error: Error, events: Event[];
    [error, events] = await to(eventModel.find({
      "$and": [
        { "access": { "$in": access_filter } },
        { "dateTime": { "$gt": offset.greater } },
        { "published": { "$eq": true } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "updatedAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: events.filter(o => (o['partner'] as Partner).activated),
      code: 200
    });
  }

  private createEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EventDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(eventModel.create({
      ...data,
      "partner": user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(201).send({
      message: "Success! A new Event has been created!",
      code: 201
    });
  }

  private readEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    /** Params & Filters */
    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number, type: boolean
    } = offsetParams(params);

    const access_filter: ItemAccess[] = [ItemAccess.PUBLIC];
    if (request.user) access_filter.push(ItemAccess.PRIVATE);
    if (request.user && request.user.access == UserAccess.PARTNER) access_filter.push(ItemAccess.PARTNERS);

    const partner_filter = ObjectId.isValid(partner_id) ? { "_id": new ObjectId(partner_id) } : { "slug": partner_id };
    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(userModel.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, events: Event[];
    [error, events] = await to(eventModel.find({
      "$and": [
        { "partner": _user },
        { "access": { "$in": access_filter } },
        { "dateTime": { "$gt": offset.greater } },
        { "published": { "$eq": true } }
      ]
    }).populate([{
      "path": 'partner'
    }])
      .sort({ "updatedAt": -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .lean()
      .catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readEvent = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: EventID["partner_id"] = request.params.partner_id;
    const event_id: EventID["event_id"] = request.params.event_id;

    /** Params & Filters */
    const partner_filter = this.checkObjectIdValidity(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    const event_filter = this.checkObjectIdValidity(event_id) ? { '_id': new ObjectId(event_id) } : { 'slug': event_id };
    /** ***** * ***** */

    let error: Error, event: Event;
    [error, event] = await to(eventModel.findOne(
      event_filter
    ).populate([{
      "path": 'partner'
    }])
      .lean()
      .catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      data: event,
      code: 200
    });
  }

  private updateEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: EventID["partner_id"] = request.params.partner_id;
    const event_id: EventID["event_id"] = request.params.event_id;
    const data: EventDto = request.body;

    const currentEvent: Event = response.locals.event;
    if ((currentEvent["imageURL"] && (currentEvent["imageURL"]).includes('assets/static/')) && request.file) {
      await filesUtil.removeFile(currentEvent);
    }

    if (currentEvent.contentFiles) {
      filesUtil.removeRichEditorFiles(currentEvent, (data.contentFiles) ? data.contentFiles.split(',') : [], true);
    }

    let error: Error, event: Event; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, event] = await to(eventModel.findOneAndUpdate({
      "_id": event_id
    }, {
      "$set": {
        ...data,
        "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentEvent['imageURL'],
        'slug': await createSlug(request),
        'contentFiles': (data.contentFiles) ? data.contentFiles.split(',') : [],
      }
    }, {
      "new": true
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Event " + event_id + " has been updated!",
      code: 200
    });
  }

  private deleteEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: EventID["partner_id"] = request.params.partner_id;
    const event_id: EventID["event_id"] = request.params.event_id;

    const currentEvent: Event = response.locals.event;
    if (currentEvent.imageURL && (currentEvent.imageURL).includes('assets/static/')) {
      await filesUtil.removeFile(currentEvent);
    }

    if (currentEvent.contentFiles) {
      filesUtil.removeRichEditorFiles(currentEvent, currentEvent.contentFiles, false);
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(eventModel.findOneAndDelete({ _id: new ObjectId(event_id) }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));

    response.status(200).send({
      message: "Success! Event " + event_id + " has been deleted!",
      code: 200
    });
  }
}

export default EventsController;
