/**
 * Calculate Morpho Blue Market ID
 *
 * Market ID = keccak256(abi.encode(loanToken, collateralToken, oracle, irm, lltv))
 */

import { ethers } from 'ethers';

interface MarketParams {
    loanToken: string;
    collateralToken: string;
    oracle: string;
    irm: string;
    lltv: bigint;
}

function calculateMarketId(params: MarketParams): string {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'address', 'address', 'uint256'],
        [
            params.loanToken,
            params.collateralToken,
            params.oracle,
            params.irm,
            params.lltv
        ]
    );

    return ethers.keccak256(encoded);
}

// Example: Calculate for cbETH/USDC market on Base
const cbethUsdcParams: MarketParams = {
    loanToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    collateralToken: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', // cbETH on Base
    oracle: '0x0000000000000000000000000000000000000000', // NEED REAL ORACLE ADDRESS
    irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
    lltv: 860000000000000000n // 86%
};

console.log('Market ID calculation:');
console.log('Parameters:', {
    ...cbethUsdcParams,
    lltv: cbethUsdcParams.lltv.toString()
});
console.log('\nCalculated Market ID:', calculateMarketId(cbethUsdcParams));

// Verify existing market IDs
console.log('\n\nVerifying existing market IDs:');

const wethUsdcBase: MarketParams = {
    loanToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    collateralToken: '0x4200000000000000000000000000000000000006', // WETH
    oracle: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
    irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
    lltv: 860000000000000000n
};

console.log('\nWETH/USDC on Base:');
console.log('Expected:', '0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda');
console.log('Calculated:', calculateMarketId(wethUsdcBase));
console.log('Match:', calculateMarketId(wethUsdcBase) === '0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda');
