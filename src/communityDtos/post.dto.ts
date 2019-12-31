import { IsString, IsEnum } from 'class-validator';

class OfferDto {
  @IsString()
  public content: string;

  @IsEnum(['public', 'private', 'partners'])
  public access: string;

  @IsEnum(['post', 'event'])
  public type: string;
}

export default OfferDto;
