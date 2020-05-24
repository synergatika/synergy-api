import { IsString } from 'class-validator';

class UserID {
  @IsString()
  public user_id: string;
}

export default UserID;
