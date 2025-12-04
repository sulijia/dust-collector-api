/**
 * Morpho SDK - Complete Morpho Blue + Vaults Integration
 *
 * Core Principles (Linus Torvalds Design Philosophy):
 * 1. "Good Taste" - Eliminate special cases
 * 2. Data structures first - Good APIs start with good data
 * 3. Simplicity - Complexity is the root of all evil
 * 4. Pragmatism - Solve real problems, not theoretical ones
 *
 * This SDK provides unified access to:
 * - Morpho Blue markets (direct lending/borrowing)
 * - Morpho Vaults (ERC4626 yield optimization)
 */

import {
    Contract,
    JsonRpcProvider,
    Wallet,
    MaxUint256,
    formatUnits,
    parseUnits,
    getAddress
} from 'ethers';
import {
    MORPHO_CONFIG,
    MORPHO_MARKETS,
    MORPHO_ABI,
    MORPHO_CHAIN_IDS,
    MORPHO_CHAIN_NAMES,
    type MorphoAssetConfig,
    type MorphoMarketConfig,
    type MorphoChainConfig,
    type MorphoVaultConfig
} from '../config/morpho';
import { DEFAULT_RPCS } from '../config/common';

type DynamicContract = Contract & Record<string, any>;

interface AssetContext {
    marketKey: string;
    market: MorphoMarketConfig;
    assetKey: string;
    assetInfo: MorphoAssetConfig | null;
    symbol: string;
}

interface AssetLookup {
    bySymbol: Record<string, AssetContext[]>;
    byAddress: Record<string, AssetContext[]>;
    primaryByAddress: Record<string, AssetContext | null>;
}

// ========== CORE DATA STRUCTURES ==========

/**
 * Morpho Operation Result - The fundamental data structure
 * Linus: "Bad programmers worry about the code. Good programmers worry about data structures."
 */
export class MorphoResult {
    success: boolean;
    hash?: string;
    receipt?: any;
    gasUsed?: any;
    error?: any;
    timestamp: number;
    amount?: any;
    apr?: any;
    balance?: any;

    constructor(success: boolean, data: any = {}) {
        this.success = success;
        this.hash = data.hash;
        this.receipt = data.receipt;
        this.gasUsed = data.gasUsed;
        this.error = data.error;
        this.timestamp = Date.now();

        // Operation-specific data
        this.amount = data.amount;
        this.apr = data.apr;
        this.balance = data.balance;
    }

    static success(data: any) {
        return new MorphoResult(true, data);
    }

    static failure(error: any) {
        return new MorphoResult(false, { error: error.message || error });
    }

    toJSON() {
        return {
            success: this.success,
            hash: this.hash,
            gasUsed: this.gasUsed,
            error: this.error,
            amount: this.amount,
            apr: this.apr,
            balance: this.balance,
            timestamp: this.timestamp
        };
    }
}

/**
 * APR Data - Morpho yield information
 * Encapsulates all yield-related metrics
 */
export class MorphoAPR {
    supplyAPR: number;
    borrowAPR: number;
    asset: any;
    timestamp: number;

    constructor(data: any) {
        this.supplyAPR = data.supplyAPR || 0;
        this.borrowAPR = data.borrowAPR || 0;
        this.asset = data.asset;
        this.timestamp = Date.now();
    }

    get supplyAPRPercentage() {
        return this.supplyAPR * 100;
    }

    get borrowAPRPercentage() {
        return this.borrowAPR * 100;
    }

    toJSON() {
        return {
            asset: this.asset,
            supplyAPR: this.supplyAPR,
            borrowAPR: this.borrowAPR,
            supplyAPRPercentage: this.supplyAPRPercentage,
            borrowAPRPercentage: this.borrowAPRPercentage,
            timestamp: this.timestamp
        };
    }
}

/**
 * User Balance - Account position data
 * Simple, clear data structure for user's position
 */
export class MorphoBalance {
    asset: any;
    supplied: number;
    borrowed: number;
    collateral: number;
    timestamp: number;

