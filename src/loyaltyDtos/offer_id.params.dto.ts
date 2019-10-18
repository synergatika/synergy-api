import { IsString } from 'class-validator';

class OfferID {
  @IsString()
  public merchant_id: string;

  @IsString()
  public offer_id: string;
}

export default OfferID;