import redis from "./redisClient";

export async function setJson(key: string, data: object) {
  const jsonString = JSON.stringify(data);
  await redis.set(key, jsonString);
}

export async function getJson<T = any>(key: string): Promise<T | null> {
  const jsonString = await redis.get(key);
  if (jsonString) {
    return JSON.parse(jsonString) as T;
  }
  return null;
}