import { IsString } from 'class-validator';

export class OfferID {
  @IsString()
  public partner_id: string;

  @IsString()
  public offer_id: string;
}