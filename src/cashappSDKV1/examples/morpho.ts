/**
 * Morpho SDK Complete Example (Blue + Vaults)
 *
 * This example demonstrates:
 * 1. Initialize the Morpho SDK (unified for Blue + Vaults)
 * 2. Query Morpho Blue markets
 * 3. Query Morpho Vaults
 * 4. Get complete USDC balance
 */

import { MorphoSDK } from '../src/sdk/MorphoSDK';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const config = {
    chainId: 8453, // Base
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    privateKey: process.env.PRIVATE_KEY, // Optional, required for transactions
    verbose: true
};

async function main() {
    console.log('=== Morpho SDK Complete Example (Blue + Vaults) ===\n');

    // Initialize unified SDK
    const morpho = new MorphoSDK(config);

    const userAddress = process.env.USER_ADDRESS ||
        (config.privateKey ? morpho._getWallet().address : '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

    console.log('User:', userAddress, '\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Morpho Blue - Get APRs
    console.log('📊 1. Morpho Blue - Market APRs');
    console.log('───────────────────────────────────────────────────────────────');
    const apr = await morpho.getTotalAPR('weth-usdc');
    console.log('Supply APR:', apr.supplyAPRPercentage.toFixed(2) + '%');
    console.log('Borrow APR:', apr.borrowAPRPercentage.toFixed(2) + '%\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    // 2. Morpho Blue - Check balance
    console.log('🔵 2. Morpho Blue - Market Balance');
    console.log('───────────────────────────────────────────────────────────────');
    const blueBalance = await morpho.getBalance('weth-usdc', userAddress);
    console.log('Supplied:', blueBalance.supplied, 'USDC');
    console.log('Collateral:', blueBalance.collateral, 'WETH');
    console.log('Borrowed:', blueBalance.borrowed, 'USDC');
    console.log('Net value:', blueBalance.netValue, 'USDC\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    // 3. Morpho Vaults - List available vaults
    console.log('🏦 3. Morpho Vaults - Available Vaults');
    console.log('───────────────────────────────────────────────────────────────');
    const vaults = morpho.listVaults();
    console.log(`Found ${vaults.length} vaults on Base:\n`);
    vaults.forEach(vault => {
        console.log(`  • ${vault.name}`);
        console.log(`    Asset: ${vault.asset}`);
        console.log(`    Category: ${vault.category}`);
        console.log(`    Address: ${vault.address}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════\n');

    // 4. Morpho Vaults - Check balances
    console.log('💰 4. Morpho Vaults - User Balances');
    console.log('───────────────────────────────────────────────────────────────');
    const vaultBalances = await morpho.getAllVaultBalances(userAddress);

    if (vaultBalances.length === 0) {
        console.log('No vault positions found.\n');
    } else {
        console.log(`Found ${vaultBalances.length} vault position(s):\n`);
        vaultBalances.forEach(vb => {
            console.log(`  📦 ${vb.vault}`);
            console.log(`     Assets: ${vb.assets.toFixed(6)} ${vb.asset}`);
            console.log(`     Shares: ${vb.shares.toFixed(6)}`);
            console.log(`     Share Price: ${vb.sharePrice.toFixed(8)}\n`);
        });
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

    // 5. Complete USDC Summary
    console.log('📈 5. Complete USDC Summary');
    console.log('───────────────────────────────────────────────────────────────');

    const morphoBlueUSDC = blueBalance.supplied - blueBalance.borrowed;
    const vaultUSDC = vaultBalances
        .filter(v => v.asset === 'USDC')
        .reduce((sum, v) => sum + v.assets, 0);
    const totalMorphoUSDC = morphoBlueUSDC + vaultUSDC;

    console.log('Morpho Blue:');
    console.log(`  Supplied: ${blueBalance.supplied.toFixed(6)} USDC`);
    console.log(`  Borrowed: ${blueBalance.borrowed.toFixed(6)} USDC`);
    console.log(`  Net:      ${morphoBlueUSDC.toFixed(6)} USDC`);
    console.log();
    console.log('Morpho Vaults:');
    vaultBalances.forEach(v => {
        if (v.asset === 'USDC') {
            console.log(`  ${v.vault}: ${v.assets.toFixed(6)} USDC`);
        }
    });
    if (vaultUSDC === 0) {
        console.log('  (No vault positions)');
    }
    console.log();
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`Total USDC in Morpho: ${totalMorphoUSDC.toFixed(6)} USDC`);
    console.log();

    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('✅ Example Complete!\n');
    console.log('💡 Key Points:');
    console.log('   • Morpho SDK now includes both Blue and Vaults');
    console.log('   • Use getBalance() for Blue markets');
    console.log('   • Use getVaultBalance() or getAllVaultBalances() for Vaults');
    console.log('   • Vault deposits are NOT visible in Blue market balances\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
