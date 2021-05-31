import { IsString } from 'class-validator';

export class EventID {
  @IsString()
  public partner_id: string;

  @IsString()
  public event_id: string;
}