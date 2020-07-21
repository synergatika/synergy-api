import { IsString, IsEmail } from 'class-validator';

class InvitationDto {
    @IsString()
    @IsEmail()
    public receiver: string;
}
export default InvitationDto;
