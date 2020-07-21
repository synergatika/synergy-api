import { IsString, IsOptional } from 'class-validator';

class MemberDto {
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public imageURL: string;
}
export default MemberDto;
