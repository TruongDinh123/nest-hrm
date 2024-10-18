import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { ApiKey } from './key-token.entity';

@Entity()
@Index(['id', 'email'])
class User {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ unique: true })
  public email: string;

  @Column({ default: false })
  public isEmailConfirmed: boolean;

  @Column()
  public name: string;

  @Column({ nullable: true })
  @Exclude()
  public password: string | null;

  @ManyToOne(() => UserRole, { eager: true })
  @JoinColumn({ name: 'roleId' })
  public role: UserRole;

  @Column()
  public roleId: number;

  @Column({
    nullable: true,
  })
  @Exclude()
  public currentHashedRefreshToken?: string;

  @Column({ default: true })
  public isActive: boolean;

  @Column({ default: false })
  public isRegisteredWithGoogle: boolean;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  public apiKeys: ApiKey[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export default User;
