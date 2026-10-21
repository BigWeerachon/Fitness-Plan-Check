// Metro config: ค่าเริ่มต้นของ Expo + ไฟล์ .wasm ของ expo-sqlite (ใช้เฉพาะพรีวิวบนเว็บสำหรับตรวจภาพ)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
