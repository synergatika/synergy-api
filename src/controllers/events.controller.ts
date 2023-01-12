import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import { PartnerID, EventID, EventDto } from '../_dtos/index';

/**
 * Exceptions
 */
import { NotFoundException, UnprocessableEntityException } from '../_exceptions/index';

/**
 * Interfaces
 */
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Controller from '../interfaces/controller.interface';
import { User, Event, Partner } from '../_interfaces/index';

/**
 * Middleware
 */
import validationBodyMiddleware from '../middleware/validators/body.validation';
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
const uploadFile = FilesMiddleware.uploadFile;
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const deleteSync = FilesMiddleware.deleteSync;
const createSlug = SlugHelper.eventSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';
import eventModel from '../models/event.model';

class EventsController implements Controller {
  public path = '/events';
  public router = express.Router();
  private user = userModel;
  private eventModel = eventModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readEvents);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readEvents);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner, this.declareStaticPath, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(EventDto), this.createEvent);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readEventsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readEventsByStore);
    this.router.get(`${this.path}/:partner_id/:event_id`, validationParamsMiddleware(EventID), this.readEvent);
    this.router.put(`${this.path}/:partner_id/:event_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(EventID), accessMiddleware.belongsTo, this.declareStaticPath, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(EventDto), itemsMiddleware.eventMiddleware, this.updateEvent);
    this.router.delete(`${this.path}/:partner_id/:event_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(EventID), accessMiddleware.belongsTo, itemsMiddleware.eventMiddleware, this.deleteEvent);

    this.router.post(`${this.path}/image`, authMiddleware, this.declareContentPath, uploadFile.array('content_image', 8), this.uploadContentImage);
  }

  private declareStaticPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'static';
    request.params['type'] = 'event';
    next();
  }

  private declareContentPath = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    request.params['path'] = 'content';
    request.params['type'] = 'event';
    next();
  }

  private uploadContentImage = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
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

    const access_filter: string[] = ['public'];
    if (request.user) access_filter.push('private');
    if (request.user && request.user.access == 'partner') access_filter.push('partners');
    /** ***** * ***** */

    let error: Error, events: Event[];
    [error, events] = await to(this.eventModel.find(
      { 'access': { $in: access_filter } }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    // [error, events] = await to(this.user.aggregate([{
    //   $unwind: '$events'
    // }, {
    //   $match: {
    //     $and: [
    //       { 'events.access': { $in: access_filter } },
    //       { 'events.dateTime': { $gt: offset.greater } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectEvent()
    //   }
    // }, {
    //   $sort: {
    //     updatedAt: -1
    //   }
    // },
    // { $limit: offset.limit },
    // { $skip: offset.skip }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  // private readPublicEvents = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

  //   /** Params & Filters */
  //   const params: string = request.params.offset;
  //   const offset: {
  //     limit: number, skip: number, greater: number, type: boolean
  //   } = offsetParams(params);
  //   /** ***** * ***** */

  //   let error: Error, events: Event[];
  //   [error, events] = await to(this.user.aggregate([{
  //     $unwind: '$events'
  //   }, {
  //     $match: {
  //       $and: [
  //         { 'events.access': 'public' },
  //         { 'events.dateTime': { $gt: offset.greater } }
  //       ]
  //     }
  //   }, {
  //     $project: {
  //       partner: this.projectPartner(),
  //       ...this.projectEvent()
  //     }
  //   }, {
  //     $sort: {
  //       updatedAt: -1
  //     }
  //   },
  //   { $limit: offset.limit },
  //   { $skip: offset.skip }
  //   ]).exec().catch());
  //   if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  //   response.status(200).send({
  //     data: events,
  //     code: 200
  //   });
  // }

  private createEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EventDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.eventModel.create({
      ...data,
      partner: user._id,
      "slug": await createSlug(request),
      "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
      "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : [],
    }).catch());
    // [error, results] = await to(this.user.updateOne({
    //   _id: user._id
    // }, {
    //   $push: {
    //     events: {
    //       "imageURL": (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : '',
    //       "title": data.title,
    //       "subtitle": data.subtitle,
    //       "slug": await createSlug(request),
    //       "description": data.description,
    //       "contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : 0,
    //       "access": data.access,
    //       "location": data.location,
    //       "dateTime": data.dateTime
    //     }
    //   }
    // }).catch());
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

    const access_filter: string[] = ['public'];
    if (request.user) access_filter.push('private');
    if (request.user && request.user.access == 'partner') access_filter.push('partners');

    const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    /** ***** * ***** */
    let _error: Error, _user: Partner;
    [_error, _user] = await to(this.user.find(partner_filter).catch());
    /** ***** * ***** */

    let error: Error, events: Event[];
    [error, events] = await to(this.eventModel.find(
      {
        $and: [
          { 'partner': _user },
          { 'access': { $in: access_filter } }
        ]
      }
    )
      .populate([{
        path: 'partner'
      }])
      .sort({ updatedAt: -1 })
      .limit(offset.limit)
      .skip(offset.skip)
      .catch());
    // [error, events] = await to(this.user.aggregate([{
    //   $unwind: '$events'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       { 'events.access': { $in: access_filter } }
    //     ]
    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectEvent()
    //   }
    // }, {
    //   $sort: {
    //     updatedAt: -1
    //   }
    // },
    // { $limit: offset.limit },
    // { $skip: offset.skip }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  // private readPublicEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
  //   const partner_id: PartnerID["partner_id"] = request.params.partner_id;

  //   /** Params & Filters */
  //   const params: string = request.params.offset;
  //   const offset: {
  //     limit: number, skip: number, greater: number, type: boolean
  //   } = offsetParams(params);

  //   const partner_filter = ObjectId.isValid(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
  //   /** ***** * ***** */

  //   let error: Error, events: Event[];
  //   [error, events] = await to(this.user.aggregate([{
  //     $unwind: '$events'
  //   }, {
  //     $match: {
  //       $and: [
  //         partner_filter,
  //         { 'events.access': 'public' }
  //       ]
  //     }
  //   }, {
  //     $project: {
  //       partner: this.projectPartner(),
  //       ...this.projectEvent()
  //     }
  //   }, {
  //     $sort: {
  //       updatedAt: -1
  //     }
  //   },
  //   { $limit: offset.limit },
  //   { $skip: offset.skip }
  //   ]).exec().catch());

  //   if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
  //   response.status(200).send({
  //     data: events,
  //     code: 200
  //   });
  // }

  checkObjectIdValidity(id: string) {
    if (ObjectId.isValid(id) && ((new ObjectId(id).toString()) == id))
      return true;

    return false;
  }

  private readEvent = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: EventID["partner_id"] = request.params.partner_id;
    const event_id: EventID["event_id"] = request.params.event_id;

    /** Params & Filters */
    const partner_filter = this.checkObjectIdValidity(partner_id) ? { _id: new ObjectId(partner_id) } : { slug: partner_id };
    const event_filter = this.checkObjectIdValidity(event_id) ? { '_id': new ObjectId(event_id) } : { 'slug': event_id };
    /** ***** * ***** */

    let error: Error, events: Event[];
    [error, events] = await to(this.eventModel.find(
      event_filter
    )
      .populate([{
        path: 'partner'
      }])
      .catch());
    // [error, events] = await to(this.user.aggregate([{
    //   $unwind: '$events'
    // }, {
    //   $match: {
    //     $and: [
    //       partner_filter,
    //       event_filter
    //     ]

    //   }
    // }, {
    //   $project: {
    //     partner: this.projectPartner(),
    //     ...this.projectEvent()
    //   }
    // }
    // ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    else if (!events.length) {
      return next(new NotFoundException('EVENT_NOT_EXISTS'));
    }

    response.status(200).send({
      data: events[0],
      code: 200
    });
  }

  private updateEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: EventID["partner_id"] = request.params.partner_id;
    const event_id: EventID["event_id"] = request.params.event_id;
    const data: EventDto = request.body;

    const currentEvent: Event = response.locals.event;
    if ((currentEvent['imageURL'] && (currentEvent['imageURL']).includes('assets/static/')) && request.file) {
      await this.removeFile(currentEvent);
    }

    if (currentEvent.contentFiles) {
      this.removeRichEditorFiles(currentEvent, data, true);
    }

    let error: Error, event: Event; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, event] = await to(this.eventModel.findOneAndUpdate({
      _id: event_id
    }, {
      $set: {
        ...data,
        imageURL: (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentEvent['imageURL'],
        'slug': await createSlug(request),
        'contentFiles': (data.contentFiles) ? data.contentFiles.split(',') : [],
      }
    }, {
      "new": true
    }).catch());
    // [error, results] = await to(this.user.updateOne(
    //   {
    //     _id: partner_id,
    //     'events._id': event_id
    //   }, {
    //   '$set': {
    //     'events.$._id': event_id,
    //     'events.$.imageURL': (request.file) ? `${process.env.API_URL}assets/static/${request.file.filename}` : currentEvent.imageURL,
    //     'events.$.title': data.title,
    //     'events.$.slug': await createSlug(request),
    //     'events.$.subtitle': data.subtitle,
    //     'events.$.description': data.description,
    //     "events.$.contentFiles": (data.contentFiles) ? data.contentFiles.split(',') : 0,
    //     'events.$.access': data.access,
    //     'events.$.location': data.location,
    //     'events.$.dateTime': data.dateTime,
    //   }
    // }).catch());
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
      await this.removeFile(currentEvent);
    }

    if (currentEvent.contentFiles) {
      this.removeRichEditorFiles(currentEvent, null, false);
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.eventModel.findOneAndDelete({ _id: new ObjectId(event_id) }).catch());
    // [error, results] = await to(this.user.updateOne({
    //   _id: partner_id
    // }, {
    //   $pull: {
    //     events: {
    //       _id: event_id
    //     }
    //   }
    // }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Event " + event_id + " has been deleted!",
      code: 200
    });
  }

  /**
   *  
   * Local Function Section 
   *
   * */

  /** Project Partner (Local Function) */
  private projectPartner() {
    return {
      _id: '$_id',
      name: '$name',
      email: '$email',
      slug: '$slug',
      imageURL: '$imageURL',
      payments: '$payments',
      address: '$address',
      contacts: '$contacts',
      phone: '$phone',
    };
  }

  /** Project Event (Local Function) */
  private projectEvent() {
    return {
      _id: '$events._id',
      slug: '$events.slug',
      imageURL: '$events.imageURL',
      title: '$events.title',
      subtitle: '$events.subtitle',
      description: '$events.description',
      location: '$events.location',
      dateTime: '$events.dateTime',
      access: '$events.access',

      createdAt: '$events.createdAt',
      updatedAt: '$events.updatedAt'
    };
  }

  /** Remove File (Local Function) */
  private async removeFile(currentEvent: Event) {
    var imageFile = (currentEvent['imageURL']).split('assets/static/');
    const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
    if (existFile(file)) await deleteFile(file);
  }

  /** Remove Content Files (Local Function) */
  private async removeRichEditorFiles(currentEvent: Event, newEvent: EventDto, isUpdated: boolean) {
    var toDelete: string[] = [];

    if (isUpdated) {
      (currentEvent.contentFiles).forEach((element: string) => {
        if ((newEvent.contentFiles).indexOf(element) < 0) {
          var imageFile = (element).split('assets/content/');
          const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
          toDelete.push(file);
        }
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    } else {
      (currentEvent.contentFiles).forEach((element: string) => {
        var imageFile = (element).split('assets/content/');
        const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
        toDelete.push(file);
      });
      toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
    }
  }
}

export default EventsController;
