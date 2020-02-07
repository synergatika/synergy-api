import { IsString, Length } from 'class-validator';

class CardDto {
  @IsString()
  @Length(16, 16)
  public card: string;
}

export default CardDto;
