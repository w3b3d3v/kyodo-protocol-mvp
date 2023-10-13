import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as dotenv from "dotenv";
import path from "path";
import fs from 'fs';
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { 
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development.local') });

const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
anchor.setProvider(provider);
const program = anchor.workspace.AgreementProgram;

function loadKeypairFromJSONFile(filePath: string): Keypair {
    // Carregue o conteúdo do arquivo.
    const rawdata = fs.readFileSync(filePath, 'utf8');
    
    // Parse o JSON.
    const keypairData = JSON.parse(rawdata);
  
    // Crie o Keypair.
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
    return keypair;
  }

const wallet = "/Users/brunobarros/.config/solana/id.json"

function updateConfig(
        associatedTokenAddressCompany, 
        associatedTokenAddressCommunity, 
        associatedTokenAddressTreasury,
        associatedTokenAddressVault,
        vaultAddress,
        feesAddress,
        acceptedPaymentTokensAddress
    ) {
    const envPath = path.join(__dirname, '../../../.env.development.local');
    let envData = fs.readFileSync(envPath, 'utf8');
    const lines = envData.split('\n');

    
    const keysToUpdate = {
        'NEXT_PUBLIC_SOL_ASSOCIATED_TOKEN_ADDRESS_COMPANY': associatedTokenAddressCompany,
        'NEXT_PUBLIC_SOL_ASSOCIATED_TOKEN_ADDRESS_COMMUNITY': associatedTokenAddressCommunity,
        'NEXT_PUBLIC_SOL_ASSOCIATED_TOKEN_ADDRESS_TREASURY': associatedTokenAddressTreasury,
        'NEXT_PUBLIC_SOL_ASSOCIATED_TOKEN_ADDRESS_VAULT': associatedTokenAddressVault,
        'NEXT_PUBLIC_SOL_ACCEPTED_PAYMENT_TOKENS_ADDRESS': acceptedPaymentTokensAddress,
        'NEXT_PUBLIC_SOL_VAULT_ADDRESS': vaultAddress,
        'NEXT_PUBLIC_SOL_PROFESSIONAL_ADDRESS': vaultAddress,
        'NEXT_PUBLIC_SOL_FEES_ADDRESS': feesAddress,
    };
  
    Object.keys(keysToUpdate).forEach(key => {
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${key}=`)) {
          lines[i] = `${key}=${keysToUpdate[key]}`;
          found = true;
          break;
        }
      }
      if (!found) {
        lines.push(`${key}=${keysToUpdate[key]}`);
      }
    });
  
    envData = lines.join('\n');
    fs.writeFileSync(envPath, envData);
    console.log(`Updated fakeStable for Solana addresses in ${envPath}`);
  }

async function addPaymentToken(tokenPubkey, acceptedPaymentPubkey, adminPubkey) {
    return await program.methods.addAcceptedPaymentToken(tokenPubkey)
    .accounts({
      acceptedPaymentTokens: acceptedPaymentPubkey,
      owner: adminPubkey,
    }).rpc();
};

async function initializePaymentInfrastructure(communityDaoKeypair, 
        kyodoTreasuryKeypair, 
        vaultKeypair,
        feesKeypair, 
        acceptedPaymentTokensKeypair, 
        professionalPubkey
    ) {
    const payer = (provider.wallet as NodeWallet).payer;
    const adminKeypair = loadKeypairFromJSONFile(wallet);
    const company = provider.wallet.publicKey;
    const fakeStablePubkey = new PublicKey(process.env.NEXT_PUBLIC_SOLANA_FAKE_STABLE_ADDRESS);
    const adminPubkey = new PublicKey(adminKeypair.publicKey);
    const acceptedPaymentTokensPubkey = new PublicKey(acceptedPaymentTokensKeypair.publicKey);
    const kyodoTreasuryPubkey = new PublicKey(kyodoTreasuryKeypair);
    const communityDaoPubkey = new PublicKey(communityDaoKeypair);
    const vaultPubkey = new PublicKey(vaultKeypair);
    professionalPubkey = new PublicKey(professionalPubkey); //TODO FIX: issue #106
    const feesPubkey = new PublicKey(feesKeypair.publicKey);


    // 1. Initialize Fees Account
    const fees = {
        feePercentage: new anchor.BN(20),
        treasuryFee: new anchor.BN(500),
        communityDaoFee: new anchor.BN(500),
    } as any;
  
    await program.methods
        .initializeFees(fees)
        .accounts({
            fees: feesPubkey,
            admin: adminPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([adminKeypair, feesKeypair])
        .rpc();
  
    console.log("Fees Account Initialized")
  
    // 2. Initialize Accepted Tokens Account
    await program.methods
        .initializeAcceptedPaymentTokens()
        .accounts({
            acceptedPaymentToken: acceptedPaymentTokensPubkey,
            admin: adminPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([adminKeypair, acceptedPaymentTokensKeypair])
        .rpc();
  
    console.log("Accepted Tokens Account Initialized")
  
    // Add fake stable token as accepted payment token
    await addPaymentToken(fakeStablePubkey, acceptedPaymentTokensPubkey, adminPubkey);
    
    console.log("Fake Stable Added to Accepted Tokens Account")

    const associatedTokenAddressCompany = await getOrCreateNeededAssociatedTokenAccount(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        company,                    // Owner of the associated token account.
    );
  
    console.log("associatedTokenAddressCompany Account Initialized")
  
    const associatedTokenAddressCommunity = await getOrCreateNeededAssociatedTokenAccount(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        communityDaoPubkey,         // Owner of the associated token account.
    );
  
    console.log("associatedTokenAddressCommunity Account Initialized")
  
    const associatedTokenAddressTreasury = await getOrCreateNeededAssociatedTokenAccount(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        kyodoTreasuryPubkey,        // Owner of the associated token account.
    );
  
    console.log("associatedTokenAddressTreasury Account Initialized")

    const associatedTokenAddressProfessional = await getOrCreateNeededAssociatedTokenAccount(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        professionalPubkey,         // Owner of the associated token account.
    );

    console.log("associatedTokenAddressProfessional Account Initialized", associatedTokenAddressProfessional)


    const associatedTokenAddressVault = await getOrCreateNeededAssociatedTokenAccount(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        vaultPubkey,         // Owner of the associated token account.
    );

    console.log("associatedTokenAddressVault Account Initialized", associatedTokenAddressVault)

    updateConfig(
        associatedTokenAddressCompany.address, 
        associatedTokenAddressCommunity.address, 
        associatedTokenAddressTreasury.address,
        associatedTokenAddressVault.address,
        vaultPubkey,
        feesPubkey,
        acceptedPaymentTokensPubkey
    )

    return {
        associatedTokenAddressCompany,
        associatedTokenAddressCommunity,
        associatedTokenAddressTreasury,
        associatedTokenAddressVault,
        feesPubkey,
        acceptedPaymentTokensPubkey
    };
  }

async function main() {
    try {
        if (!process.env.NEXT_SOL_COMMUNITY_TREASURY_ADDRESS || 
            !process.env.NEXT_SOL_KYODO_TREASURY_ADDRESS || 
            !process.env.NEXT_SOL_PROFESSIONAL_ADDRESS || 
            !process.env.NEXT_SOL_VAULT_ADDRESS) {
            throw new Error("Missing required environment variables.");
        }
    
        const communityDaoPublickey = process.env.SOL_COMMUNITY_TREASURY_ADDRESS;
        const kyodoTreasuryPublickey = process.env.SOL_KYODO_TREASURY_ADDRESS;
        const professionalPubkey = process.env.SOL_PROFESSIONAL_ADDRESS;

        const vaultKeypair = anchor.web3.Keypair.generate();
        const feesKeypair = anchor.web3.Keypair.generate();
        const acceptedPaymentTokensKeypair = anchor.web3.Keypair.generate();
        
        await initializePaymentInfrastructure(
            communityDaoPublickey,
            kyodoTreasuryPublickey,
            vaultKeypair,
            feesKeypair,
            acceptedPaymentTokensKeypair,
            professionalPubkey
        );
    
        console.log("Payment Infrastructure Initialized");
    
    } catch (error) {
        console.error("Error initializing payment infrastructure:", error.message);
    }    
}

async function getOrCreateNeededAssociatedTokenAccount(payer, tokenAddress, owner) {
    return await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        tokenAddress,
        owner,
        false,
        null, null,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
};

main();