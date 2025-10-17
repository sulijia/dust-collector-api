import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import path from 'path';
import { stdout } from 'process';
import { version } from 'os';
import {get_coin_list_by_address} from './get_coins_by_address/get_coins_by_address';
import { stringify } from 'querystring';
import { get_support_tokens_local } from './get_support_tokens_LC/get_support_tokens_lc';
import { SUPPORT_CHAINS, SUPPORT_NETWORK } from './const';
import {get_cross_router} from './get_support_route/get_cross_route'
import axios from 'axios';
import { setJson, getJson, storeObjs, getObjs } from "./dataService";

import { UnifiedSDK, DefaultPriceOracle,NetTransferArgs } from "./cashappSDKV1/bolaritySDK";
import { CompoundSDK } from "./cashappSDKV1/bolaritySDK";
import { PendleSDK, CHAINS } from "./cashappSDKV1/bolaritySDK";
import { buildAaveClient } from "./cashappSDKV1/bolaritySDK";
import { get_vault_details } from "./cashappSDKV1/examples/vault-info";
import {vaultConfig} from "./cashappSDKV1/bolaritySDK"
import * as db from './db';
import {
    getAddress,
} from 'ethers';

const app = express();
const port = 7788;

app.use(cors());
app.use(express.json());
const corsOptions = {
    origin: '*', // 允许的源
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 允许的方法
    credentials: false, // 允许携带凭据
    optionsSuccessStatus: 204 // 对于某些老旧的浏览器
};

// 使用 CORS 中间件
app.use(cors(corsOptions));


