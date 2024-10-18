import User from '@app/common/entities/user.entity';
import { Request } from 'express';
interface RequestWithUser extends Request {
  user: User;
}

export default RequestWithUser;
