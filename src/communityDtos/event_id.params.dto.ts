import { IsString } from 'class-validator';

class EventID {
  @IsString()
  public merchant_id: string;

  @IsString()
  public event_id: string;
}

export default EventID;
