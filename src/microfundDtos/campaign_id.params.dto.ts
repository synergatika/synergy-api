import { IsString } from 'class-validator';

class CampaignID {
  @IsString()
  public merchant_id: string;

  @IsString()
  public campaign_id: string;
}

export default CampaignID;