import { IsString, IsEnum, IsOptional } from 'class-validator';

class EventDto {
  @IsOptional()
  @IsString()
  public imageURL: string;

  @IsString()
  public title: string;

  @IsString()
  public description: string;

  @IsEnum(['public', 'private'])
  public access: string;

  @IsString()
  public location: string;

  @IsString()
  public dateTime: string;
}

export default EventDto;
