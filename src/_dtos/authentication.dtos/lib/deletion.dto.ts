import { IsString } from 'class-validator';

export class DeletionDto {
    @IsString()
    public password: string;
}