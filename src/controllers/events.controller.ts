import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import path from 'path';

/**
 * DTOs
 */
import EventDto from '../communityDtos/event.dto'
import PartnerID from '../usersDtos/partner_id.params.dto'
import EventID from '../communityDtos/event_id.params.dto'

/**
 * Exceptions
 */
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
import NotFoundException from '../exceptions/NotFound.exception';

/**
 * Interfaces
 */
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Controller from '../interfaces/controller.interface';
import User from '../usersInterfaces/user.interface';
import Event from '../communityInterfaces/event.interface';

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
const uploadFile = FilesMiddleware.uploadItem;
const deleteFile = FilesMiddleware.deleteFile;
const createSlug = SlugHelper.eventSlug;
const offsetParams = OffsetHelper.offsetLimit;

/**
 * Models
 */
import userModel from '../models/user.model';

class EventsController implements Controller {
  public path = '/events';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/public/:offset`, this.readPublicEvents);
    this.router.get(`${this.path}/private/:offset`, authMiddleware, this.readPrivateEvents);
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsPartner, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(EventDto), this.createEvent);
    this.router.get(`${this.path}/public/:partner_id/:offset`, validationParamsMiddleware(PartnerID), this.readPublicEventsByStore);
    this.router.get(`${this.path}/private/:partner_id/:offset`, authMiddleware, validationParamsMiddleware(PartnerID), this.readPrivateEventsByStore);
    this.router.get(`${this.path}/:partner_id/:event_id`, validationParamsMiddleware(EventID), this.readEvent);
    this.router.put(`${this.path}/:partner_id/:event_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(EventID), accessMiddleware.belongsTo, uploadFile.single('imageURL'), validationBodyAndFileMiddleware(EventDto), itemsMiddleware.eventMiddleware, this.updateEvent);
    this.router.delete(`${this.path}/:partner_id/:event_id`, authMiddleware, accessMiddleware.onlyAsPartner, validationParamsMiddleware(EventID), accessMiddleware.belongsTo, itemsMiddleware.eventMiddleware, this.deleteEvent);
  }

  private readPrivateEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $and: [
          { 'events.access': { $in: ['public', 'private', access] } },
          { 'events.dateTime': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        event_id: '$events._id',
        event_slug: '$events.slug',
        event_imageURL: '$events.imageURL',
        title: '$events.title',
        subtitle: '$events.subtitle',
        description: '$events.description',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$events.createdAt',
        updatedAt: '$events.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readPublicEvents = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $and: [
          { 'events.access': 'public' },
          { 'events.dateTime': { $gt: offset.greater } }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        event_id: '$events._id',
        event_slug: '$events.slug',
        event_imageURL: '$events.imageURL',
        title: '$events.title',
        subtitle: '$events.subtitle',
        description: '$events.description',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$events.createdAt',
        updatedAt: '$events.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private createEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EventDto = request.body;
    const user: User = request.user;

    let error: Error, results: Object; // {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: user._id
    }, {
      $push: {
        events: {
          "imageURL": (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : '',
          "title": data.title,
          "subtitle": data.subtitle,
          "slug": await createSlug(request),
          "description": data.description,
          "access": data.access,
          "location": data.location,
          "dateTime": data.dateTime
        }
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(201).send({
      message: "Success! A new Event has been created!",
      code: 201
    });
  }

  private readPrivateEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;
    const access = (request.user.access === 'partner') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        event_id: '$events._id',
        event_slug: '$events.slug',
        event_imageURL: '$events.imageURL',
        title: '$events.title',
        subtitle: '$events.subtitle',
        description: '$events.description',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$events.createdAt',
        updatedAt: '$events.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readPublicEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: PartnerID["partner_id"] = request.params.partner_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = offsetParams(params);

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_imageURL: '$imageURL',
        partner_name: '$name',

        event_id: '$events._id',
        event_slug: '$event_slug',
        event_imageURL: '$events.imageURL',
        title: '$events.title',
        subtitle: '$events.subtitle',
        description: '$events.description',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$events.createdAt',
        updatedAt: '$events.updatedAt'
      }
    }, {
      $sort: {
        updatedAt: -1
      }
    },
    { $limit: offset.limit },
    { $skip: offset.skip }
    ]).exec().catch());

    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readEvent = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const partner_id: EventID["partner_id"] = request.params.partner_id;
    const event_id: EventID["event_id"] = request.params.event_id;

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(partner_id) ? new ObjectId(partner_id) : new ObjectId() },
              { 'events._id': ObjectId.isValid(event_id) ? new ObjectId(event_id) : new ObjectId() }
            ]
          },
          {
            $and: [
              { slug: partner_id },
              { 'events.slug': event_id }
            ]
          }
        ]

      }
    }, {
      $project: {
        _id: false,
        partner_id: '$_id',
        partner_slug: '$slug',
        partner_name: '$name',
        partner_imageURL: '$imageURL',

        event_id: '$events._id',
        event_slug: '$events.slug',
        event_imageURL: '$events.imageURL',
        title: '$events.title',
        subtitle: '$events.subtitle',
        description: '$events.description',
        location: '$events.location',
        dateTime: '$events.dateTime',
        access: '$events.access',

        createdAt: '$events.createdAt'
      }
    }
    ]).exec().catch());
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
    if ((currentEvent.event_imageURL && (currentEvent.event_imageURL).includes(partner_id)) && request.file) {
      //if (currentEvent.event_imageURL && request.file) {
      var imageFile = (currentEvent.event_imageURL).split('assets/items/');
      await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: partner_id,
        'events._id': event_id
      }, {
      '$set': {
        'events.$._id': event_id,
        'events.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentEvent.event_imageURL,
        'events.$.title': data.title,
        'events.$.slug': await createSlug(request),
        'events.$.subtitle': data.subtitle,
        'events.$.description': data.description,
        'events.$.access': data.access,
        'events.$.location': data.location,
        'events.$.dateTime': data.dateTime,
      }
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
    if (currentEvent.event_imageURL && (currentEvent.event_imageURL).includes(partner_id)) {
      //if (currentEvent.event_imageURL) {
      var imageFile = (currentEvent.event_imageURL).split('assets/items/');
      await deleteFile(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: partner_id
    }, {
      $pull: {
        events: {
          _id: event_id
        }
      }
    }).catch());
    if (error) return next(new UnprocessableEntityException(`DB ERROR || ${error}`));
    response.status(200).send({
      message: "Success! Event " + event_id + " has been deleted!",
      code: 200
    });
  }
}

export default EventsController;
