import React, { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { 
  callReadOnlyFunction, 
  cvToValue, 
  standardPrincipalCV, 
  stringAsciiCV,
  listCV,
  uintCV
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { API_URL, CONTRACT_ADDRESS, CONTRACT_NAME } from '../config';

interface MultiSigTransferFormProps {
  propertyId: string;
  currentOwner: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MultiSigTransferForm: React.FC<MultiSigTransferFormProps> = ({ 
  propertyId, 
  currentOwner,
  onSuccess, 
  onCancel 
}) => {
  const { doContractCall } = useConnect();
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [signers, setSigners] = useState<string[]>([currentOwner]);
  const [newSigner, setNewSigner] = useState('');
  const [expirationDays, setExpirationDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Network configuration
  const network = process.env.REACT_APP_NETWORK === 'mainnet' 
    ? new StacksMainnet() 
    : new StacksTestnet();

  const handleAddSigner = () => {
    if (!newSigner) return;
    
    // Validate Stacks address format
    if (!newSigner.startsWith('ST') || newSigner.length !== 41) {
      setError('Invalid Stacks address format');
      return;
    }
    
    // Check for duplicates
    if (signers.includes(newSigner)) {
      setError('This signer is already added');
      return;
    }
    
    setSigners([...signers, newSigner]);
    setNewSigner('');
    setError('');
  };
  
  const handleRemoveSigner = (index: number) => {
    // Don't allow removing the current owner
    if (signers[index] === currentOwner) {
      setError('Cannot remove the current owner from signers');
      return;
    }
    
    const updatedSigners = [...signers];
    updatedSigners.splice(index, 1);
    setSigners(updatedSigners);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Validate inputs
      if (!newOwnerAddress) {
        throw new Error('New owner address is required');
      }
      
      if (signers.length < 2) {
        throw new Error('At least two signers are required for multi-signature transfer');
      }
      
      // Calculate expiration in blocks (approximately 144 blocks per day)
      const expirationBlocks = expirationDays * 144;
      
      // Call the smart contract
      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'initiate-multi-sig-transfer',
        functionArgs: [
          stringAsciiCV(propertyId),
          standardPrincipalCV(newOwnerAddress),
          listCV(signers.map(signer => standardPrincipalCV(signer))),
          uintCV(expirationBlocks)
        ],
        network,
        onFinish: (data) => {
          // Also update the backend
          fetch(`${API_URL}/properties/multi-sig/initiate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              propertyId,
              newOwnerAddress,
              requiredSigners: signers,
              expirationBlocks
            })
          })
          .then(response => {
            if (!response.ok) throw new Error('Failed to update backend');
            return response.json();
          })
          .then(() => {
            setIsLoading(false);
            onSuccess();
          })
          .catch(err => {
            console.error('Backend update error:', err);
            setError('Transaction was sent to blockchain but failed to update backend');
            setIsLoading(false);
          });
        },
        onCancel: () => {
          setIsLoading(false);
          setError('Transaction was cancelled');
        }
      });
    } catch (err) {
      console.error('Error initiating multi-sig transfer:', err);
      setError(err.message || 'Failed to initiate transfer');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="multi-sig-transfer-form">
      <h2>Initiate Multi-Signature Transfer</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="newOwnerAddress">New Owner Address</label>
          <input
            type="text"
            id="newOwnerAddress"
            value={newOwnerAddress}
            onChange={(e) => setNewOwnerAddress(e.target.value)}
            placeholder="ST..."
            required
          />
        </div>
        
        <div className="form-group">
          <label>Required Signers</label>
          <ul className="signers-list">
            {signers.map((signer, index) => (
              <li key={index}>
                {signer} 
                {signer !== currentOwner && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSigner(index)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
                {signer === currentOwner && <span className="owner-badge">Owner</span>}
              </li>
            ))}
          </ul>
          
          <div className="add-signer">
            <input
              type="text"
              value={newSigner}
              onChange={(e) => setNewSigner(e.target.value)}
              placeholder="Add signer (ST...)"
            />
            <button 
              type="button" 
              onClick={handleAddSigner}
              className="add-button"
            >
              Add
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="expirationDays">Expiration (days)</label>
          <input
            type="number"
            id="expirationDays"
            value={expirationDays}
            onChange={(e) => setExpirationDays(parseInt(e.target.value))}
            min="1"
            max="30"
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Initiating...' : 'Initiate Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MultiSigTransferForm;