import React, { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { 
  callReadOnlyFunction, 
  cvToValue, 
  stringAsciiCV 
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { API_URL, CONTRACT_ADDRESS, CONTRACT_NAME } from '../config';

interface PendingTransferDetailsProps {
  propertyId: string;
  userAddress: string;
  onSuccess: () => void;
}

interface PendingTransfer {
  newOwner: string;
  requiredSignatures: string[];
  providedSignatures: string[];
  expirationHeight: number;
  initiatedBy: string;
}

const PendingTransferDetails: React.FC<PendingTransferDetailsProps> = ({ 
  propertyId, 
  userAddress,
  onSuccess 
}) => {
  const { doContractCall } = useConnect();
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingInProgress, setSigningInProgress] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  
  // Network configuration
  const network = process.env.REACT_APP_NETWORK === 'mainnet' 
    ? new StacksMainnet() 
    : new StacksTestnet();

  useEffect(() => {
    const fetchPendingTransfer = async () => {
      try {
        // Get current block height
        const infoResponse = await fetch(`${network.coreApiUrl}/v2/info`);
        const infoData = await infoResponse.json();
        setCurrentBlockHeight(infoData.stacks_tip_height);
        
        // Get pending transfer from blockchain
        const result = await callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-pending-transfer',
          functionArgs: [stringAsciiCV(propertyId)],
          network,
          senderAddress: userAddress,
        });
        
        const transferData = cvToValue(result);
        if (transferData) {
          setPendingTransfer(transferData);
        }
      } catch (err) {
        console.error('Error fetching pending transfer:', err);
        setError('Failed to load pending transfer details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPendingTransfer();
  }, [propertyId, userAddress, network]);
  
  const handleSign = async () => {
    setSigningInProgress(true);
    setError('');
    
    try {
      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'sign-transfer',
        functionArgs: [stringAsciiCV(propertyId)],
        network,
        onFinish: (data) => {
          // Also update the backend
          fetch(`${API_URL}/properties/multi-sig/${propertyId}/sign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          .then(response => {
            if (!response.ok) throw new Error('Failed to update backend');
            return response.json();
          })
          .then(() => {
            setSigningInProgress(false);
            onSuccess();
          })
          .catch(err => {
            console.error('Backend update error:', err);
            setError('Transaction was sent to blockchain but failed to update backend');
            setSigningInProgress(false);
          });
        },
        onCancel: () => {
          setSigningInProgress(false);
          setError('Transaction was cancelled');
        }
      });
    } catch (err) {
      console.error('Error signing transfer:', err);
      setError(err.message || 'Failed to sign transfer');
      setSigningInProgress(false);
    }
  };
  
  const handleCancel = async () => {
    setCancelInProgress(true);
    setError('');
    
    try {
      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'cancel-transfer',
        functionArgs: [stringAsciiCV(propertyId)],
        network,
        onFinish: (data) => {
          // Also update the backend
          fetch(`${API_URL}/properties/multi-sig/${propertyId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          .then(response => {
            if (!response.ok) throw new Error('Failed to update backend');
            return response.json();
          })
          .then(() => {
            setCancelInProgress(false);
            onSuccess();
          })
          .catch(err => {
            console.error('Backend update error:', err);
            setError('Transaction was sent to blockchain but failed to update backend');
            setCancelInProgress(false);
          });
        },
        onCancel: () => {
          setCancelInProgress(false);
          setError('Transaction was cancelled');
        }
      });
    } catch (err) {
      console.error('Error canceling transfer:', err);
      setError(err.message || 'Failed to cancel transfer');
      setCancelInProgress(false);
    }
  };
  
  if (isLoading) {
    return <div className="loading">Loading pending transfer details...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!pendingTransfer) {
    return <div className="no-transfer">No pending transfer found for this property.</div>;
  }
  
  const isExpired = currentBlockHeight > pendingTransfer.expirationHeight;
  const hasUserSigned = pendingTransfer.providedSignatures.includes(userAddress);
  const canUserSign = pendingTransfer.requiredSignatures.includes(userAddress) && !hasUserSigned;
  const isInitiator = pendingTransfer.initiatedBy === userAddress;
  const remainingSignatures = pendingTransfer.requiredSignatures.length - pendingTransfer.providedSignatures.length;
  const blocksRemaining = pendingTransfer.expirationHeight - currentBlockHeight;
  const daysRemaining = Math.floor(blocksRemaining / 144); // ~144 blocks per day
  
  return (
    <div className="pending-transfer-details">
      <h2>Pending Multi-Signature Transfer</h2>
      
      {isExpired && (
        <div className="expired-notice">
          This transfer request has expired and can no longer be signed.
        </div>
      )}
      
      <div className="transfer-info">
        <p><strong>New Owner:</strong> {pendingTransfer.newOwner}</p>
        <p><strong>Initiated By:</strong> {pendingTransfer.initiatedBy}</p>
        <p>
          <strong>Expiration