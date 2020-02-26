import { IsString } from 'class-validator';

class SupportID {
  @IsString()
  public merchant_id: string;

  @IsString()
  public campaign_id: string;

  @IsString()
  public support_id: string;
}

export default SupportID;