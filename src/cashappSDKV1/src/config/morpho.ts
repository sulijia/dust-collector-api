// Morpho configuration and ABIs (Blue + Vaults)
export type MorphoAssetRole = 'collateral' | 'loan' | 'reward' | string;

export interface MorphoAssetConfig {
    symbol: string;
    address: string;
    decimals: number;
    role?: MorphoAssetRole;
}

export interface MorphoMarketConfig {
    name?: string;
    id: string; // Market ID (hash of market parameters)
    loanToken: string;
    collateralToken: string;
    oracle: string;
    irm: string; // Interest Rate Model
    lltv: bigint; // Liquidation Loan-to-Value (18 decimals)
    assets: Record<string, MorphoAssetConfig>;
}

// Vault configuration
export interface MorphoVaultConfig {
    name: string;
    address: string;
    asset: string;          // Underlying asset symbol (e.g., 'USDC')
    assetAddress: string;   // Underlying asset token address
    decimals: number;       // Asset decimals
    category?: string;      // e.g., 'steakhouse', 'gauntlet', 'flagship'
    description?: string;
}

export interface MorphoChainConfig {
    morphoBlue: string; // Main Morpho Blue contract address
    defaultMarket: string;
    markets: Record<string, MorphoMarketConfig>;
    vaults?: Record<string, MorphoVaultConfig>; // Morpho Vaults (ERC4626)
}

export type MorphoMarketRegistry = Record<string, MorphoChainConfig>;

export const MORPHO_CONFIG: MorphoMarketRegistry = {
    ethereum: {
        morphoBlue: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
        defaultMarket: 'wsteth-usdc',
        markets: {
            'wsteth-usdc': {
                name: 'wstETH/USDC',
                id: '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc',
                loanToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                collateralToken: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', // wstETH
                oracle: '0x2a01EB9496094dA03c4E364Def50f5aD1280AD72',
                irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
                lltv: 860000000000000000n, // 86%
                assets: {
                    USDC: {
                        symbol: 'USDC',
                        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                        decimals: 6,
                        role: 'loan'
                    },
                    wstETH: {
                        symbol: 'wstETH',
                        address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
                        decimals: 18,
                        role: 'collateral'
                    }
                }
            },
            'weth-usdc': {
                name: 'WETH/USDC',
                id: '0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49',
                loanToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                collateralToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
                oracle: '0x48F7E36EB6B826B2dF4B2E630B62Cd25e89E40e2',
                irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
                lltv: 860000000000000000n, // 86%
                assets: {
                    USDC: {
                        symbol: 'USDC',
                        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                        decimals: 6,
                        role: 'loan'
                    },
                    WETH: {
                        symbol: 'WETH',
                        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                        decimals: 18,
                        role: 'collateral'
                    }
                }
            }
        },
        vaults: {
            'steakhouse-usdc': {
                name: 'Steakhouse USDC',
                address: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
                asset: 'USDC',
                assetAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6,
                category: 'steakhouse',
                description: 'Steakhouse Financial USDC vault'
            },
            'gauntlet-usdc-prime': {
                name: 'Gauntlet USDC Prime',
                address: '0xdd0f28e19C1780eb6396170735D45153D261490d',
                asset: 'USDC',
                assetAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6,
                category: 'gauntlet',
                description: 'Gauntlet USDC Prime vault'
            },
            're7-usdc': {
                name: 'Re7 USDC',
                address: '0x78Fc2c2eD1A4cDb5402365934aE5648aDAd094d0',
                asset: 'USDC',
                assetAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6,
                category: 're7',
                description: 'Re7 Labs USDC vault'
            }
        }
    },
    base: {
        morphoBlue: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
        defaultMarket: 'weth-usdc',
        markets: {
            'weth-usdc': {
                name: 'WETH/USDC',
                id: '0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda',
                loanToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
                collateralToken: '0x4200000000000000000000000000000000000006', // WETH
                oracle: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
                irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
                lltv: 860000000000000000n, // 86%
                assets: {
                    USDC: {
                        symbol: 'USDC',
                        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                        decimals: 6,
                        role: 'loan'
                    },
                    WETH: {
                        symbol: 'WETH',
                        address: '0x4200000000000000000000000000000000000006',
                        decimals: 18,
                        role: 'collateral'
                    }
                }
            },
            // FIXME: cbeth-usdc market needs correct market ID and oracle address
            // Visit https://app.morpho.org/ to get the correct values
            // Or use the calculateMarketId.ts script after getting the oracle address
            /*
            'cbeth-usdc': {
                name: 'cbETH/USDC',
                id: '0x3d83b6b5e8b8a4e0e3a0e3e8b0e3e8b0e3e8b0e3', // INCORRECT: needs real value
                loanToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
                collateralToken: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', // cbETH
                oracle: '0x0000000000000000000000000000000000000000', // INCORRECT: needs real oracle
                irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
                lltv: 860000000000000000n, // 86%
                assets: {
                    USDC: {
                        symbol: 'USDC',
                        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                        decimals: 6,
                        role: 'loan'
                    },
                    cbETH: {
                        symbol: 'cbETH',
                        address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
                        decimals: 18,
                        role: 'collateral'
                    }
                }
            }
            */
        },
        vaults: {
            'steakhouse-usdc': {
                name: 'Steakhouse USDC',
                address: '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183',
                asset: 'USDC',
                assetAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                decimals: 6,
                category: 'steakhouse',
                description: 'Steakhouse Financial USDC vault on Base'
            },
            'gauntlet-usdc-core': {
                name: 'Gauntlet USDC Core',
                address: '0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61',
                asset: 'USDC',
                assetAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                decimals: 6,
                category: 'gauntlet',
                description: 'Gauntlet USDC Core vault on Base'
            }
        }
    }
};

