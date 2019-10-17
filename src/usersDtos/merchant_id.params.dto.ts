import { IsString } from 'class-validator';

class MerchantID {
  @IsString()
  public merchant_id: string;
}

export default MerchantID;