import { IsString, IsEmail } from 'class-validator';

export class CommunicationDto {
    @IsString()
    @IsEmail()
    public sender: string;

    @IsString()
    public content: string;
}