// Export MORPHO_MARKETS for backward compatibility
export const MORPHO_MARKETS = MORPHO_CONFIG;

// Morpho ABIs (Blue + Vaults)
export const MORPHO_ABI = {
    morphoBlue: [
        'function supply(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes calldata data)',
        'function withdraw(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver)',
        'function borrow(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver)',
        'function repay(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes calldata data)',
        'function supplyCollateral(bytes32 id, uint256 assets, address onBehalf, bytes calldata data)',
        'function withdrawCollateral(bytes32 id, uint256 assets, address onBehalf, address receiver)',
        'function position(bytes32 id, address user) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)',
        'function market(bytes32 id) view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)',
        'function idToMarketParams(bytes32 id) view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)',
        'function accrueInterest(bytes32 id)',
        'function supplyRate(bytes32 id) view returns (uint256)',
        'function borrowRate(bytes32 id) view returns (uint256)'
    ],
    erc20: [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
    ],
    erc4626: [
        // Asset management
        'function asset() view returns (address)',
        'function totalAssets() view returns (uint256)',
        // Share management
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        // Conversion functions
        'function convertToShares(uint256 assets) view returns (uint256)',
        'function convertToAssets(uint256 shares) view returns (uint256)',
        // Withdraw limits
        'function maxWithdraw(address owner) view returns (uint256)',
        'function maxRedeem(address owner) view returns (uint256)',
        // Preview functions
        'function previewDeposit(uint256 assets) view returns (uint256)',
        'function previewRedeem(uint256 shares) view returns (uint256)',
        // Deposit/Withdraw
        'function deposit(uint256 assets, address receiver) returns (uint256)',
        'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
        'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
        // Metadata
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
    ]
};

export const MORPHO_CHAIN_IDS = {
    ethereum: 1,
    base: 8453
};

export const MORPHO_CHAIN_NAMES = Object.fromEntries(
    Object.entries(MORPHO_CHAIN_IDS).map(([name, id]) => [id, name])
) as Record<number | string, string>;