    constructor(data: any) {
        this.asset = data.asset;
        this.supplied = data.supplied || 0;
        this.borrowed = data.borrowed || 0;
        this.collateral = data.collateral || 0;
        this.timestamp = Date.now();
    }

    get netValue() {
        return this.supplied + this.collateral - this.borrowed;
    }

    toJSON() {
        return {
            asset: this.asset,
            supplied: this.supplied,
            borrowed: this.borrowed,
            collateral: this.collateral,
            netValue: this.netValue,
            timestamp: this.timestamp
        };
    }
}

/**
 * Vault Balance - User's position in a Morpho Vault
 * ERC4626-based vault position data
 */
export class VaultBalance {
    vault: string;
    vaultAddress: string;
    asset: string;
    shares: number;          // User's vault shares
    assets: number;          // Underlying assets (USDC, WETH, etc.)
    totalShares: number;     // Total vault shares
    totalAssets: number;     // Total vault assets
    sharePrice: number;      // Price per share (assets/shares)
    timestamp: number;

    constructor(data: any) {
        this.vault = data.vault;
        this.vaultAddress = data.vaultAddress;
        this.asset = data.asset;
        this.shares = data.shares || 0;
        this.assets = data.assets || 0;
        this.totalShares = data.totalShares || 0;
        this.totalAssets = data.totalAssets || 0;
        this.sharePrice = data.totalShares > 0 ? data.totalAssets / data.totalShares : 1;
        this.timestamp = Date.now();
    }

    toJSON() {
        return {
            vault: this.vault,
            vaultAddress: this.vaultAddress,
            asset: this.asset,
            shares: this.shares,
            assets: this.assets,
            totalShares: this.totalShares,
            totalAssets: this.totalAssets,
            sharePrice: this.sharePrice,
            timestamp: this.timestamp
        };
    }
}

// ========== MORPHO SDK CORE ==========

export interface MorphoSDKConfig {
    chainId: number;
    rpcUrl: string;
    privateKey?: string;
    slippage?: number;
    verbose?: boolean;
}

export class MorphoSDK {
    chainId: number;
    rpcUrl: string;
    privateKey?: string;
    slippage: number;
    private _provider: JsonRpcProvider | null;
    private _wallet: Wallet | null;
    chainConfig: MorphoChainConfig;
    markets: Record<string, MorphoMarketConfig>;
    vaults: Record<string, MorphoVaultConfig>;
    defaultMarketKey: string;
    defaultMarket: MorphoMarketConfig;
    morphoBlue: string;
    private _lookup: AssetLookup;
    private _morphoCache: Record<string, DynamicContract>;
    private _vaultCache: Record<string, DynamicContract>;
    verbose: boolean;

    constructor(config: MorphoSDKConfig) {
        // Validate required config
        if (!config.chainId) throw new Error('chainId is required');
        if (!config.rpcUrl) throw new Error('rpcUrl is required');

        this.chainId = config.chainId;
        this.rpcUrl = config.rpcUrl;
        this.privateKey = config.privateKey;
        this.slippage = config.slippage || 0.005; // 0.5% default

        // Initialize provider (lazy)
        this._provider = null;
        this._wallet = null;

        // Market configuration
        this.chainConfig = this._getChainConfig(config.chainId);
        this.markets = this.chainConfig.markets || {};
        this.vaults = this.chainConfig.vaults || {};
        this.defaultMarketKey = this.chainConfig.defaultMarket || Object.keys(this.markets || {})[0];
        if (!this.defaultMarketKey) {
            throw new Error(`No Morpho markets configured for chain ${config.chainId}`);
        }
        this.defaultMarket = this.markets[this.defaultMarketKey];
        this.morphoBlue = this.chainConfig.morphoBlue;

        // Build asset lookup for dynamic market resolution
        this._lookup = this._buildAssetLookup(this.markets);

        // Lazy cache for contract instances
        this._morphoCache = {};
        this._vaultCache = {};

        // Simple logging
        this.verbose = config.verbose || false;
    }

    // ========== PUBLIC API - APR METHODS ==========

