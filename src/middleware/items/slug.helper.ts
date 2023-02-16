import * as express from 'express';
import latinize from 'latinize';

/**
 * DTOs
 */
import { OfferDto, PostDto, EventDto, CampaignDto } from '../../_dtos/index';

/**
 * Interfaces
 */
import RequestWithUser from '../../interfaces/requestWithUser.interface';
import { User } from '../../_interfaces/index';

/**
 * Models
 */
import userModel from '../../models/user.model';
import postModel from '../../models/post.model';
import eventModel from '../../models/event.model';
import microcredit from '../../models/campaign.model';
import offerModel from '../../models/offer.model';
import microcreditModel from '../../models/campaign.model';


class SlugHelper {

  static string_to_slug = (str: string) => {

    str = str.replace(/^\s+|\s+$/g, '') // TRIM WHITESPACE AT BOTH ENDS.
      .toLowerCase();            // CONVERT TO LOWERCASE

    const from = ["ου", "ΟΥ", "Ού", "ού", "αυ", "ΑΥ", "Αύ", "αύ", "ευ", "ΕΥ", "Εύ", "εύ", "α", "Α", "ά", "Ά", "β", "Β", "γ", "Γ", "δ", "Δ", "ε", "Ε", "έ", "Έ", "ζ", "Ζ", "η", "Η", "ή", "Ή", "θ", "Θ", "ι", "Ι", "ί", "Ί", "ϊ", "ΐ", "Ϊ", "κ", "Κ", "λ", "Λ", "μ", "Μ", "ν", "Ν", "ξ", "Ξ", "ο", "Ο", "ό", "Ό", "π", "Π", "ρ", "Ρ", "σ", "Σ", "ς", "τ", "Τ", "υ", "Υ", "ύ", "Ύ", "ϋ", "ΰ", "Ϋ", "φ", "Φ", "χ", "Χ", "ψ", "Ψ", "ω", "Ω", "ώ", "Ώ"];
    const to = ["ou", "ou", "ou", "ou", "au", "au", "au", "au", "eu", "eu", "eu", "eu", "a", "a", "a", "a", "b", "b", "g", "g", "d", "d", "e", "e", "e", "e", "z", "z", "i", "i", "i", "i", "th", "th", "i", "i", "i", "i", "i", "i", "i", "k", "k", "l", "l", "m", "m", "n", "n", "ks", "ks", "o", "o", "o", "o", "p", "p", "r", "r", "s", "s", "s", "t", "t", "y", "y", "y", "y", "y", "y", "y", "f", "f", "x", "x", "ps", "ps", "o", "o", "o", "o"];

    for (var i = 0; i < from.length; i++) {

      while (str.indexOf(from[i]) !== -1) {

        str = str.replace(from[i], to[i]);    // CONVERT GREEK CHARACTERS TO LATIN LETTERS

      }

    }

    str = str.replace(/[^a-z0-9 -]/g, '') // REMOVE INVALID CHARS
      .replace(/\s+/g, '_')        // COLLAPSE WHITESPACE AND REPLACE BY DASH - 
      .replace(/-+/g, '_');        // COLLAPSE DASHES

    return str;

  }

  static partnerSlug = async (request: express.Request) => {
    const data: any = request.body;

    let _slug = latinize((SlugHelper.string_to_slug(data.name)).toLowerCase()).split(' ').join('_');
    const slugs = await userModel.find({
      $or: [{
        'slug': _slug
      }, {
        'slug': { $regex: _slug + "-.*" }
      }]
    }).select({ "_id": 1, "name": 1, "slug": 1 });

    if (!slugs.length) return _slug;
    else {
      var partner = slugs.filter(function (el) {
        return el._id == request.params.partner_id
      });
      return (partner.length) ? partner[0]["slug"] : `${_slug}-${(slugs.length + 1)}`;
    }
  }

