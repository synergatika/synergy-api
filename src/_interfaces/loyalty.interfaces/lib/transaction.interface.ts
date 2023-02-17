import { EarnPointsDto, RedeemPointsDto } from "_dtos";
import { Member, Partner, TransactionStatus, LoyaltyOffer } from "_interfaces";
import { ObjectId } from 'mongodb';

export enum LoyaltyTransactionType {
  EarnPoints = 'EarnPoints',
  RedeemPoints = 'RedeemPoints',
  RedeemPointsOffer = 'RedeemPointsOffer'
}

export interface LoyaltyTransaction {
  _id?: ObjectId;

  partner: Partner | ObjectId,
  member: Member | ObjectId,
  offer: LoyaltyOffer | ObjectId,

  // data: EarnPointsDto | RedeemPointsDto;
  points: number;
  amount: number;
  quantity: number;

  /** begin: To be Removed in Next Version */
  partner_id: string;
  partner_name: string;
  member_id: string;
  offer_id: string;
  offer_title: string;
  /** end: To be Removed in Next Version */

  type: LoyaltyTransactionType;
  status: TransactionStatus;

  tx: string;
  createdAt: Date;
}