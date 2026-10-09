/* global jest */
// Mock ของ native module สำหรับเทสต์ (ทุกอย่างรันได้โดยไม่ต้องมีคีย์/อุปกรณ์จริง)

// ฐานข้อมูล: ใช้ SQLite จริง (better-sqlite3 ในหน่วยความจำ) ผ่าน Drizzle ตัวเดียวกัน → SQL และ migration เป็นของจริง
jest.mock('./src/db/driver', () => {
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const schema = require('./src/db/schema');
  return {
    openDriver: () => {
      const sqlite = new Database(':memory:');
      const db = drizzle(sqlite, { schema });
      return {
        db,
        exec: (sql) => sqlite.exec(sql),
        userVersion: () => sqlite.pragma('user_version', { simple: true }),
        setUserVersion: (v) => sqlite.pragma(`user_version = ${Math.floor(v)}`),
        transaction: (fn) => sqlite.transaction(fn)(),
        close: () => sqlite.close(),
      };
    },
  };
});

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  digestStringAsync: async (_alg, data) => require('crypto').createHash('sha256').update(data).digest('hex'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
  };
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
  getCalendars: () => [{ uses24hourClock: true }],
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock('expo-file-system', () => {
  // ระบบไฟล์จำลองในหน่วยความจำ (ใช้กับการส่งออก CSV)
  const files = new Map();
  class Directory {
    constructor(uri) {
      this.uri = uri;
    }
  }
  class File {
    constructor(...parts) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      files.set(this.uri, '');
    }
    delete() {
      files.delete(this.uri);
    }
    write(content) {
      files.set(this.uri, content);
    }
    textSync() {
      return files.get(this.uri) ?? '';
    }
  }
  return { File, Directory, Paths: { cache: new Directory('file:///cache') }, __files: files };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(async () => true),
  createURL: (p) => `fitnese://${p}`,
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
