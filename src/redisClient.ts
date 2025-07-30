import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1", // Redis 服务器地址
  port: 6379,        // Redis 端口
  // password: "yourpassword" // 如果有密码
});

export default redis;