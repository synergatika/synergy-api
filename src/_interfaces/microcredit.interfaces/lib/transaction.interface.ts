import { EarnTokensDto, RedeemTokensDto } from "_dtos";
import { Member } from "_interfaces/users.interfaces";
import { MicrocreditCampaign } from "./campaign.interface";
import { MicrocreditSupport } from "./support.interface";

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending'
}

export enum MicrocreditTransactionType {
  PromiseFund = 'PromiseFund',
  ReceiveFund = 'ReceiveFund',
  RevertFund = 'RevertFund',
  SpendFund = 'SpendFund'
}

export interface MicrocreditTransaction {
  _id?: string;

  // campaign: MicrocreditCampaign,
  support: MicrocreditSupport,
  // member: Member,

  data: EarnTokensDto | RedeemTokensDto;

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