import { BaseRepositoryInterface } from '@app/common';
import UserEntity from '@app/common/entities/user.entity';

export interface UsersRepositoryInterface
  extends BaseRepositoryInterface<UserEntity> {
  findOneByEmail(email: string): Promise<UserEntity>;
}
