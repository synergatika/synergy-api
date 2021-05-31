import { IsString, IsEmail } from 'class-validator';

export class InvitationDto {
    @IsString()
    @IsEmail()
    public receiver: string;
}