    /**
     * Get supply APR for market
     * Returns: decimal APR (e.g., 0.05 = 5%)
     */
    async getSupplyAPR(marketKey) {
        try {
            const market = this._resolveMarket(marketKey);
            const morpho = this._getMorphoContract();

            // Get supply rate for the market
            const supplyRate = await morpho.supplyRate(market.id);

            // Convert to APR (Morpho rates are per second)
            const secondsPerYear = 365.25 * 24 * 60 * 60;
            const apr = (Number(supplyRate) / 1e18) * secondsPerYear;

            this._log(`Supply APR for ${market.name || marketKey}: ${(apr * 100).toFixed(2)}%`);
            return apr;

        } catch (error) {
            throw new Error(`Failed to get supply APR for ${marketKey}: ${error.message}`);
        }
    }

    /**
     * Get borrow APR for market
     * Returns: decimal APR for borrowing
     */
    async getBorrowAPR(marketKey) {
        try {
            const market = this._resolveMarket(marketKey);
            const morpho = this._getMorphoContract();

            // Get borrow rate for the market
            const borrowRate = await morpho.borrowRate(market.id);

            // Convert to APR (Morpho rates are per second)
            const secondsPerYear = 365.25 * 24 * 60 * 60;
            const apr = (Number(borrowRate) / 1e18) * secondsPerYear;

            this._log(`Borrow APR for ${market.name || marketKey}: ${(apr * 100).toFixed(2)}%`);
            return apr;

        } catch (error) {
            throw new Error(`Failed to get borrow APR for ${marketKey}: ${error.message}`);
        }
    }

    /**
     * Get both supply and borrow APR
     * Returns: MorphoAPR object
     */
    async getTotalAPR(marketKey) {
        try {
            const [supplyAPR, borrowAPR] = await Promise.all([
                this.getSupplyAPR(marketKey),
                this.getBorrowAPR(marketKey)
            ]);

            return new MorphoAPR({
                asset: marketKey,
                supplyAPR,
                borrowAPR
            });

        } catch (error) {
            throw new Error(`Failed to get total APR: ${error.message}`);
        }
    }

    // ========== PUBLIC API - USER ACTIONS ==========

    /**
     * Supply asset to Morpho
     * Returns: MorphoResult
     */
    async supply(marketKey, amount) {
        if (!this.privateKey) {
            throw new Error('privateKey required for supply operations');
        }

        try {
            const wallet = this._getWallet();
            const market = this._resolveMarket(marketKey);
            const loanAsset = market.assets[Object.keys(market.assets).find(
                key => market.assets[key].role === 'loan'
            )];

            if (!loanAsset) {
                throw new Error(`No loan asset found for market ${marketKey}`);
            }

            const amountWei = this._toWei(amount, loanAsset.decimals);

            // Handle approval first
            await this._handleApproval(wallet, loanAsset.address, this.morphoBlue, amountWei);

            // Execute supply to Morpho
            const morpho = this._getMorphoContract();
            const tx = await (morpho.connect(wallet) as DynamicContract).supply(
                market.id,
                amountWei,
                0, // shares (0 means use assets amount)
                wallet.address,
                '0x' // data
            );

            this._log(`Supply transaction sent: ${tx.hash} (${loanAsset.symbol} on ${market.name})`);

            const receipt = await tx.wait();

            return MorphoResult.success({
                hash: tx.hash,
                receipt,
                gasUsed: receipt?.gasUsed?.toString(),
                amount: amount
            });

        } catch (error) {
            return MorphoResult.failure(error);
        }
    }

    /**
     * Withdraw asset from Morpho
     * Returns: MorphoResult
     */
    async withdraw(marketKey, amount) {
        if (!this.privateKey) {
            throw new Error('privateKey required for withdraw operations');
        }

        try {
            const wallet = this._getWallet();
            const market = this._resolveMarket(marketKey);
            const loanAsset = market.assets[Object.keys(market.assets).find(
                key => market.assets[key].role === 'loan'
            )];

            if (!loanAsset) {
                throw new Error(`No loan asset found for market ${marketKey}`);
            }

            const amountWei = this._toWei(amount, loanAsset.decimals);

            // Execute withdraw from Morpho
            const morpho = this._getMorphoContract();
            const tx = await (morpho.connect(wallet) as DynamicContract).withdraw(
                market.id,
                amountWei,
                0, // shares (0 means use assets amount)
                wallet.address,
                wallet.address
            );

            this._log(`Withdraw transaction sent: ${tx.hash} (${loanAsset.symbol} on ${market.name})`);

            const receipt = await tx.wait();

            return MorphoResult.success({
                hash: tx.hash,
                receipt,
                gasUsed: receipt?.gasUsed?.toString(),
                amount: amount
            });

        } catch (error) {
            return MorphoResult.failure(error);
        }
    }

