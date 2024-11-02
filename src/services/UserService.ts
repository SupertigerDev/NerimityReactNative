import env from '../env';
import {ChannelType, RawUser} from './RawData';
import {request} from './Request';
import ServiceEndpoints from './ServiceEndpoints';

interface UpdateUserOptions {
  email?: string;
  username?: string;
  avatar?: string;
  banner?: string;
  tag?: string;
  password?: string;
  newPassword?: string;
  bio?: string | null;
  socketId?: string;
  dmStatus?: number;
  friendRequestStatus?: number;
}
export async function updateUser(body: UpdateUserOptions) {
  return request<{user: any; newToken?: string}>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.user(''),
    method: 'POST',
    body,
    useToken: true,
  });
}

export async function registerFCM(token: string) {
  return request<undefined>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.user('register-fcm'),
    body: {token},
    method: 'POST',
    useToken: true,
    notJSON: true,
  });
}
export interface RawChannel {
  id: string;
  categoryId?: string;
  name: string;
  icon?: string;
  createdById?: string;
  serverId?: string;
  type: ChannelType;
  permissions?: number;
  createdAt: number;
  lastMessagedAt?: number;
  order?: number;
  slowModeSeconds?: number;

  _count?: {attachments: number};
}
export interface RawInboxWithoutChannel {
  id: string;
  createdAt: number;
  createdById: string;
  channelId: string;
  recipient: RawUser;
  closed: boolean;
  lastSeen?: number;
}

export async function openDMChannelRequest(userId: string) {
  return request<RawInboxWithoutChannel & {channel: RawChannel}>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.openUserDM(userId),
    method: 'POST',
    useToken: true,
  });
}
