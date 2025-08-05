import axios from "axios";
import { Decimal } from 'decimal.js';
import { get_price_dexscreener_url } from "./dexscreener";
import {fetchDynamicRequests} from '../utils/fetch_all';
import {PairData} from './dexscreener';
import { raw } from "body-parser";
// ✅ 配置Decimal.js获得最高精度
Decimal.config({
    precision: 50,  // 50位精度
    rounding: Decimal.ROUND_DOWN,
    toExpNeg: -40,
    toExpPos: 40
});

export const ALCHEMY_URL = process.env.ALCHEMY_URL!;
export const ALCHEMY_PRIVATE_KEY = process.env.ALCHEMY_PRIVATE_KEY!;

export interface ApiResponse {
    data: {
      tokens: Token[];
      pageKey: string | null;
    };
  }
  
export interface Token {
    address: string;
    network: string;
    tokenAddress: string | null;
    tokenBalance: string;
    tokenMetadata: TokenMetadata;
    tokenPrices: TokenPrice[];
  }
  
  export  interface TokenMetadata {
    symbol: string | null;
    decimals: number | null;
    name: string | null;
    logo: string | null;
  }
  
  export interface TokenPrice {
    currency: string;
    value: string;
    lastUpdatedAt: string;
  }

// ✅ 修改接口使用string保持完整精度
export interface TokenData{
    name: string,
    platform: string,
    symbol: string,
    address: string,
    amount: string,      // 改为string保持完整精度
    price: string,       // 改为string保持完整精度
    currency: string,
    balance: string      // 改为string保持完整精度
}

// Mainnet
const ALCHEMY_Mainnet_ETH = 'eth-mainnet';
const ALCHEMY_Mainnet_OP = 'opt-mainnet';
const ALCHEMY_Mainnet_BASE = 'base-mainnet';
const ALCHEMY_Mainnet_ARB = 'arb-mainnet';

const ALCHEMY_Mainnet_NETWORK:Record<string,string> = {
  'Ethereum':ALCHEMY_Mainnet_ETH,
  'Optimism':ALCHEMY_Mainnet_OP,
  'Base': ALCHEMY_Mainnet_BASE,
  'Arbitrum':ALCHEMY_Mainnet_ARB
}

// Testnetnet
const ALCHEMY_Testnet_ETH = 'eth-sepolia';
const ALCHEMY_Testnet_OP = 'opt-sepolia';
const ALCHEMY_Testnet_BASE = 'base-sepolia';
const ALCHEMY_Testnet_ARB = 'eth-sepolia';

const ALCHEMY_Testnet_NETWORK:Record<string,string> = {
  'Ethereum':ALCHEMY_Testnet_ETH,
  'Optimism':ALCHEMY_Testnet_OP,
  'Base': ALCHEMY_Testnet_BASE,
  'Arbitrum':ALCHEMY_Testnet_ARB
}

const ALCHEMY_PLATFORMS = {
  Mainnet: ALCHEMY_Mainnet_NETWORK,
  Testnet: ALCHEMY_Testnet_NETWORK
};

const get_coinlist_by_alchemy = async (current_network:Record<string,string>, address:string,platforms:string[]) =>{
  const url = `${ALCHEMY_URL}${ALCHEMY_PRIVATE_KEY}/assets/tokens/by-address`;
  // Tokens By Wallet (POST /:apiKey/assets/tokens/by-address)
  let alchemy_platforms:string[] = [];
  
  platforms.forEach(platform=>{
    const alchemy_platform = current_network[platform];
    if (!alchemy_platform){
      return {data:null,error:`not support ${current_network} ${platform}`};
    }else{
      alchemy_platforms.push(current_network[platform]);
    }
  })
  try{
      const body = {
          addresses: [
            {
              address: address,
              networks: [...alchemy_platforms] // 注意是字符串数组！
            }
          ]
        };

     
      const response = await axios.post(url,body, {
          headers: {
            "Content-Type": "application/json"
          },
      });
      
      const rawData = await response.data;
      console.log(JSON.stringify(rawData));
      const data = rawData as ApiResponse;
      if(!data){
        return {data:null,error:rawData.error.message};
      }
      return  {data:data,error:null};
  }catch(error){
      return {error:`get data failed,${error}`,data:null};
  }
}

