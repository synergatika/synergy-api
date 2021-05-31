import { IsString } from 'class-validator';

export class IdentifierToDto {
  @IsString()
  public _to: string;
}