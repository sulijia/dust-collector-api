import axios from "axios";
import { Decimal } from 'decimal.js';
import { get_price_dexscreener_url } from "./dexscreener";
import {fetchDynamicRequests} from '../utils/fetch_all';
import {PairData} from './dexscreener';
import { raw } from "body-parser";

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

export interface TokenData{
    name:string,
    platform:string,
    symbol:string,
    address:string,
    amount:number,
    price:number,
    currency:string,
    balance:number
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

const get_token_data_by_token = (data: Token):TokenData|null =>{
    const amount_int = parseInt(data.tokenBalance,16);
        if (amount_int <= 0)
        {
            return null;
        }
        let decimals = data.tokenMetadata.decimals!;
        
        let tokenaddress = data.tokenAddress;
        let tokenname = data.tokenMetadata.name;
        let tokensymbol = data.tokenMetadata.symbol;
        if (data.tokenAddress === null ){
            tokenaddress = 'native';
            if(data.network === ALCHEMY_Mainnet_ETH || data.network === ALCHEMY_Testnet_ETH){
              tokenname = 'ETH';
              tokensymbol='ETH';
              decimals=18;
            }else if(data.network === ALCHEMY_Mainnet_ARB || data.network === ALCHEMY_Testnet_ARB){
              tokenname='ARB';
              tokensymbol='ARB';
              decimals=18;
            }else if(data.network === ALCHEMY_Mainnet_OP || data.network === ALCHEMY_Testnet_OP){
              tokenname='op';
              tokensymbol='op';
              decimals=18;
            }else if(data.network === ALCHEMY_Mainnet_BASE || data.network === ALCHEMY_Testnet_BASE){
              tokenname= 'ETH';
              tokensymbol='ETH';
              decimals=18;
            }
        }
        let amount = amount_int/10** decimals;
        amount = new Decimal(amount).toDecimalPlaces(6).toNumber();
        if(amount <=0){
          return null;
        }
        let balance = 0;
        let price = 0;
        let currency = 'usd';
        if (data.tokenPrices.length >0){
            price = parseFloat(data.tokenPrices[0].value);
            balance = amount*price;
            balance = new Decimal(balance).toDecimalPlaces(6).toNumber()
        }
        const token =  {
            name:tokenname!,
            platform: data.network,
            symbol:tokensymbol!,
            address:tokenaddress!,
            amount:amount,
            price:price,
            currency:currency,
            balance:balance
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

      // axios获取数据 进行数据转换
      const token = get_token_data_by_token(item);
      if(!token)
      {
        continue;
      }

      // 检查价格,如果有价格就 插入 代币列表
      if(token?.price >0){
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
        if(price && price.length>0 && price[0].length >0){
          token.price = parseFloat( price[0][0].priceUsd);
          tokens.push(token);
        }
    }
  }

  return {data:tokens,error:null};
}