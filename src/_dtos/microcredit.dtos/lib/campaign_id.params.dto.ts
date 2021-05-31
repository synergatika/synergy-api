import { IsString } from 'class-validator';

export class CampaignID {
  @IsString()
  public partner_id: string;

  @IsString()
  public campaign_id: string;
}