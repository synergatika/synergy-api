import { IsString, Length } from 'class-validator';

export class CardDto {
  @IsString()
  @Length(16, 16)
  public card: string;
}