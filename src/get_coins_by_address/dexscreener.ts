import axios from 'axios';
import { platform } from 'os';
import { json } from 'stream/consumers';

interface Token {
    address: string;
    name: string;
    symbol: string;
  }
  
  interface TransactionStats {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  }
  
  interface VolumeStats {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  }
  
  interface PriceChange {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  }
  
  interface Liquidity {
    usd: number;
    base: number;
    quote: number;
  }
  
  interface Social {
    type: string;
    url: string;
  }
  
  interface Website {
    label: string;
    url: string;
  }
  
  interface Info {
    imageUrl: string;
    header: string;
    openGraph: string;
    websites: Website[];
    socials: Social[];
  }
  
  interface DexScreenerPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: Token;
    quoteToken: Token;
    priceNative: string;
    priceUsd: string;
    txns: TransactionStats;
    volume: VolumeStats;
    priceChange: PriceChange;
    liquidity: Liquidity;
    fdv: number;
    marketCap: number;
    pairCreatedAt: number;
    info: Info;
  }
  
  // 最终数据结构是包含一个对象的数组
  export type PairData = DexScreenerPair[];

  const DEXSCREENER_Mainnet_ETH = 'ethereum';
  const DEXSCREENER_Mainnet_OP = 'optimism';
  const DEXSCREENER_Mainnet_BASE = 'base';
  const DEXSCREENER_Mainnet_ARB = 'arbitrum';
  
  const DEXSCREENER_Mainnet_NETWORK:Record<string,string> = {
    'ethereum':DEXSCREENER_Mainnet_ETH,
    'optimism':DEXSCREENER_Mainnet_OP,
    'base': DEXSCREENER_Mainnet_BASE,
    'arbitrum':DEXSCREENER_Mainnet_ARB,
  }

export const get_price_dexscreener_url = (platform:string,contractAddress:string)=>{
    const dex_chain = DEXSCREENER_Mainnet_NETWORK[platform];
    if (!dex_chain){
        console.log(`dexscreener not support this platform ${platform}`);
        return null;
    }
    const url = `https://api.dexscreener.com/tokens/v1/${dex_chain}/${contractAddress}`;
    return url;
}


export const get_token_price_dex=async (platform:string,contractAddress: string)=>{
    const dex_chain = DEXSCREENER_Mainnet_NETWORK[platform];
    if (!dex_chain){
        throw new Error(`dexscreener not support this platform ${platform}`);
    }
    const url = `https://api.dexscreener.com/tokens/v1/${dex_chain}/${contractAddress}`;
    try{
        const response = await axios.get<PairData>(url,{
        headers:{
            'Accept':'*/*'
        }
        })
        const data = response.data;
        console.log(JSON.stringify( data));
        if(data.length>0 && data[0].baseToken){
            return {
                platform:platform,
                address: contractAddress,
                price: data[0].priceUsd
            }
        }else{
            return null;
        }
        
      
    }catch(error){
        return null;
    }
  
  }
