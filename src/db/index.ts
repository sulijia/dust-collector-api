const { Client, Pool } = require('pg');
import 'dotenv/config';
import { User, UserRewards, UserModel } from './model'

// 配置连接池
const db_pool = new Pool({
  user: process.env.DB_USER,
  host: 'localhost',
  database: process.env.DB,
  password: process.env.DB_PWD,
  port: 5432,
  max: process.env.DB_MAX_CON,                        // Max connects
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT,       // Idle connect timeout (ms)
  connectionTimeoutMillis: process.env.DB_CON_TIMEOUT,  // Connect timeout (ms)
});


export const get_users = async (page:number, size:number): Promise<User[]> => {
  if(page < 1) {
    page = 1;
  }
  if(size > 1000) {
    size = 1000;
  }
  let total_page = 0;
  const client = await db_pool.connect();
  try {
    let res = await client.query('SELECT  COUNT(*) AS total FROM users');
    const totalUsers = res.rows[0].total;
    total_page = (totalUsers + size -1) /size;
    const offset = (page - 1) * size;
    const query = `
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const values = [size, offset];
    res = await client.query(query, values);
    return res.rows.map(row => ({
      address: row.address,
    }));
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    client.release();
  }
};

export const get_user = async (address:string): Promise<User> => {
  const client = await db_pool.connect();
  try {
    let res = await client.query('SELECT  * FROM users where address=$1', [address]);
    return res.rows[0];
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    client.release();
  }
};

export const create_user = async (address:string) => {
  const client = await db_pool.connect();
  try {
    await client.query('BEGIN');

    const query = 'SELECT * FROM users WHERE address = $1';
    const result = await client.query(query, [address]);

    if (result.rows.length > 0) {
      console.log('User already exists:', result.rows[0]);
      await client.query('COMMIT');
      return result.rows[0];
    } else {
      const insertQuery = 'INSERT INTO users (address, created_at) VALUES ($1, NOW()) RETURNING *';
      const insertResult = await client.query(insertQuery, [address]);
      console.log('User created:', insertResult.rows[0]);
      await client.query('COMMIT');
      return insertResult.rows[0];
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error occurred:', err);
    throw err;
  } finally {
    client.release();
  }
};

function fromMicroToDecimalString(x: bigint): string {
  const neg = x < 0n;
  let n = neg ? -x : x;
  const intPart = (n / 1000000n).toString();
  let frac = (n % 1000000n).toString().padStart(6, '0');
  // frac = frac.replace(/0+$/, '');
  return (neg ? '-' : '') + intPart + (frac ? '.' + frac : '');
}

export const get_rewards = async (address:string, days:number) : Promise<UserRewards> =>  {
  if(!days) {
    days = 5;
  }
  const client = await db_pool.connect();
  try {
    let res = await client.query('SELECT SUM(reward::numeric) AS total_amount FROM reward_history r INNER JOIN users u ON u."id"=r."user" WHERE u.address=$1', [address]);
    const totalRewards = Number(fromMicroToDecimalString(BigInt(res.rows[0].total_amount ||0)));
    const query = `
      SELECT r.* FROM reward_history r
INNER JOIN users u ON u."id"=r."user"
 WHERE u.address=$1 and r.date_at  AT TIME ZONE 'Etc/UTC' >= date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '${days} days'  ORDER BY r.created_at DESC
    `;
    const values = [address];
    res = await client.query(query, values);
    let rewards:UserRewards = {
      cumulative_reward: totalRewards,
      rewards: [],
    }
    res.rows.forEach(row => (rewards.rewards.push({
      date: Math.floor(new Date(row.date_at).getTime() / 1000),
      daily_reward: Number(fromMicroToDecimalString(BigInt(row.reward||0))),
    })));
    return rewards;
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    client.release();
  }
};


export const get_all_users_and_balance = async (): Promise<UserModel[]> => {
  const now = new Date();

  const todayUtcMidnightMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const yesterdayUtcMidnight = new Date(todayUtcMidnightMs - 24 * 60 * 60 * 1000);
  const client = await db_pool.connect();
  try {
    const query = `
      SELECT DISTINCT ON (u.id) r.balance, u.id,u.address
FROM users u
LEFT JOIN reward_history r
ON u.id = r."user"
AND r.date_at = $1::timestamptz
ORDER BY
u.id,
r.created_at DESC
    `;
    const res = await client.query(query, [yesterdayUtcMidnight]);
    return res.rows.map(row => ({
      id: row.id,
      address: row.address,
      balance: row.balance,
    }));
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    client.release();
  }
};


export const create_reward_history = async (uid:number, reward:string, balance:string, net_transfer:string, transfer_in:string, transfer_out:string, date_at:Date) => {
  const client = await db_pool.connect();
  try {
    await client.query('BEGIN');

    const query = 'SELECT * FROM reward_history WHERE "user" = $1 and date_at = $2';
    const result = await client.query(query, [uid, date_at]);

    if (result.rows.length > 0) {
      console.log('Reward history already exists:', result.rows[0]);
      await client.query('COMMIT');
      return result.rows[0];
    } else {
      const insertQuery = 'INSERT INTO reward_history ("user", created_at, reward, balance, net_transfer, transfer_in, transfer_out, date_at) VALUES ($1, NOW(), $2,$3,$4,$5,$6,$7) RETURNING *';
      const insertResult = await client.query(insertQuery, [uid, reward, balance, net_transfer, transfer_in, transfer_out, date_at]);
      console.log('Reward history  created:', insertResult.rows[0]);
      await client.query('COMMIT');
      return insertResult.rows[0];
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error occurred:', err);
    throw err;
  } finally {
    client.release();
  }
};