import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import User from './user.entity';

export enum UserRoles {
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user',
}
@Entity()
export class UserRole {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'enum', enum: UserRoles, default: UserRoles.USER })
  public role: UserRoles;

  @OneToMany(() => User, (user) => user.role)
  public users: User[];
}
