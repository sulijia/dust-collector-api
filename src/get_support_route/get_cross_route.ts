import {
    Wormhole,
    PlatformUtils,
    chainToPlatform,
    Chain,
    Platform
} from '@wormhole-foundation/sdk-connect';
import { EvmAddress, EvmPlatform } from "@wormhole-foundation/sdk-evm";
import {SolanaAddress, SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import {AlgorandAddress, AlgorandPlatform } from "@wormhole-foundation/sdk-algorand";
import {AptosAddress, AptosPlatform } from "@wormhole-foundation/sdk-aptos";
import {CosmwasmAddress, CosmwasmPlatform } from "@wormhole-foundation/sdk-cosmwasm";
import {SuiAddress, SuiPlatform } from "@wormhole-foundation/sdk-sui";

import { SUPPORT_CHAINS, SUPPORT_NETWORK} from '../const';
import {routes} from '@wormhole-foundation/sdk';
import { get_support_token_local } from '../get_support_tokens_LC/get_support_tokens_lc';
import {MayanRouteSWIFT} from '@mayanfinance/wormhole-sdk-route';


export const PLATFORMS : Record<Platform,PlatformUtils<any>|null> = {
    'Evm' : EvmPlatform,
    'Algorand': AlgorandPlatform,
    'Aptos': AptosPlatform,
    'Cosmwasm' : CosmwasmPlatform,
    'Solana':SolanaPlatform,
    'Sui':SuiPlatform,
    'Btc': null,
    'Near': null
}

export const get_cross_router = async (network:SUPPORT_NETWORK,src:SUPPORT_CHAINS,dest:SUPPORT_CHAINS ,tokenname:string)=>{

    const src_platform =  chainToPlatform.get(src);
    if (src_platform === undefined){
        return {data:null,error:("source or destination symbol not support!")};
    }

    const dest_platform = chainToPlatform.get(dest);
    if (!dest_platform){
        return {data:null,error:("source or destination symbol not support!")};
    }

    const sendToken = get_support_token_local(network,src,tokenname);
    if(!sendToken){
        return {data:null,error:(`${network} ${src} ${tokenname}  not support`)};
    }
    const destToken = get_support_token_local(network,dest,tokenname);
    if(!destToken){
        return {data:null,error:(`${network} ${dest} ${tokenname}  not support`)};
    }

    // console.log(`src ${src_platform}, sendtoken address ${sendToken.token.address}`)
    // console.log(`dest ${dest_platform}, desttoken address ${destToken.token.address}`)

    // console.log(`src platform ${src_platform}, dest platform ${dest_platform}`);

    let platforms : PlatformUtils<any>[] = [];
    if (dest_platform === src_platform){
        let platform = PLATFORMS[src_platform];
        if (platform === null)
        {
            return {data:null,error:("source or destination symbol not support!")};
        }
        platforms.push(platform);
    }
    else{
        let _src_platform = PLATFORMS[src_platform];
        let _dest_platform = PLATFORMS[dest_platform];
        if (_src_platform === null || _dest_platform === null)
        {
            return {data:null,error:("source or destination symbol not support!")};
        }
        platforms.push(_src_platform);
        platforms.push(_dest_platform);
    }   

    let wh = new Wormhole(network,platforms);
    // console.log(network);
    // console.log(platforms.length, platforms);
    const resolver = wh.resolver([
        routes.TokenBridgeRoute, // manual token bridge
        routes.AutomaticTokenBridgeRoute, // automatic token bridge
        routes.CCTPRoute, // manual CCTP
        routes.AutomaticCCTPRoute, // automatic CCTP
        routes.AutomaticPorticoRoute, // Native eth transfers
        MayanRouteSWIFT
      ]);

    const sendChain = wh.getChain(src as Chain);
    const destChain = wh.getChain(dest as Chain);

    const sendToken_wh = Wormhole.tokenId(sendChain.chain, sendToken.token.address);
    const destToken_wh = Wormhole.tokenId(destChain.chain,destToken.token.address);
    // console.log(`sendtoken address ${sendToken.token.address}, desttoken address ${destToken.token.address}`);

    const tr = await routes.RouteTransferRequest.create(wh, {
        source: sendToken_wh,
        destination: destToken_wh,
      });
    
    if(!tr)
    {
        return {data:null,error:(`network:${network}, srcchain:${src},destchain:${dest},tokenname: ${tokenname} can not found route`)}
    }

    const foundRoutes = await resolver.findRoutes(tr);
    
    if(!foundRoutes || foundRoutes.length<=0){
        return {data:null,error:(`network:${network}, srcchain:${src},destchain:${dest},tokenname: ${tokenname} can not found route`)};
    }


    // const dstTokens = await resolver.supportedDestinationTokens(
    //     sendToken_wh,
    //     sendChain,
    //     destChain
    // );
    return {data:foundRoutes[0],error:null};
}