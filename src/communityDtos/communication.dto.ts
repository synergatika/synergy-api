import { IsString, IsEmail } from 'class-validator';

class CommunicationDto {
    @IsString()
    @IsEmail()
    public sender: string;

    @IsString()
    public content: string;
}
export default CommunicationDto;