    /**
     * Get user balance for market
     * Returns: MorphoBalance
     */
    async getBalance(marketKey, userAddress) {
        try {
            const market = this._resolveMarket(marketKey);
            const morpho = this._getMorphoContract();

            // Get position from Morpho
            const position = await morpho.position(market.id, userAddress);

            // Get market info to convert shares to assets
            const marketInfo = await morpho.market(market.id);

            const loanAsset = market.assets[Object.keys(market.assets).find(
                key => market.assets[key].role === 'loan'
            )];
            const collateralAsset = market.assets[Object.keys(market.assets).find(
                key => market.assets[key].role === 'collateral'
            )];

            // Convert shares to assets
            const supplyShares = BigInt(position.supplyShares);
            const borrowShares = BigInt(position.borrowShares);
            const collateral = BigInt(position.collateral);

            const totalSupplyShares = BigInt(marketInfo.totalSupplyShares);
            const totalSupplyAssets = BigInt(marketInfo.totalSupplyAssets);
            const totalBorrowShares = BigInt(marketInfo.totalBorrowShares);
            const totalBorrowAssets = BigInt(marketInfo.totalBorrowAssets);

            let supplied = 0;
            let borrowed = 0;

            if (totalSupplyShares > 0n) {
                const supplyAssets = (supplyShares * totalSupplyAssets) / totalSupplyShares;
                supplied = this._fromWei(supplyAssets.toString(), loanAsset?.decimals || 18);
            }

            if (totalBorrowShares > 0n) {
                const borrowAssets = (borrowShares * totalBorrowAssets) / totalBorrowShares;
                borrowed = this._fromWei(borrowAssets.toString(), loanAsset?.decimals || 18);
            }

            const collateralAmount = this._fromWei(collateral.toString(), collateralAsset?.decimals || 18);

            return new MorphoBalance({
                asset: market.name || marketKey,
                supplied,
                borrowed,
                collateral: collateralAmount
            });

        } catch (error) {
            throw new Error(`Failed to get balance for ${marketKey}: ${error.message}`);
        }
    }

    // ========== INTERNAL METHODS ==========

    _getChainConfig(chainId: number): MorphoChainConfig {
        const chainName = MORPHO_CHAIN_NAMES[chainId];
        if (!chainName) {
            throw new Error(`Unsupported chain: ${chainId}`);
        }
        return MORPHO_MARKETS[chainName];
    }

    _resolveMarket(marketKey: string): MorphoMarketConfig {
        if (!marketKey) {
            return this.defaultMarket;
        }

        const market = this.markets[marketKey.toLowerCase()];
        if (!market) {
            throw new Error(`Unknown market: ${marketKey}`);
        }

        return market;
    }

    _buildAssetLookup(markets: Record<string, MorphoMarketConfig>): AssetLookup {
        const lookup: AssetLookup = {
            bySymbol: {},
            byAddress: {},
            primaryByAddress: {}
        };

        if (!markets) return lookup;

        for (const [marketKey, market] of Object.entries(markets)) {
            for (const [symbol, info] of Object.entries(market.assets)) {
                const context: AssetContext = {
                    marketKey,
                    market,
                    assetKey: symbol,
                    assetInfo: info,
                    symbol: info.symbol || symbol
                };

                const normalizedSymbol = symbol.toLowerCase();
                if (!lookup.bySymbol[normalizedSymbol]) {
                    lookup.bySymbol[normalizedSymbol] = [];
                }
                lookup.bySymbol[normalizedSymbol].push(context);

                if (info.address) {
                    const normalizedAddress = info.address.toLowerCase();
                    if (!lookup.byAddress[normalizedAddress]) {
                        lookup.byAddress[normalizedAddress] = [];
                    }
                    lookup.byAddress[normalizedAddress].push(context);
                }
            }
        }

        return lookup;
    }

