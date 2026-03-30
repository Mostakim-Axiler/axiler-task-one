import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsEmailUniqueConstraint } from '../validators/unique-email.validator';

export function IsEmailUnique(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'IsEmailUnique',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsEmailUniqueConstraint,
        });
    };
}