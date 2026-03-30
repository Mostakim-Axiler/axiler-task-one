import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsEmailUniqueConstraint implements ValidatorConstraintInterface {
    constructor(private usersService: UsersService) { }

    async validate(email: string, args: ValidationArguments) {
        const user = await this.usersService.findByEmail(email);
        return !user; // true = valid, false = duplicate
    }

    defaultMessage(args: ValidationArguments) {
        return 'Email already exists';
    }
}