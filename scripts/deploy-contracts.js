const { StacksTestnet, StacksMainnet } = require('@stacks/network');
const { makeContractDeploy, broadcastTransaction } = require('@stacks/transactions');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const NETWORK = process.env.STACKS_NETWORK || 'testnet';
const CONTRACT_NAME = 'land-registry';

// Select network
const network = NETWORK === 'mainnet' 
  ? new StacksMainnet() 
  : new StacksTestnet();

async function deployContract() {
  try {
    // Read contract source
    const contractPath = path.join(__dirname, '../contracts/land-registry.clar');
    const contractSource = fs.readFileSync(contractPath).toString();
    
    // Create deployment transaction
    const txOptions = {
      contractName: CONTRACT_NAME,
      codeBody: contractSource,
      senderKey: PRIVATE_KEY,
      network,
    };
    
    const transaction = await makeContractDeploy(txOptions);
    
    // Broadcast transaction
    const result = await broadcastTransaction(transaction, network);
    
    if (result.error) {
      console.error('Error deploying contract:', result.error);
      return;
    }
    
    console.log('Contract deployment initiated!');
    console.log('Transaction ID:', result.txid);
    console.log('Contract address:', `${result.address}.${CONTRACT_NAME}`);
    
    // Save deployment info to file
    const deploymentInfo = {
      txid: result.txid,
      address: result.address,
      contractName: CONTRACT_NAME,
      network: NETWORK,
      timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

deployContract();