    _getProvider(): JsonRpcProvider {
        if (!this._provider) {
            this._provider = new JsonRpcProvider(this.rpcUrl);
        }
        return this._provider;
    }

    _getWallet(): Wallet {
        if (!this._wallet) {
            this._wallet = new Wallet(this.privateKey, this._getProvider());
        }
        return this._wallet;
    }

    _getMorphoContract(): DynamicContract {
        const address = getAddress(this.morphoBlue);
        if (!this._morphoCache[address]) {
            this._morphoCache[address] = new Contract(
                address,
                MORPHO_ABI.morphoBlue,
                this._getProvider()
            ) as DynamicContract;
        }
        return this._morphoCache[address];
    }

    _getERC20Contract(address: string): DynamicContract {
        return new Contract(address, MORPHO_ABI.erc20, this._getProvider()) as DynamicContract;
    }

    async _handleApproval(wallet: Wallet, tokenAddress: string, spenderAddress: string, amount: bigint) {
        const token = this._getERC20Contract(tokenAddress);

        // Check current allowance
        const currentAllowance = await token.allowance(wallet.address, spenderAddress);

        if (currentAllowance >= amount) {
            this._log(`Allowance sufficient for ${tokenAddress}`);
            return;
        }

        // Execute approve
        this._log(`Approving ${tokenAddress} for ${spenderAddress}`);
        const approveTx = await (token.connect(wallet) as DynamicContract).approve(spenderAddress, MaxUint256);
        await approveTx.wait();
        this._log(`Approval confirmed: ${approveTx.hash}`);
    }

    _toWei(amount: number, decimals = 18): bigint {
        return parseUnits(amount.toString(), decimals);
    }

    _fromWei(amount: bigint | string, decimals = 18): number {
        return Number(formatUnits(amount, decimals));
    }

    _log(message: string) {
        if (this.verbose) {
            console.log(`[MorphoSDK] ${message}`);
        }
    }

    // ========== VAULT METHODS (ERC4626) ==========

    /**
     * Get user balance in a specific vault
     */
    async getVaultBalance(vaultKey: string, userAddress: string): Promise<VaultBalance> {
        try {
            const vaultConfig = this._resolveVault(vaultKey);
            const vault = this._getVaultContract(vaultConfig.address);

            // Get user shares
            const userShares = await vault.balanceOf(userAddress);
            const shares = this._fromWei(userShares, vaultConfig.decimals);

            // Convert shares to assets
            const userAssets = await vault.convertToAssets(userShares);
            const assets = this._fromWei(userAssets, vaultConfig.decimals);

            // Get vault totals
            const totalShares = await vault.totalSupply();
            const totalAssets = await vault.totalAssets();

            this._log(`Vault ${vaultKey}: ${assets.toFixed(6)} ${vaultConfig.asset} (${shares.toFixed(6)} shares)`);

            return new VaultBalance({
                vault: vaultConfig.name,
                vaultAddress: vaultConfig.address,
                asset: vaultConfig.asset,
                shares,
                assets,
                totalShares: this._fromWei(totalShares, vaultConfig.decimals),
                totalAssets: this._fromWei(totalAssets, vaultConfig.decimals)
            });

        } catch (error) {
            throw new Error(`Failed to get vault balance for ${vaultKey}: ${error.message}`);
        }
    }

    /**
     * Get user balances across all vaults
     */
    async getAllVaultBalances(userAddress: string): Promise<VaultBalance[]> {
        const balances: VaultBalance[] = [];

        for (const [vaultKey, vaultConfig] of Object.entries(this.vaults)) {
            try {
                const balance = await this.getVaultBalance(vaultKey, userAddress);

                // Only include vaults with non-zero balance
                if (balance.assets > 0 || balance.shares > 0) {
                    balances.push(balance);
                }
            } catch (error) {
                this._log(`Warning: Could not get balance for ${vaultKey}: ${error.message}`);
            }
        }

        return balances;
    }

