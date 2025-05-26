import axios from 'axios';

export class StacksApiClient {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co';
  }

  async getTransaction(txId: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/extended/v1/tx/${txId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  async getAccountInfo(address: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/accounts/${address}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  async getContractInfo(contractAddress: string, contractName: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v2/contracts/interface/${contractAddress}/${contractName}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching contract info:', error);
      throw error;
    }
  }

  async waitForTransaction(txId: string, maxAttempts = 60) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const tx = await this.getTransaction(txId);
        
        if (tx.tx_status === 'success') {
          return tx;
        } else if (tx.tx_status === 'failed') {
          throw new Error(`Transaction failed: ${tx.tx_result}`);
        }
        
        // Wait 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      } catch (error) {
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }
    
    throw new Error('Transaction confirmation timeout');
  }
}