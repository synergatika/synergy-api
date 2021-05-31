import { IsString, IsNumber } from 'class-validator';

export class EarnPointsDto {
    @IsString()
    public password: string;

    @IsNumber()
    public _amount: number;
}