import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@cafeconnect/database';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Made with Bob
