import { IsString } from 'class-validator';

class EventID {
  @IsString()
  public partner_id: string;

  @IsString()
  public event_id: string;
}

export default EventID;
