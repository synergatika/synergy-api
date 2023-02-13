import { EarnPointsDto, RedeemPointsDto } from "_dtos";
import { Member, Partner, TransactionStatus, LoyaltyOffer } from "_interfaces";
import { ObjectId } from 'mongodb';

export enum LoyaltyTransactionType {
  EarnPoints = 'EarnPoints',
  RedeemPoints = 'RedeemPoints',
  RedeemPointsOffer = 'RedeemPointsOffer'
}

export interface LoyaltyTransaction {
  _id?: string;

  partner: ObjectId | Partner,
  member: Member,
  offer: ObjectId | LoyaltyOffer,

  data: EarnPointsDto | RedeemPointsDto;

  /** begin: To be Removed in Next Version */
  partner_id: string;
  partner_name: string;
  member_id: string;
  offer_id: string;
  offer_title: string;
  /** end: To be Removed in Next Version */

  points: number;
  amount: number;
  quantity: number;

  type: LoyaltyTransactionType;
  status: TransactionStatus;

  tx: string;
  createdAt: Date;
}