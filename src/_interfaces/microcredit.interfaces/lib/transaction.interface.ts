import { EarnTokensDto, RedeemTokensDto } from "_dtos";
import { MicrocreditSupport } from "./support.interface";
import { ObjectId } from 'mongodb';
import { TransactionStatus } from "_interfaces/authentication.interfaces";

export enum MicrocreditTransactionType {
  PromiseFund = 'PromiseFund',
  ReceiveFund = 'ReceiveFund',
  RevertFund = 'RevertFund',
  SpendFund = 'SpendFund'
}

export interface MicrocreditTransaction {
  _id?: string;

  // campaign: MicrocreditCampaign,
  support: MicrocreditSupport | ObjectId,
  // member: Member,

  // data: EarnTokensDto | RedeemTokensDto;
  tokens: number;
  payoff: number;

  /** begin: To be Removed in Next Version */
  partner_id: string;
  partner_name: string;
  member_id: string;
  campaign_id: string;
  campaign_title: string;
  support_id?: string,
  /** end: To be Removed in Next Version */

  type: MicrocreditTransactionType;
  status: TransactionStatus;

  contractIndex?: number;
  contractRef: string;
  tx: string;

  createdAt: Date;
}