import {makeAutoObservable, runInAction} from 'mobx';
import {MessageType, RawMessage} from './RawData';
import {Store} from './store';
import {fetchMessages, postMessage} from '../services/MessageService';

export enum MessageSentStatus {
  SENDING = 0,
  FAILED = 1,
}

export type Message = RawMessage & {
  sentStatus?: MessageSentStatus;
};

export class Messages {
  cache: Record<string, Message[]> = {};
  store: Store;
  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {store: false});
  }

  addMessage(channelId: string, message: Message) {
    this.store.messages.cache[channelId]?.unshift?.(message);
    return this.store.messages.cache[channelId]?.[0];
  }

  async fetchAndCacheMessages(channelId: string, force = false) {
    if (this.cache[channelId] && !force) {
      return;
    }
    const messages = await fetchMessages(channelId);
    runInAction(() => (this.cache[channelId] = messages.reverse()));
  }

  async postMessage(channelId: string, content: string) {
    const localMessage = this.addMessage(channelId, {
      id: `${Date.now()}-${Math.random()}`,
      channelId,
      content,
      createdAt: Date.now(),
      sentStatus: MessageSentStatus.SENDING,
      type: MessageType.CONTENT,
      reactions: [],
      quotedMessages: [],
      createdBy: {
        id: '1234',
        username: 'Temp',
        tag: 'TEMP',
        badges: 0,
        hexColor: '#ffff',
      },
    });

    const message = await postMessage({
      channelId,
      content,
      socketId: this.store.socket.io.id,
    }).catch(err => console.log(err));
    this.updateMessage(channelId, localMessage.id, {
      ...message,
      sentStatus: message ? undefined : MessageSentStatus.FAILED,
    });
  }

  updateMessage(
    channelId: string,
    messageId: string,
    message: Partial<Message>,
  ) {
    const index = this.cache[channelId]?.findIndex?.(m => m.id === messageId);
    if (index === undefined || index < 0) {
      return;
    }
    this.cache[channelId][index] = Object.assign(
      {},
      this.cache[channelId][index],
      message,
    );
  }

  get channelMessages() {
    return (channelId: string) =>
      this.cache[channelId] as RawMessage[] | undefined;
  }
}
