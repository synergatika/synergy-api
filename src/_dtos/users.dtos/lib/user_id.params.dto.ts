import { IsString } from 'class-validator';

export class UserID {
  @IsString()
  public user_id: string;
}