    /**
     * Get maximum withdrawable amount from vault
     */
    async getMaxWithdraw(vaultKey: string, userAddress: string): Promise<number> {
        try {
            const vaultConfig = this._resolveVault(vaultKey);
            const vault = this._getVaultContract(vaultConfig.address);

            const maxWithdraw = await vault.maxWithdraw(userAddress);
            return this._fromWei(maxWithdraw, vaultConfig.decimals);

        } catch (error) {
            throw new Error(`Failed to get max withdraw for ${vaultKey}: ${error.message}`);
        }
    }

    /**
     * Deposit assets to vault
     */
    async depositToVault(vaultKey: string, amount: number): Promise<MorphoResult> {
        if (!this.privateKey) {
            throw new Error('privateKey required for deposit operations');
        }

        try {
            const wallet = this._getWallet();
            const vaultConfig = this._resolveVault(vaultKey);
            const amountWei = this._toWei(amount, vaultConfig.decimals);

            // Approve vault to spend assets
            await this._handleApproval(wallet, vaultConfig.assetAddress, vaultConfig.address, amountWei);

            // Deposit to vault
            const vault = this._getVaultContract(vaultConfig.address);
            const tx = await (vault.connect(wallet) as DynamicContract).deposit(
                amountWei,
                wallet.address
            );

            this._log(`Deposit transaction sent: ${tx.hash} (${amount} ${vaultConfig.asset} to ${vaultConfig.name})`);

            const receipt = await tx.wait();

            return MorphoResult.success({
                hash: tx.hash,
                receipt,
                gasUsed: receipt?.gasUsed?.toString(),
                amount: amount
            });

        } catch (error) {
            return MorphoResult.failure(error);
        }
    }

    /**
     * Withdraw assets from vault
     */
    async withdrawFromVault(vaultKey: string, amount: number): Promise<MorphoResult> {
        if (!this.privateKey) {
            throw new Error('privateKey required for withdraw operations');
        }

        try {
            const wallet = this._getWallet();
            const vaultConfig = this._resolveVault(vaultKey);
            const amountWei = this._toWei(amount, vaultConfig.decimals);

            // Withdraw from vault
            const vault = this._getVaultContract(vaultConfig.address);
            const tx = await (vault.connect(wallet) as DynamicContract).withdraw(
                amountWei,
                wallet.address,
                wallet.address
            );

            this._log(`Withdraw transaction sent: ${tx.hash} (${amount} ${vaultConfig.asset} from ${vaultConfig.name})`);

            const receipt = await tx.wait();

            return MorphoResult.success({
                hash: tx.hash,
                receipt,
                gasUsed: receipt?.gasUsed?.toString(),
                amount: amount
            });

        } catch (error) {
            return MorphoResult.failure(error);
        }
    }

    /**
     * List all available vaults on this chain
     */
    listVaults(): MorphoVaultConfig[] {
        return Object.values(this.vaults);
    }

    /**
     * Get vault configuration
     */
    getVaultConfig(vaultKey: string): MorphoVaultConfig {
        return this._resolveVault(vaultKey);
    }

    // ========== INTERNAL VAULT METHODS ==========

    _resolveVault(vaultKey: string): MorphoVaultConfig {
        const vault = this.vaults[vaultKey.toLowerCase()];
        if (!vault) {
            throw new Error(`Unknown vault: ${vaultKey}. Available vaults: ${Object.keys(this.vaults).join(', ')}`);
        }
        return vault;
    }

    _getVaultContract(address: string): DynamicContract {
        const vaultAddress = getAddress(address);
        if (!this._vaultCache[vaultAddress]) {
            this._vaultCache[vaultAddress] = new Contract(
                vaultAddress,
                MORPHO_ABI.erc4626,
                this._getProvider()
            ) as DynamicContract;
        }
        return this._vaultCache[vaultAddress];
    }
}

export { MORPHO_MARKETS };
