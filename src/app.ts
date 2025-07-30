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
import { setJson, getJson } from "./dataService";

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
// function v3extractTokensAndFeesWithLastZero(s: string): { token: string, fee: string }[] {
//   // 提取第一个代币
//   const firstTokenMatch = s.match(/=\s*([A-Za-z0-9]+)/);
//   if (!firstTokenMatch) return [];
//   const tokens: string[] = [firstTokenMatch[1]];
//   const fees: string[] = [];

//   // 提取所有“费率+代币”对
//   const regex = /--\s*([\d.]+%)\s*\[[0-9a-fA-Fx]+\]([A-Za-z0-9]+)/g;
//   let m: RegExpExecArray | null;
//   while ((m = regex.exec(s)) !== null) {
//     fees.push(m[1]);
//     tokens.push(m[2]);
//   }

//   // 组装结果
//   const result: { token: string, fee: string }[] = [];
//   for (let i = 0; i < tokens.length; i++) {
//     result.push({
//       token: tokens[i],
//       fee: i < fees.length ? fees[i] : '0'
//     });
//   }
//   return result;
// }


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
  if(cache) {
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
  
// v3 router 1 hop
  // let output ="[32mBest Route:[39m\n[32m[V3] 100.00% = USDC -- 0.3% [0x46880b404CD35c165EDdefF7421019F8dD25F4Ad]WETH[39m\n[32m\tRaw Quote Exact In:[39m\n[32m\t\t0.00[39m\n[32m\tGas Adjusted Quote In:[39m\n[32m\t\t0.00[39m\n\n[32mGas Used Quote Token: 0.000000[39m\n[32mGas Used USD: 32.427266[39m\n[32mCalldata: undefined[39m\n[32mValue: undefined[39m\n\n[32m  blockNumber: \"27803975\"[39m\n[32m  estimatedGasUsed: \"97000\"[39m\n[32m  gasPriceWei: \"1000133\"[39m\n[32mTotal ticks crossed: 1[39m\n";
// v3 router 2 hop
  //   let output = `Best Route:
// [V3] 100.00% = DAI -- 0.3% [0xb282e348e5Ca035851759F12390347B576823824]USDC -- 0.01% [0x6d15dEb415cb536B1BFC375Bb35A83A509Fa1a6f]WETH
//         Raw Quote Exact In:
//                 0.00
//         Gas Adjusted Quote In:
//                 0.00

// Gas Used Quote Token: 0.000900
// Gas Used USD: 0.066007
// Calldata: undefined
// Value: undefined

//   blockNumber: "8675959"
//   estimatedGasUsed: "193000"
//   gasPriceWei: "4666336960"
// Total ticks crossed: 3`
// v3 router 3 hop
// let output =`Best Route:
// [V3] 100.00% = DAI -- 0.3% [0xb282e348e5Ca035851759F12390347B576823824]USDC -- 0.05% [0xaB9C1409490dCf0B9177dF840D96Da5653F5c5cF]WETH -- 0.3% [0x9B666c5d4E5C98c0b6f1cF4dDf1f251091831E3F]SOL
//         Raw Quote Exact In:
//                 0.00
//         Gas Adjusted Quote In:
//                 0.00

// Gas Used Quote Token: 0.001311
// Gas Used USD: 0.093500
// Calldata: undefined
// Value: undefined

//   blockNumber: "8675939"
//   estimatedGasUsed: "273000"
//   gasPriceWei: "4672957473"
// Total ticks crossed: 4
// `;
// let output =`Best Route:
// [V2] 100.00% = USDC -- [0x46880b404CD35c165EDdefF7421019F8dD25F4Ad]WETH -- [0x46880b404CD35c165EDdefF7421019F8dD25F4Ad]SOL
// `;
//   output = output.replace(
//     // 匹配所有ANSI转义序列
//     // eslint-disable-next-line no-control-regex
//     /\x1B\[[0-?]*[ -/]*[@-~]/g,
//     ''
//   );
//   // 按照回车换行分割
//   const lines = output.split(/\r?\n/);
//   let success = false;
//   // console.log(lines);
//   if(lines.length > 1) {
//     let routeFlag = lines[0];
//     if(routeFlag.includes('Best Route:')) {
//       let routeStr = lines[1];
//       let match = routeStr.match(/^\[([^\]]+)\]/);

//       if (match) {
//         const version = match[1]; // V2 V3 V4 V2 + V3 + V4
//         if(version == "V2" || version == "V3" || version == "V4" || version == "V2 + V3 + V4") {
//           // V2 process
//           if(version == "V2") {
//             console.log(v2extractTokens(routeStr));
//           } else if(version == "V3" || version == "V4") {
//             console.log(v3extractTokenAndFeeArrays(routeStr));
//           }
//         }
//       }

//     }
//   }
//   res.json({
//       success: success,
//    });
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

app.listen(port, () => {
  console.log(`服务已启动: http://localhost:${port}`);
});
