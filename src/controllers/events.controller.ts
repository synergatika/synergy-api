import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
var latinize = require('latinize');

// Dtos
import EventDto from '../communityDtos/event.dto'
import MerchantID from '../usersDtos/merchant_id.params.dto'
import EventID from '../communityDtos/event_id.params.dto'
// Exceptions
import UnprocessableEntityException from '../exceptions/UnprocessableEntity.exception';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import Controller from '../interfaces/controller.interface';
import User from '../usersInterfaces/user.interface';
import Event from '../communityInterfaces/event.interface';
// Middleware
import validationBodyMiddleware from '../middleware/body.validation';
import validationParamsMiddleware from '../middleware/params.validation';
import validationBodyAndFileMiddleware from '../middleware/body_file.validation';
import authMiddleware from '../middleware/auth.middleware';
import accessMiddleware from '../middleware/access.middleware';
import itemsMiddleware from '../middleware/items.middleware';
// Models
import userModel from '../models/user.model';

//Path
var path = require('path');

// Upload File
import multer from 'multer';
var storage = multer.diskStorage({
  destination: function(req: RequestWithUser, file, cb) {
    cb(null, path.join(__dirname, '../assets/items'));
  },
  filename: function(req: RequestWithUser, file, cb) {

    cb(null, (req.user._id).toString() + '_' + new Date().getTime());
  }
});
var upload = multer({ storage: storage });

// Remove File
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

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
    this.router.post(`${this.path}/`, authMiddleware, accessMiddleware.onlyAsMerchant, upload.single('imageURL'), validationBodyAndFileMiddleware(EventDto), this.createEvent);
    this.router.get(`${this.path}/public/:merchant_id/:offset`, validationParamsMiddleware(MerchantID), this.readPublicEventsByStore);
    this.router.get(`${this.path}/private/:merchant_id/:offset`, authMiddleware, validationParamsMiddleware(MerchantID), this.readPrivateEventsByStore);
    this.router.get(`${this.path}/:merchant_id/:event_id`, validationParamsMiddleware(EventID), this.readEvent);
    this.router.put(`${this.path}/:merchant_id/:event_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(EventID), accessMiddleware.belongsTo, upload.single('imageURL'), validationBodyAndFileMiddleware(EventDto), itemsMiddleware.eventMiddleware, this.updateEvent);
    this.router.delete(`${this.path}/:merchant_id/:event_id`, authMiddleware, accessMiddleware.onlyAsMerchant, validationParamsMiddleware(EventID), accessMiddleware.belongsTo, itemsMiddleware.eventMiddleware, this.deleteEvent);
  }

  // offset: [number, number, number] = [items per page, current page, active or all]
  private offsetParams = (params: string) => {
    if (!params) return { limit: Number.MAX_SAFE_INTEGER, skip: 0, greater: 0 }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      limit: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])) + parseInt(splittedParams[0]),
      skip: (parseInt(splittedParams[0]) === 0) ? 0 : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0
    };
  }

  private readPrivateEvents = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

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
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readPublicEvents = async (request: express.Request, response: express.Response, next: express.NextFunction) => {

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

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
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private latinize = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const data: EventDto = request.body;
    const user: User = request.user;

    let _slug = latinize((data.title).toLowerCase()).split(' ').join('_');
    const slugs = await this.user.aggregate([
      { $unwind: '$events' },
      { $match: { $and: [{ slug: (user._id) }, { $or: [{ 'events.slug': _slug }, { 'events.slug': { $regex: _slug + "-.*" } }] }] } },
      { $project: { _id: '$_id', title: '$events.title', slug: '$events.slug' } }
    ]);

    if (!slugs.length) return _slug;
    else return _slug + "-" + (slugs.length + 1);
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
            "slug": await this.latinize(request, response, next),
            "description": data.description,
            "access": data.access,
            "location": data.location,
            "dateTime": data.dateTime
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(201).send({
      message: "Success! A new Event has been created!",
      code: 201
    });
  }

  private readPrivateEventsByStore = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;
    const access = (request.user.access === 'merchant') ? 'partners' : 'random';

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'events.access': { $in: ['public', 'private', access] } },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

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
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readPublicEventsByStore = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: MerchantID["merchant_id"] = request.params.merchant_id;

    const params: string = request.params.offset;
    const offset: {
      limit: number, skip: number, greater: number
    } = this.offsetParams(params);

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'events.access': 'public' },
              { 'events.dateTime': { $gt: offset.greater } }
            ]
          }
        ]
      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_imageURL: '$imageURL',
        merchant_name: '$name',

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

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: events,
      code: 200
    });
  }

  private readEvent = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const merchant_id: EventID["merchant_id"] = request.params.merchant_id;
    const event_id: EventID["event_id"] = request.params.event_id;

    let error: Error, events: Event[];
    [error, events] = await to(this.user.aggregate([{
      $unwind: '$events'
    }, {
      $match: {
        $or: [
          {
            $and: [
              { _id: ObjectId.isValid(merchant_id) ? new ObjectId(merchant_id) : new ObjectId() },
              { 'events._id': ObjectId.isValid(event_id) ? new ObjectId(event_id) : new ObjectId() }
            ]
          },
          {
            $and: [
              { slug: merchant_id },
              { 'events.slug': event_id }
            ]
          }
        ]

      }
    }, {
      $project: {
        _id: false,
        merchant_id: '$_id',
        merchant_slug: '$slug',
        merchant_name: '$name',
        merchant_imageURL: '$imageURL',

        event_id: '$events._id',
        event_slug: '$events.slug',
        event_imageURL: '$events.imageURL',
        title: '$events.title',
        subtitle: '$events.subtitle',
        description: '$events.description',
        access: '$events.access',
        location: '$events.location',
        dateTime: '$events.dateTime',

        createdAt: '$posts.createdAt'
      }
    }
    ]).exec().catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      data: events[0],
      code: 200
    });
  }

  private updateEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: EventID["merchant_id"] = request.params.merchant_id;
    const event_id: EventID["event_id"] = request.params.event_id;
    const data: EventDto = request.body;

    const currentEvent: Event = response.locals.event;
    if (currentEvent.event_imageURL && request.file) {
      var imageFile = (currentEvent.event_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne(
      {
        _id: merchant_id,
        'events._id': event_id
      }, {
        '$set': {
          'events.$._id': event_id,
          'events.$.imageURL': (request.file) ? `${process.env.API_URL}assets/items/${request.file.filename}` : currentEvent.event_imageURL,
          'events.$.title': data.title,
          'events.$.description': data.description,
          'events.$.access': data.access,
          'events.$.location': data.location,
          'events.$.dateTime': data.dateTime,
        }
      }).catch());

    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Event " + event_id + " has been updated!",
      code: 200
    });
  }

  private deleteEvent = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const merchant_id: EventID["merchant_id"] = request.params.merchant_id;
    const event_id: EventID["event_id"] = request.params.event_id;

    const currentEvent: Event = response.locals.event;
    if (currentEvent.event_imageURL) {
      var imageFile = (currentEvent.event_imageURL).split('assets/items/');
      await unlinkAsync(path.join(__dirname, '../assets/items/' + imageFile[1]));
    }

    let error: Error, results: Object; // results = {"n": 1, "nModified": 1, "ok": 1}
    [error, results] = await to(this.user.updateOne({
      _id: merchant_id
    }, {
        $pull: {
          events: {
            _id: event_id
          }
        }
      }).catch());
    if (error) next(new UnprocessableEntityException('DB ERROR'));
    response.status(200).send({
      message: "Success! Event " + event_id + " has been deleted!",
      code: 200
    });
  }
}

export default EventsController;