app.get('/coins_by_address', async (req,res)=>{
  let err = '';
  const {network ,address,platforms}=req.query;
  let str_network = network as string;
  if(!network || !str_network)
  {
    err = 'param network not found';
    console.log(`get_coins_by_address,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }
  let str_address = address as string;
  if(!address || !str_address){
    err = 'param address not found';
  console.log(`get_coins_by_address,query is ${JSON.stringify(req.query)} ,error is ${err}`);
  res.json({status:'ok',error:err,data:null});
    return;
  }
  let str_platforms = platforms as string;
  if(!platforms || !str_platforms){
    err = 'param platforms not found';
  console.log(`get_coins_by_address,query is ${JSON.stringify(req.query)} ,error is ${err}`);
  res.json({status:'ok',error:err,data:null});
    return;
  }
  
  let arr_platforms:string[] = [];
  const _platforms = (str_platforms as string).split('|');
  if(_platforms.length === 1 && _platforms[0] === 'all'){
    arr_platforms = ["Ethereum",'Optimism','Base','Arbitrum'];
  }
  arr_platforms = _platforms;
  if(_platforms.length<1 || arr_platforms.length<1){
    err = `The format of the parameter platforms ${str_platforms} is incorrect. Each element is separated by |`;
    console.log(`get_coins_by_address,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }
  const response = await get_coin_list_by_address(str_network,str_address,arr_platforms);
  err = response.error;
  console.log(`get_coins_by_address,query is ${JSON.stringify(req.query)} ,error is ${err}`);
  res.json({status:'ok',error:response.error,data:response.data});
});

app.get('/support_tokens',(req,res)=>{
  let err = '';
  const {network ,platform}=req.query;
  let str_network = network as string;
  const _network = str_network as SUPPORT_NETWORK;
  if(!network || !str_network || !_network)
  {
    err = 'param network not found';
    console.log(`get_support_tokens,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }
  let str_platform = platform as string;
  const _platform = str_platform as SUPPORT_CHAINS;
  if(!platform || !str_platform || !_platform){
    err = 'param platform not found';
    console.log(`get_support_tokens,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }

  

  const tokens = get_support_tokens_local(_network,_platform);
  err = tokens.error;
  console.log(`get_support_tokens,query is ${JSON.stringify(req.query)} ,error is ${err}`);
  res.json({status:'ok',data:tokens.data,error:err});
  
});

app.get('/best_route',async (req,res)=>{
  let err = '';
  const {network,src_platform,dest_platform,tokenname}=req.query;
  let str_network = network as string;
  const _network = str_network as SUPPORT_NETWORK;
  if(!network || !str_network || !_network)
  {
    err = 'param network not found';
    console.log(`get_support_route,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }

  let str_src = src_platform as string;
  const _src= str_src as SUPPORT_CHAINS;
  if(!src_platform|| !str_src || !_src)
  {
    err = 'param src_platform not found';
    console.log(`get_support_route,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }

  let str_dest = dest_platform as string;
  const _dest = str_dest as SUPPORT_CHAINS;
  if(!dest_platform|| !str_dest || !_dest)
  {
    err = 'param dest_platform not found';
    console.log(`get_support_route,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }

  let str_token = tokenname as string;
  if(!tokenname || !str_token)
  {
    err = 'param tokenname not found';
    console.log(`get_support_route,query is ${JSON.stringify(req.query)} ,error is ${err}`);
    res.json({status:'ok',error:err,data:null});
    return;
  }

  const response = await get_cross_router(_network,_src,_dest,str_token);
  err = response.error;
  console.log(`get_support_route,query is ${JSON.stringify(req.query)} ,error is ${err}`);
  const data = {status:'ok',data:response.data,error:err};
  const json_data = JSON.stringify(data,(_,v)=> typeof v === 'bigint'? v.toString():v);
  res.send(json_data);
  return;
})

function v3extractTokenAndFeeArrays(s: string): { tokens: string[], fees: string[] } {
  // 提取第一个代币
  const firstTokenMatch = s.match(/=\s*([A-Za-z0-9]+)/);
  if (!firstTokenMatch) return { tokens: [], fees: [] };
  const tokens: string[] = [firstTokenMatch[1]];
  const fees: string[] = [];

  // 提取所有“费率+代币”对
  const regex = /--\s*([\d.]+%)\s*\[[0-9a-fA-Fx]+\]([A-Za-z0-9]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(s)) !== null) {
    fees.push(m[1]);
    tokens.push(m[2]);
  }

  // 不再补'0'，fee长度比token少1
  return { tokens, fees };
}

function v2extractTokens(s: string): string[] {
  // 提取第一个token
  const firstTokenMatch = s.match(/=\s*([A-Za-z0-9]+)/);
  const tokens: string[] = firstTokenMatch ? [firstTokenMatch[1]] : [];

  // 提取后续token
  const regex = /\[[0-9a-fA-Fx]+\]([A-Za-z0-9]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(s)) !== null) {
    tokens.push(m[1]);
  }

  return tokens;
}

// API: 调用本地程序
app.post('/quote', async(req, res) => {
  let {tokenIn, tokenOut, amount, chainId, cache} = req.body;
  let cacheKey = `quote:${chainId}:${tokenIn}:${tokenOut}`;
  if(false) {
    const cacheData = await getJson<{ success: boolean; version: string; tokens: string[]; fees: string[] }>(cacheKey);
    if(cacheData != null){
      return res.json(cacheData);
    }
  }

  // const args: string[] = req.body.args || [];
  const args: string[] = [
    "quote", 
    "--tokenIn", tokenIn,
    "--tokenOut",tokenOut,
    "--amount", amount, 
    "--exactIn", 
    "--minSplits", "1", 
    // "--protocols" ,"v3", 
    "--router", "alpha", 
    "--chainId", chainId];
  // 假设本地可执行程序和 app.ts 在同一目录
  const programPath = path.join('./bin/cli'); // 注意路径
  let output = "";
  execFile(programPath, args,{cwd:"../smart-order-router"}, async(error, stdout, stderr) => {
    if (error) {
      console.log(stdout);
      console.log(stderr);
      return res.json({
        success: false,
        version: "",
        tokens: [],
        fees: [],
      });
    }
    output = stdout.toString().replace(
    // 匹配所有ANSI转义序列
    // eslint-disable-next-line no-control-regex
    /\x1B\[[0-?]*[ -/]*[@-~]/g,
    ''
  );
    // 按照回车换行分割
    const lines = output.split(/\r?\n/);
    let success = false;
    let versionStr = "";
    let tokens:string[];
    let fees:string[];
    // console.log(lines);
    if(lines.length > 1) {
      let routeFlag = lines[0];
      if(routeFlag.includes('Best Route:')) {
        let routeStr = lines[1];
        let match = routeStr.match(/^\[([^\]]+)\]/);

        if (match) {
          const version = match[1]; // V2 V3 V4 V2 + V3 + V4
          if(version == "V2" || version == "V3" || version == "V4" || version == "V2 + V3 + V4") {
            versionStr = version;
            // V2 process
            if(version == "V2") {
              success = true;
              tokens = v2extractTokens(routeStr);
            } else if(version == "V3" || version == "V4") {
              success = true;
              let result = v3extractTokenAndFeeArrays(routeStr);
              tokens = result.tokens;
              fees = result.fees;
            }
          }
        }
      }
    }
    let respJson = {
      success: success,
      version: versionStr,
      tokens: tokens,
      fees: fees,
    }
    await setJson(cacheKey, respJson);
    res.json(respJson);
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/price', async (req, res) => {
  // 获取用户传入的 `ids` 和 `vs_currencies` 参数
  const ids = req.query.ids as string; // 币种列表，例如 "bitcoin,ethereum"
  const vs_currencies = req.query.vs_currencies as string; // 对应货币，例如 "usd,eur"

  // // 检查参数是否提供，如果没有则返回错误提示
  // if (!ids || !vs_currencies) {
  //   return res.status(400).json({
  //     error: "Missing required parameters. Please provide 'ids' and 'vs_currencies'.",
  //   });
  // }

  try {
    // 请求 CoinGecko API
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids,           // 用户传入的币种
        vs_currencies, // 用户传入的货币
      },
    });

    // 原样返回 CoinGecko API 的响应数据
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from CoinGecko API:', error);

    // 返回错误响应
    res.status(500).json({
      error: 'Failed to fetch data from CoinGecko API.',
    });
  }
});

app.get('/v1/balances/:address', async (req, res) => {
  try {
    const accountAddress = req.params.address;

    const chainId = CHAINS.base.id;
    
    const compound = new CompoundSDK({ chainId, rpcUrl: process.env.RPC_URL_8453 });
    const pendle = new PendleSDK({ chainId, rpcUrl: process.env.RPC_URL_8453 });
    const aaveClient = buildAaveClient();
    const unified = new UnifiedSDK({
      chainId,
      priceOracle: new DefaultPriceOracle(),
      compound: { default: { sdk: compound } },
      pendle: { default: { sdk: pendle } },
      aave: {
        [chainId]: {
          client: aaveClient,
          markets: ["0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" /* ... */]
        }
      }
    });

    const summary = await unified.getUnifiedBalanceSummary({
      chainId,
      accountAddress,
      protocols: null,
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

function isValidAddress(address: string): boolean {
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
}

// query user register or not
app.get('/v1/user/register/:address', async (req, res) => {
  let address = req.params.address;
  // check address valid
  if(isValidAddress(String(address))) {
    let raw_address = String(address).toLowerCase();
    if(raw_address.length == 40) {
      raw_address = '0x' + raw_address
    }
    try {
      let user = await db.get_user(raw_address);
      console.log(user);
      let register = false;
      if(user.address !== "") {
        register = true;
      }
      res.json({
        code:200,
        msg:null,
        data: {
          register,
        },
      });
    } catch (error) {
        res.json({
        code:200,
        msg:null,
        data: {
          register: false,
        },
      });
    }
  } else {res.json({
        code:200,
        msg:null,
        data: {
          register: false,
        },
      });
  };
});

// create new account
app.post('/v1/user', async (req, res) => {
  let {address} = req.body;
  // check address valid
  if(isValidAddress(String(address))) {
    let raw_address = String(address).toLowerCase();
    if(raw_address.length == 40) {
      raw_address = '0x' + raw_address
    }
    try {
      await db.create_user(raw_address);
      res.json({
        code:200,
        msg:null,
        data:null,
      });
    } catch (error) {
        res.json({
        code:500,
        msg:error.message,
        data:null,
      });
    }
  } else {res.json({
      code:500,
      msg:'invalid address',
      data:null,
    });
  };
});

// query user
app.get('/v1/user/list', async (req, res) => {
  let {page, size} = req.query;
  const users = await db.get_users(Number(page), Number(size));
  res.json({
    code:200,
    msg:null,
    data:users,
  });
});

function parseList(value: string | undefined): string[] {
    return (value || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}
function parseTokenOverrides(value: string | undefined) {
    const tokens: Array<{ address: string; symbol?: string }> = [];
    for (const entry of parseList(value)) {
        const [symbol, address] = entry.includes(":") ? entry.split(":") : [undefined, entry];
        if (!address) continue;
        tokens.push({
            address: address.trim(),
            symbol: symbol ? symbol.trim().toUpperCase() : undefined
        });
    }
    return tokens;
}
// Daily and Historical Reward
app.get('/v1/vault/rewards', async (req, res) => {
  let {user, days} = req.query;
  // check address valid
  if(isValidAddress(String(user))) {
    let raw_address = String(user).toLowerCase();
    if(raw_address.length == 40) {
      raw_address = '0x' + raw_address
    }
    try {
      const userRewards = await db.get_rewards(String(user).toLowerCase(), Number(days));

      res.json(
        {
          code:200,
          msg:null,
          data:userRewards,
        }
      );
    } catch (error) {
      res.json({
        code:500,
        msg:error.message,
        data:null,
      });
    }
  } else {res.json({
      code:500,
      msg:'invalid address',
      data:null,
    });
  };
});

function parsePercent(str: string): number | null {
  if (str.trim().toLowerCase() === 'n/a') {
    return null;
  }

  const num = parseFloat(str.replace('%', ''));
  return isNaN(num) ? null : num;
}

function comparePercent(a: string, b: string): number {
  const numA = parsePercent(a);
  const numB = parsePercent(b);

  if (numA === null && numB === null) return 0;
  if (numA === null) return -1;
  if (numB === null) return 1;

  return numA - numB;
}
// // Vault Detail
// app.get('/v1/vault/apy', async (req, res) => {
//   let results = [];
//   let cacheKey = `cashapp:vault_detail`;
//   let cacheData = await getObjs(cacheKey);
//   const apyMap = new Map<string, string>();
//   if(cacheData != null){
//     for(const vault of cacheData) {
//       console.log(vault)
//       if(apyMap.has(vault.category)) {
//         // store apy lowest
//         let old = apyMap.get(vault.category);
//         if(comparePercent(vault.apy, old) < 0) {
//           apyMap.set(vault.category, vault.apy);
//         }
//       } else {
//         apyMap.set(vault.category, vault.apy);
//       }
//     }
//   }
//   apyMap.forEach((value, key) => {
//     results.push({'category':key, 'apy':value});
//   });
//   res.json({
//     code:200,
//     msg:null,
//     data:results,
//   });
// });

// Vault Categories
app.get('/v1/vault/category', async (req, res) => {
  let cacheKey = `cashapp:vault_detail`;
  let cacheData = await getObjs(cacheKey);
  const apyMap = new Map<string, string>();
  if(cacheData != null){
    for(const vault of cacheData) {
      console.log(vault)
      if(apyMap.has(vault.category)) {
        // store apy lowest
        let old = apyMap.get(vault.category);
        if(comparePercent(vault.apy, old) < 0) {
          apyMap.set(vault.category, vault.apy);
        }
      } else {
        apyMap.set(vault.category, vault.apy);
      }
    }
  }

  let categories = vaultConfig.VAULT_CATEGORY_INFO;
  categories.forEach(category => {
    category['apy'] = apyMap.get(category.id);
  });
  res.json(categories);
});

// Vault Detail
app.get('/v1/vault/detail', async (req, res) => {
  let {id, category} = req.query;
  let results = [];
  let cacheKey = `cashapp:vault_detail`;
  let cacheData = await getObjs(cacheKey);
  if(cacheData == null){
    cacheData = await get_vault_details();
    await storeObjs(cacheKey,cacheData);
  }

  for(const vault of cacheData) {
    if(id !== undefined && String(id) !== '') {
        if(id != vault.id) {
            continue;
        }
    }
    if(category !== undefined && String(category) !== '') {
        if(category != vault.category) {
            continue;
        }
    }
    results.push(vault);
  }
  res.json(results);
});

// Admin api-Vault Detail
app.get('/v1/admin/vault/detail', async (req, res) => {
  let results = await get_vault_details();
  let cacheKey = `cashapp:vault_detail`;
  await storeObjs(cacheKey,results);
  res.json({
    code:200,
    msg:null,
    data:results,
  });
});

// Admin api-Update user balance
app.post('/v1/admin/user/balance', async (req, res) => {
  // get all address
  const all_users = await db.get_all_users_and_balance();
  // search all user's balance,net transer
  const chainId = CHAINS.base.id;
    
  const compound = new CompoundSDK({ chainId, rpcUrl: process.env.RPC_URL_8453 });
  const pendle = new PendleSDK({ chainId, rpcUrl: process.env.RPC_URL_8453 });
  const aaveClient = buildAaveClient();
  const unified = new UnifiedSDK({
    chainId,
    priceOracle: new DefaultPriceOracle(),
    compound: { default: { sdk: compound } },
    pendle: { default: { sdk: pendle } },
    aave: {
      [chainId]: {
        client: aaveClient,
        markets: ["0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" /* ... */]
      }
    },
    rpcUrls: { [chainId]: process.env.RPC_URL_8453  },
    transferExclusions: parseList(process.env.NET_TRANSFER_EXCLUDE)
  });
  const includeBreakdown = String(process.env.NET_TRANSFER_BREAKDOWN || "false").toLowerCase() === "true";
  const now = new Date();

  const todayUtcMidnightMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const yesterdayUtcMidnight = todayUtcMidnightMs - 24 * 60 * 60 * 1000;
  const args: NetTransferArgs = {
      chainId,
      startTime: Math.floor(yesterdayUtcMidnight / 1000),
      endTime: Math.floor(todayUtcMidnightMs / 1000),
      includeBreakdown,
      tokens: parseTokenOverrides(process.env.NET_TRANSFER_TOKENS)
  };

  for(const user of all_users) {
    const valid = isValidAddress(user.address);
    console.log("Fetch balance of address: " + user.address + " ,valid: " + valid);
    if(valid) {
      const summary = await unified.getUnifiedBalanceSummary({
        chainId,
        accountAddress: user.address,
        protocols: null,
      });
      args.accountAddress = String(user.address);
      const net_transfer = await unified.getNetTransfer(args);
      const stableBalance: bigint = BigInt(summary?.totals?.stableUsd*1000000 || 0);
      const yesterdayBalance: bigint = BigInt(user.balance || 0);
      const net_transfer_balance: bigint = BigInt(net_transfer?.netTransfer*1000000 || 0);
      const reward: bigint = stableBalance - yesterdayBalance - net_transfer_balance;
      const transer_in_balance: bigint = BigInt(net_transfer?.inboundUsd*1000000 || 0);
      const transer_out_balance: bigint = BigInt(net_transfer?.outboundUsd*1000000 || 0);
      console.log(reward, stableBalance, net_transfer_balance, transer_in_balance, transer_out_balance);
      await db.create_reward_history(user.id, String(reward), String(stableBalance), String(net_transfer_balance), String(transer_in_balance),
        String(transer_out_balance), new Date(todayUtcMidnightMs));
    }
  }

  res.json({
    code:200,
    msg:null,
    data:null,
  });
});

app.listen(port, () => {
  console.log(`服务已启动: http://localhost:${port}`);
});
