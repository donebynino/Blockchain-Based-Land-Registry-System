import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnect } from '@stacks/connect-react';
import { callReadOnlyFunction, cvToValue } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';
import { userSession } from '../auth';
import { API_URL, CONTRACT_ADDRESS, CONTRACT_NAME } from '../config';
import { Property, Document } from '../types';

const PropertyDetails: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { doContractCall } = useConnect();
  
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        // Fetch from backend
        const response = await fetch(`${API_URL}/properties/${propertyId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch property details');
        }
        const data = await response.json();
        
        // Verify with blockchain data
        const blockchainData = await callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-property',
          functionArgs: [propertyId],
          network: new StacksMainnet(),
        });
        
        const blockchainProperty = cvToValue(blockchainData);
        
        // Combine data
        setProperty({
          ...data,
          blockchainOwner: blockchainProperty.owner,
          verified: data.owner.stacksAddress === blockchainProperty.owner
        });
      } catch (err) {
        setError('Error loading property details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperty();
  }, [propertyId]);
  
  const handleTransfer = async () => {
    const newOwner = prompt('Enter the Stacks address of the new owner:');
    if (!newOwner) return;
    
    try {
      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'transfer-property',
        functionArgs: [propertyId, newOwner],
        onFinish: (data) => {
          alert(`Transfer initiated! Transaction ID: ${data.txId}`);
          // Update UI or redirect
        },
        onCancel: () => {
          alert('Transaction cancelled');
        }
      });
    } catch (err) {
      console.error('Transfer error:', err);
      alert('Failed to transfer property');
    }
  };
  
  if (loading) return <div>Loading property details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!property) return <div>Property not found</div>;
  
  const isOwner = userSession.isUserSignedIn() && 
    userSession.loadUserData().profile.stxAddress.mainnet === property.owner.stacksAddress;
  
  return (
    <div className="property-details">
      <h1>Property: {property.propertyId}</h1>
      
      <div className="verification-badge">
        {property.verified ? 
          <span className="verified">✓ Blockchain Verified</span> : 
          <span className="unverified">⚠ Verification Failed</span>
        }
      </div>
      
      <div className="property-info">
        <h2>Details</h2>
        <p><strong>Address:</strong> {property.location.address}</p>
        <p><strong>Area:</strong> {property.area} sq. meters</p>
        <p><strong>Status:</strong> {property.status}</p>
        <p><strong>Owner:</strong> {property.owner.stacksAddress}</p>
        <p><strong>Registration Date:</strong> {new Date(property.registrationDate).toLocaleDateString()}</p>
        <p><strong>Last Transfer:</strong> {new Date(property.lastTransferDate).toLocaleDateString()}</p>
      </div>
      
      <div className="property-documents">
        <h2>Documents</h2>
        {property.documents.length === 0 ? (
          <p>No documents available</p>
        ) : (
          <ul>
            {property.documents.map((doc: Document, index: number) => (
              <li key={index}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  {doc.name}
                </a>
                <span className="document-date">
                  {new Date(doc.uploadDate).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {isOwner && (
        <div className="owner-actions">
          <button onClick={handleTransfer}>Transfer Ownership</button>
          <button onClick={() => navigate(`/properties/${propertyId}/upload-document`)}>
            Upload Document
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;