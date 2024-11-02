import EncryptedStorage from 'react-native-encrypted-storage';

export async function storeUserId(userId: string) {
  await EncryptedStorage.setItem('user_id', userId);
}

export async function getUserId() {
  return await EncryptedStorage.getItem('user_id');
}

export async function storeLastUpdateCheckedDate(timestamp = Date.now()) {
  await EncryptedStorage.setItem(
    'last_update_checked_date',
    timestamp.toString(),
  );
}

export async function getLastUpdateCheckedDate() {
  return parseInt(
    (await EncryptedStorage.getItem('last_update_checked_date')) || '0',
  );
}

export async function storeUserToken(token: string) {
  await EncryptedStorage.setItem('user_token', token);
}

export async function getUserToken() {
  return await EncryptedStorage.getItem('user_token');
}
