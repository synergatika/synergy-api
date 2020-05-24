import * as express from 'express';
import to from 'await-to-ts'
import { ObjectId } from 'mongodb';
import latinize from 'latinize';

// Dtos
import RegisterPartnerWithPasswordDto from 'authDtos/registerPartnerWithPassword.dto';
import OfferDto from '../loyaltyDtos/offer.dto';
import PostDto from '../communityDtos/post.dto';
import EventDto from '../communityDtos/event.dto';
import CampaignDto from '../microcreditDtos/campaign.dto';
// Interfaces
import RequestWithUser from '../interfaces/requestWithUser.interface';
import User from '../usersInterfaces/user.interface';
// Models
import userModel from '../models/user.model';

class SlugHelper {
  static partnerSlug = async (request: express.Request) => {
    const data: any = request.body;

    let _slug = latinize((data.name).toLowerCase()).split(' ').join('_');
    const slugs = await userModel.find({ $or: [{ 'slug': _slug }, { 'slug': { $regex: _slug + "-.*" } }] }).select({ "_id": 1, "name": 1, "slug": 1 });

    if (!slugs.length) return _slug;
    else {
      var partner = slugs.filter(function(el) {
        return el._id == request.params.partner_id
      });
      return (partner.length) ? partner[0]["slug"] : _slug + "-" + (slugs.length + 1);
    }
  }

  static offerSlug = async (request: RequestWithUser) => {
    const data: OfferDto = request.body;
    const user: User = request.user;

    let _slug = latinize((data.title).toLowerCase()).split(' ').join('_');
    const slugs = await userModel.aggregate([
      { $unwind: '$offers' },
      {
        $match: { $and: [{ _id: (user._id) }, { $or: [{ 'offers.slug': _slug }, { 'offers.slug': { $regex: _slug + "-.*" } }] }] }
      },
      { $project: { _id: '$_id', offer_id: '$offers._id', title: '$offers.title', slug: '$offers.slug' } }
    ]);

    if (!slugs.length) return _slug;
    else {
      var offer = slugs.filter(function(el) {
        return el.offer_id == request.params.offer_id
      });
      return (offer.length) ? offer[0]["slug"] : _slug + "-" + (slugs.length + 1);
    }
  }

  static postSlug = async (request: RequestWithUser) => {
    const data: PostDto = request.body;
    const user: User = request.user;

    let _slug = latinize((data.title).toLowerCase()).split(' ').join('_');
    const slugs = await userModel.aggregate([
      { $unwind: '$posts' },
      { $match: { $and: [{ _id: (user._id) }, { $or: [{ 'posts.slug': _slug }, { 'posts.slug': { $regex: _slug + "-.*" } }] }] } },
      { $project: { _id: '$_id', post_id: '$posts._id', title: '$posts.title', slug: '$posts.slug' } }
    ]);

    if (!slugs.length) return _slug;
    else {
      var post = slugs.filter(function(el) {
        return el.post_id == request.params.post_id
      });
      return (post.length) ? post[0]["slug"] : _slug + "-" + (slugs.length + 1);
    }
  }

  static eventSlug = async (request: RequestWithUser) => {
    const data: EventDto = request.body;
    const user: User = request.user;

    let _slug = latinize((data.title).toLowerCase()).split(' ').join('_');
    const slugs = await userModel.aggregate([
      { $unwind: '$events' },
      { $match: { $and: [{ _id: (user._id) }, { $or: [{ 'events.slug': _slug }, { 'events.slug': { $regex: _slug + "-.*" } }] }] } },
      { $project: { _id: '$_id', event_id: '$events._id', title: '$events.title', slug: '$events.slug' } }
    ]);

    if (!slugs.length) return _slug;
    else {
      var event = slugs.filter(function(el) {
        return el.event_id == request.params.event_id
      });
      return (event.length) ? event[0]["slug"] : _slug + "-" + (slugs.length + 1);
    }
  }

  static microcreditSlug = async (request: RequestWithUser) => {
    const data: CampaignDto = request.body;
    const user: User = request.user;

    let _slug = latinize((data.title).toLowerCase()).split(' ').join('_');
    const slugs = await userModel.aggregate([
      { $unwind: '$microcredit' },
      { $match: { $and: [{ _id: (user._id) }, { $or: [{ 'microcredit.slug': _slug }, { 'microcredit.slug': { $regex: _slug + "-.*" } }] }] } },
      { $project: { _id: '$_id', campaign_id: '$microcredit._id', title: '$microcredit.title', slug: '$microcredit.slug' } }
    ]);

    if (!slugs.length) return _slug;
    else {
      var campaign = slugs.filter(function(el) {
        return el.campaign_id == request.params.campaign_id
      });
      return (campaign.length) ? campaign[0]["slug"] : _slug + "-" + (slugs.length + 1);
    }
  }
}
export default SlugHelper;