// ✅ 完全重写这个函数，修复null错误并使用完整精度
const get_token_data_by_token = (data: Token):TokenData|null =>{
    // ✅ 安全处理tokenBalance，避免parseInt精度丢失
    let amountRawDecimal: Decimal;
    try {
        // 处理各种可能的tokenBalance格式
        if (!data.tokenBalance || data.tokenBalance === '0' || data.tokenBalance === '0x0') {
            return null;
        }
        
        // 处理hex字符串
        const hexString = data.tokenBalance.startsWith('0x') 
            ? data.tokenBalance.slice(2) 
            : data.tokenBalance;
        
        // 如果是空字符串或者全是0，直接返回null
        if (!hexString || hexString === '0' || /^0+$/.test(hexString)) {
            return null;
        }
        
        amountRawDecimal = new Decimal(`0x${hexString}`);
    } catch (error) {
        console.warn('Failed to parse tokenBalance:', data.tokenBalance, error);
        return null;
    }
    
    if (amountRawDecimal.lte(0)) {
        return null;
    }
    
    // ✅ 安全处理decimals，避免null错误
    let decimals = data.tokenMetadata.decimals;
    let tokenaddress = data.tokenAddress;
    let tokenname = data.tokenMetadata.name;
    let tokensymbol = data.tokenMetadata.symbol;
    
    // 处理原生代币和null decimals的情况
    if (data.tokenAddress === null) {
        tokenaddress = 'native';
        if(data.network === ALCHEMY_Mainnet_ETH || data.network === ALCHEMY_Testnet_ETH){
            tokenname = 'ETH';
            tokensymbol = 'ETH';
            decimals = 18;
        }else if(data.network === ALCHEMY_Mainnet_ARB || data.network === ALCHEMY_Testnet_ARB){
            tokenname = 'ARB';
            tokensymbol = 'ARB';
            decimals = 18;
        }else if(data.network === ALCHEMY_Mainnet_OP || data.network === ALCHEMY_Testnet_OP){
            tokenname = 'OP';
            tokensymbol = 'OP';
            decimals = 18;
        }else if(data.network === ALCHEMY_Mainnet_BASE || data.network === ALCHEMY_Testnet_BASE){
            tokenname = 'ETH';
            tokensymbol = 'ETH';
            decimals = 18;
        }
    }
    
    // ✅ 检查decimals是否为null或undefined
    if (decimals === null || decimals === undefined) {
        console.warn('Token decimals is null/undefined:', {
            symbol: tokensymbol,
            address: tokenaddress,
            network: data.network
        });
        // 对于ERC20代币，默认使用18位decimals
        decimals = 18;
    }
    
    // ✅ 确保decimals是有效数字
    if (typeof decimals !== 'number' || decimals < 0 || decimals > 50) {
        console.warn('Invalid decimals value:', decimals, 'for token:', tokensymbol);
        decimals = 18; // 使用默认值
    }
    
    // ✅ 使用Decimal进行高精度计算
    let amountDecimal: Decimal;
    try {
        amountDecimal = amountRawDecimal.dividedBy(new Decimal(10).pow(decimals));
    } catch (error) {
        console.error('Error calculating amount:', error, {
            tokenBalance: data.tokenBalance,
            decimals: decimals,
            symbol: tokensymbol
        });
        return null;
    }
    
    if(amountDecimal.lte(0)){
        return null;
    }
    
    // ✅ 安全处理价格和余额计算
    let balanceDecimal = new Decimal(0);
    let priceDecimal = new Decimal(0);
    let currency = 'usd';
    
    if (data.tokenPrices && data.tokenPrices.length > 0 && data.tokenPrices[0].value) {
        try {
            priceDecimal = new Decimal(data.tokenPrices[0].value);
            balanceDecimal = amountDecimal.mul(priceDecimal);
        } catch (error) {
            console.warn('Error calculating price/balance:', error, {
                priceValue: data.tokenPrices[0].value,
                symbol: tokensymbol
            });
            // 价格计算失败，但仍然返回token数据，只是价格为0
        }
    }
    
    // ✅ 验证必需字段
    if (!tokenname || !tokensymbol || !tokenaddress) {
        console.warn('Missing required token fields:', {
            name: tokenname,
            symbol: tokensymbol,
            address: tokenaddress
        });
        return null;
    }
    
    // ✅ 返回完整精度的token数据
    const token = {
        name: tokenname,
        platform: data.network,
        symbol: tokensymbol,
        address: tokenaddress,
        amount: amountDecimal.toString(),        // 完整精度
        price: priceDecimal.toString(),          // 完整精度
        currency: currency,
        balance: balanceDecimal.toString()       // 完整精度
    }
    return token;
}

