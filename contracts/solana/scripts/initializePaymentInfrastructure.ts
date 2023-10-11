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

const wallet = "/Users/nomadbitcoin/.config/solana/id.json"

function updateConfig(
        associatedTokenAddressCompany, 
        associatedTokenAddressCommunity, 
        associatedTokenAddressTreasury,
        feesAddress,
        acceptedPaymentTokensAddress
    ) {
    const envPath = path.join(__dirname, '../../../.env.development.local');
    let envData = fs.readFileSync(envPath, 'utf8');
    const lines = envData.split('\n');

    
    const keysToUpdate = {
        'SOL_ASSOCIATED_TOKEN_ADDRESS_COMPANY': associatedTokenAddressCompany,
        'SOL_ASSOCIATED_TOKEN_ADDRESS_COMMUNITY': associatedTokenAddressCommunity,
        'SOL_ASSOCIATED_TOKEN_ADDRESS_TREASURY': associatedTokenAddressTreasury,
        'SOL_FEES_ADDRESS': feesAddress,
        'SOL_ACCEPTED_TOKENS_ADDRESS': acceptedPaymentTokensAddress,
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

async function initializePaymentInfrastructure(communityDaoKeypair, kyodoTreasuryKeypair, feesKeypair, acceptedPaymentTokensKeypair) {
    const payer = (provider.wallet as NodeWallet).payer;
    const adminKeypair = loadKeypairFromJSONFile(wallet);
    const company = provider.wallet.publicKey;
    const fakeStablePubkey = new PublicKey(process.env.NEXT_PUBLIC_SOLANA_FAKE_STABLE_ADDRESS);
    const adminPubkey = new PublicKey(adminKeypair.publicKey);
    const acceptedPaymentTokensPubkey = new PublicKey(acceptedPaymentTokensKeypair.publicKey);
    const kyodoTreasuryPubkey = new PublicKey(kyodoTreasuryKeypair.publicKey);
    const communityDaoPubkey = new PublicKey(communityDaoKeypair.publicKey);
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

    const associatedTokenAddressCompany = await getOrCreateAssociatedTokenAccountKyodo(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        company,                    // Owner of the associated token account.
    );
  
    console.log("associatedTokenAddressCompany Account Initialized")
  
    const associatedTokenAddressCommunity = await getOrCreateAssociatedTokenAccountKyodo(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        communityDaoPubkey,         // Owner of the associated token account.
    );
  
    console.log("associatedTokenAddressCommunity Account Initialized")
  
    const associatedTokenAddressTreasury = await getOrCreateAssociatedTokenAccountKyodo(
        payer,                      // Entity funding the transaction.
        fakeStablePubkey,           // Mint's public key.
        kyodoTreasuryPubkey,        // Owner of the associated token account.
    );
  
    console.log("associatedTokenAddressTreasury Account Initialized")

    updateConfig(
        associatedTokenAddressCompany.address, 
        associatedTokenAddressCommunity.address, 
        associatedTokenAddressTreasury.address,
        feesPubkey,
        acceptedPaymentTokensPubkey
    )

    return {
        associatedTokenAddressCompany,
        associatedTokenAddressCommunity,
        associatedTokenAddressTreasury,
        feesPubkey,
        acceptedPaymentTokensPubkey
    };
  }

async function main() {
    try {
        // This need to be created only once for production, and saved in a safe place.
        // both public key and secret key.
        const communityDaoKeypair = anchor.web3.Keypair.generate();
        const kyodoTreasuryKeypair = anchor.web3.Keypair.generate();
        const feesKeypair = anchor.web3.Keypair.generate();
        const acceptedPaymentTokensKeypair = anchor.web3.Keypair.generate();

        await initializePaymentInfrastructure(
            communityDaoKeypair,
            kyodoTreasuryKeypair,
            feesKeypair,
            acceptedPaymentTokensKeypair
        )

        console.log("Payment Infrastructure Initialized")

    } catch (error) {
        console.error("error initializing payment infrastructure:", error);
    }
}

export async function getOrCreateAssociatedTokenAccountKyodo(payer, tokenAddress, owner) {
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