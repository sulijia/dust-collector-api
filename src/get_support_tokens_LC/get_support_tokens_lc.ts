import { SUPPORT_CHAINS, SUPPORT_NETWORK } from '../const';
import local_tokens from './support_tokens.json'

export const LC_TOKENS = local_tokens;



interface InputToken {
    name: string;
    symbol: string;
    contract: string;
    decimal: number;
  }
  
  interface InputNetwork {
    [chain: string]: InputToken[];
  }
  
export interface InputData {
    Mainnet: InputNetwork;
    Testnet: InputNetwork;
    Devnet: InputNetwork;
  }
  
  interface OutputToken {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
  }
  
  interface SupportedToken {
    token: OutputToken;
    bridgeToChains: string[];
  }
  
  interface OutputData {
    sourceChain: string;
    supportedTokens: SupportedToken[];
  }
  
  interface TransformedData {
    Mainnet: OutputData[];
    Testnet: OutputData[];
    Devnet: OutputData[];
  }
  
 function transformData(input: InputData): TransformedData {
    const result: TransformedData = {
      Mainnet: [],
      Testnet: [],
      Devnet: []
    };
  
    // 处理每个网络环境
    (Object.keys(input) as Array<keyof InputData>).forEach(networkType => {
      const networkData = input[networkType];
      
      // 步骤1：收集当前网络环境中所有代币的跨链存在信息
      const tokenPresence: Record<string, Set<string>> = {};
  
      Object.entries(networkData).forEach(([chain, tokens]) => {
        tokens.forEach(token => {
          const tokenKey = token.name.toLowerCase();
          if (!tokenPresence[tokenKey]) {
            tokenPresence[tokenKey] = new Set();
          }
          tokenPresence[tokenKey].add(chain);
        });
      });
  
      // 步骤2：为当前网络环境中的每个链构建输出数据
      Object.entries(networkData).forEach(([chain, tokens]) => {
        const supportedTokens: SupportedToken[] = [];
  
        tokens.forEach(token => {
        //   const address = token.contract === "native" 
        //     ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" 
        //     : token.contract;
          const address = token.contract;
          
          const tokenKey = token.name.toLowerCase();
          const bridgeToChains: string[] = [];
          const presence = tokenPresence[tokenKey] || new Set();
          
          presence.forEach(targetChain => {
            if (targetChain !== chain) {
              bridgeToChains.push(targetChain);
            }
          });
  
          supportedTokens.push({
            token: {
              name: token.name,
              symbol: token.symbol,
              address,
              decimals: token.decimal
            },
            bridgeToChains
          });
        });
  
        result[networkType].push({
          sourceChain: chain,
          supportedTokens
        });
      });
    });
  
    return result;
  }

export const _totalTokens = transformData(LC_TOKENS as InputData);

export const get_support_tokens_local = (network:SUPPORT_NETWORK,chain:SUPPORT_CHAINS)=>{

    if(!(network in _totalTokens)){
        return {data:null,error:`network ${network} not support`};
    }
    const data = _totalTokens[network].filter(item=>{
        return item.sourceChain === chain;
    })
    return data?{data:data[0],error:null}:{data:null,error:'data not found'};
}

export const get_support_token_local = (network:SUPPORT_NETWORK,chain:SUPPORT_CHAINS,tokenname:string)=>{
    const data = get_support_tokens_local(network,chain);
    if(data.data){
        const token = data.data.supportedTokens.filter(item=>{
            return item.token.name === tokenname;
        })
        return token?token[0]:null;
    }
    return null;
}

  // 使用示例
//   const inputData: InputData = {
//     "Mainnet": {
//       "Ethereum": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 },
//         { "name": "SOL", "symbol": "WSOL", "contract": "0xD31a59c85aE9D8edEFeC411D448f90841571b89c", "decimal": 9 },
//         { "name": "SUI", "symbol": "SUI", "contract": "0x84074EA631dEc7a4edcD5303d164D5dEa4c653D6", "decimal": 9 },
//         { "name": "USDT", "symbol": "USDT", "contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "decimal": 6 },
//         { "name": "USDC", "symbol": "USDC", "contract": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "decimal": 6 }
//       ],
//       "Optimism": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 },
//         { "name": "SUI", "symbol": "SUI", "contract": "0x27A533e438892DA192725b4C9AcA51447F457212", "decimal": 9 },
//         { "name": "USDT", "symbol": "USDT", "contract": "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", "decimal": 6 },
//         { "name": "USDC", "symbol": "USDC", "contract": "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", "decimal": 6 }
//       ],
//       "Base": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 },
//         { "name": "SUI", "symbol": "SUI", "contract": "0x36c6FBF7B49bF65f5f82b674af219C05b2a4aDD1", "decimal": 9 },
//         { "name": "USDT", "symbol": "USDT", "contract": "0xfde4C96c8593536E31F229EA8f37b2AdA2699bb2", "decimal": 6 },
//         { "name": "USDC", "symbol": "USDC", "contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "decimal": 6 }
//       ],
//       "Arbitrum": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 },
//         { "name": "SUI", "symbol": "SUI", "contract": "0xCF79d86B8a830030aF6D835737d6eac3bE823fD7", "decimal": 9 },
//         { "name": "USDC", "symbol": "USDC", "contract": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "decimal": 6 },
//         { "name": "USDT", "symbol": "USDT", "contract": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "decimal": 6 }
//       ]
//     },
//     "Testnet": {
//       "Ethereum": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 },
//         { "name": "USDC", "symbol": "USDC", "contract": "0x1234567890abcdef1234567890abcdef12345678", "decimal": 6 }
//       ],
//       "Optimism": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 },
//         { "name": "USDC", "symbol": "USDC", "contract": "0xabcdef1234567890abcdef1234567890abcdef12", "decimal": 6 }
//       ],
//       "Base": [],
//       "Arbitrum": []
//     },
//     "Devnet": {
//       "Ethereum": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 }
//       ],
//       "Optimism": [],
//       "Base": [
//         { "name": "ETH", "symbol": "ETH", "contract": "native", "decimal": 18 }
//       ],
//       "Arbitrum": []
//     }
//   };
  
//   const transformedData = transformData(inputData);
//   console.log(JSON.stringify(transformedData, null, 2));