import { IsString } from 'class-validator';

class InvitationDto {
    @IsString()
    public receiver: string;
}

export default InvitationDto;