function getKeyByValue<T extends Record<string, string>>(
  obj: T, 
  value: string
): keyof T | undefined {
  return Object.keys(obj).find(key => obj[key] === value) as keyof T;
}

export const get_coin_list_by_address = async (network:string,address:string,chains:string[]) =>{
  const current_network = ALCHEMY_PLATFORMS[network as keyof typeof ALCHEMY_PLATFORMS];
  if (!current_network){
    return {data:null,error:`network error,not support this network ${network}`};
  }

  // 通过alchemy 获取账号的所有代币
  const rawData = await get_coinlist_by_alchemy(current_network,address,chains);
  if(rawData.data === null){
    return {data:null,error:rawData.error};
  }

  const _tokens = rawData.data.data.tokens;

  // 检查代币列表中的代币没有价格的情况
  let urls :string[]=[];
  let tokens:TokenData[] =[];
  for( const data of _tokens){
    if(data.tokenPrices.length && data.tokenPrices.length === 0){
      // 将链 代码转换成dexscreener的
      const platform = getKeyByValue(current_network,data.network);
      if(!platform){
        continue;
      }
      
      const url = get_price_dexscreener_url(platform,data.address);
      if(url != null){
        urls.push(url);
      }
    }
  }

  // 将所有没有价格的代币到dexscreener 批量请求价格
  const result = await fetchDynamicRequests<PairData>(urls);

  // 将得到得价格列表跟 代币列表拼接 
  for(const item of _tokens){

    // ✅ 使用修复后的安全函数
    const token = get_token_data_by_token(item);
    if(!token)
    {
      continue;
    }

    // ✅ 使用Decimal安全比较价格
    const priceDecimal = new Decimal(token.price);
    if(priceDecimal.gt(0)){
      tokens.push(token);
    }
    else{

      // 没有价格 在请求得价格列表中查找,如果找到就拼接
      const price = result.data.filter(item2=>{
        if(item2.length>0 && item2[0].baseToken)
        {
          return item2[0].baseToken.address === token.address && item2[0].chainId === token.platform
        }else {
          return false;
        }
      });

      // 找不到对应的价格 就放弃代币
      if(price && price.length > 0 && price[0].length > 0){
        try {
          // ✅ 使用Decimal重新计算价格和余额
          const newPriceDecimal = new Decimal(price[0][0].priceUsd);
          const amountDecimal = new Decimal(token.amount);
          const newBalanceDecimal = amountDecimal.mul(newPriceDecimal);
          
          // 创建更新后的token
          const updatedToken: TokenData = {
            ...token,
            price: newPriceDecimal.toString(),
            balance: newBalanceDecimal.toString()
          };
          
          tokens.push(updatedToken);
        } catch (error) {
          console.warn('Error updating token price:', error, {
            symbol: token.symbol,
            priceUsd: price[0][0].priceUsd
          });
          // 价格更新失败，跳过此token
        }
      }
    }
  }

  // 过滤掉 代币余额小于0.01的代币
  tokens = tokens.filter(item=>{
    return new Decimal(item.balance).gt(new Decimal(0.01));
  });

  return {data:tokens,error:null};
}

// ✅ 提供工具函数用于格式化显示
export class TokenFormatter {
    static formatAmount(amount: string, decimals: number = 6): string {
        try {
            const decimal = new Decimal(amount);
            return decimal.toFixed(decimals);
        } catch {
            return '0';
        }
    }
    
    static formatBalance(balance: string, decimals: number = 2): string {
        try {
            const decimal = new Decimal(balance);
            return decimal.toFixed(decimals);
        } catch {
            return '0.00';
        }
    }
    
    static isZero(amount: string): boolean {
        try {
            return new Decimal(amount).isZero();
        } catch {
            return true;
        }
    }
  }