  static offerSlug = async (request: RequestWithUser) => {
    const data: OfferDto = request.body;
    const user: User = request.user;

    let _slug = latinize((SlugHelper.string_to_slug(data.title)).toLowerCase()).split(' ').join('_');
    const slugs = await offerModel.find(
      {
        // $and: [{
        //   partner: (user._id)
        // }, {
        $or: [{
          'slug': _slug
        }, {
          'slug': { $regex: _slug + "-.*" }
        }]
        // }]
      }
    );

    // const slugs = await userModel.aggregate([
    //   { $unwind: '$offers' },
    //   {
    //     $match: { $and: [{ _id: (user._id) }, { $or: [{ 'offers.slug': _slug }, { 'offers.slug': { $regex: _slug + "-.*" } }] }] }
    //   },
    //   { $project: { _id: '$_id', offer_id: '$offers._id', title: '$offers.title', slug: '$offers.slug' } }
    // ]);

    if (!slugs.length) return _slug;
    else {
      var offer = slugs.filter(function (el) {
        return el._id == request.params.offer_id
      });
      return (offer.length) ? offer[0]["slug"] : `${_slug}-${(slugs.length + 1)}`;
    }
  }

  static postSlug = async (request: RequestWithUser) => {
    const data: PostDto = request.body;
    const user: User = request.user;

    let _slug = latinize((SlugHelper.string_to_slug(data.title)).toLowerCase()).split(' ').join('_');
    const slugs = await postModel.find(
      {
        // $and: [
        //   { partner: (user._id) },
        //   {
        $or: [{
          'slug': _slug
        }, {
          'slug': { $regex: _slug + "-.*" }
        }]
        // }]
      }
    );

    // const slugs = await userModel.aggregate([
    //   { $unwind: '$posts' },
    //   { $match: { $and: [{ _id: (user._id) }, { $or: [{ 'posts.slug': _slug }, { 'posts.slug': { $regex: _slug + "-.*" } }] }] } },
    //   { $project: { _id: '$_id', post_id: '$posts._id', title: '$posts.title', slug: '$posts.slug' } }
    // ]);

    if (!slugs.length) return _slug;
    else {
      var post = slugs.filter(function (el) {
        return el._id == request.params.post_id
      });
      return (post.length) ? post[0]["slug"] : `${_slug}-${(slugs.length + 1)}`;
    }
  }

  static eventSlug = async (request: RequestWithUser) => {
    const data: EventDto = request.body;
    const user: User = request.user;

    let _slug = latinize((SlugHelper.string_to_slug(data.title)).toLowerCase()).split(' ').join('_');
    const slugs = await eventModel.find(
      {
        // $and: [{
        //   partner: (user._id)
        // }, {
        $or: [{
          'slug': _slug
        }, {
          'slug': { $regex: _slug + "-.*" }
        }]
        // }]
      }
    );

    // const slugs = await userModel.aggregate([
    //   { $unwind: '$events' },
    //   { $match: { $and: [{ _id: (user._id) }, { $or: [{ 'events.slug': _slug }, { 'events.slug': { $regex: _slug + "-.*" } }] }] } },
    //   { $project: { _id: '$_id', event_id: '$events._id', title: '$events.title', slug: '$events.slug' } }
    // ]);

    if (!slugs.length) return _slug;
    else {
      var event = slugs.filter(function (el) {
        return el._id == request.params.event_id
      });
      return (event.length) ? event[0]["slug"] : `${_slug}-${(slugs.length + 1)}`;
    }
  }

  static microcreditSlug = async (request: RequestWithUser) => {
    const data: CampaignDto = request.body;
    const user: User = request.user;

    let _slug = latinize((SlugHelper.string_to_slug(data.title)).toLowerCase()).split(' ').join('_');
    const slugs = await microcreditModel.find(
      {
        // $and: [{
        //   partner: (user._id)
        // }, {
        $or: [{
          'slug': _slug
        }, {
          'slug': { $regex: _slug + "-.*" }
        }]
        // }]
      }
    );

    // const slugs = await userModel.aggregate([
    //   { $unwind: '$microcredit' },
    //   { $match: { $and: [{ _id: (user._id) }, { $or: [{ 'microcredit.slug': _slug }, { 'microcredit.slug': { $regex: _slug + "-.*" } }] }] } },
    //   { $project: { _id: '$_id', campaign_id: '$microcredit._id', title: '$microcredit.title', slug: '$microcredit.slug' } }
    // ]);

    if (!slugs.length) return _slug;
    else {
      var campaign = slugs.filter(function (el) {
        return el._id == request.params.campaign_id
      });
      return (campaign.length) ? campaign[0]["slug"] : `${_slug}-${(slugs.length + 1)}`;
    }
  }
}
export default SlugHelper;

