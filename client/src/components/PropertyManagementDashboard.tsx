import React, { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { 
  callReadOnlyFunction, 
  cvToValue, 
  standardPrincipalCV, 
  stringAsciiCV,
  uintCV
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { API_URL, CONTRACT_ADDRESS, CONTRACT_NAME } from '../config';
import MultiSigTransferForm from './MultiSigTransferForm';
import PendingTransferDetails from './PendingTransferDetails';
import PropertyDetails from './PropertyDetails';

interface Property {
  propertyId: string;
  owner: string;
  location: string;
  area: number;
  status: string;
  registrationDate: number;
  lastTransferDate: number;
}

interface PropertyValuation {
  appraisedValue: number;
  appraiser: string;
  valuationType: string;
  currency: string;
  valuationDate: number;
}

interface PropertyLien {
  lienId: string;
  lienHolder: string;
  amount: number;
  lienType: string;
  status: string;
  createdAt: number;
}

const PropertyManagementDashboard: React.FC = () => {
  const { doContractCall } = useConnect();
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [property, setProperty] = useState<Property | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<any>(null);
  const [valuations, setValuations] = useState<PropertyValuation[]>([]);
  const [liens, setLiens] = useState<PropertyLien[]>([]);
  const [showMultiSigForm, setShowMultiSigForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Network configuration
  const network = process.env.REACT_APP_NETWORK === 'mainnet' 
    ? new StacksMainnet() 
    : new StacksTestnet();

  const loadPropertyData = async (propertyId: string) => {
    if (!propertyId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Load property details from blockchain
      const propertyResult = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-property',
        functionArgs: [stringAsciiCV(propertyId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });
      
      const propertyData = cvToValue(propertyResult);
      if (propertyData) {
        setProperty({
          propertyId,
          owner: propertyData.owner,
          location: propertyData.location,
          area: propertyData.area,
          status: propertyData.status,
          registrationDate: propertyData['registration-date'],
          lastTransferDate: propertyData['last-transfer-date']
        });
      }
      
      // Load pending transfer
      const pendingResult = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-pending-transfer',
        functionArgs: [stringAsciiCV(propertyId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });
      
      const pendingData = cvToValue(pendingResult);
      setPendingTransfer(pendingData);
      
      // Load latest valuation
      const valuationResult = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-latest-valuation',
        functionArgs: [stringAsciiCV(propertyId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });
      
      const valuationData = cvToValue(valuationResult);
      if (valuationData) {
        setValuations([{
          appraisedValue: valuationData['appraised-value'],
          appraiser: valuationData.appraiser,
          valuationType: valuationData['valuation-type'],
          currency: valuationData.currency,
          valuationDate: valuationData['valuation-date'] || Date.now()
        }]);
      }
      
    } catch (err) {
      console.error('Error loading property data:', err);
      setError('Failed to load property data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddValuation = async (appraisedValue: number, appraiser: string, valuationType: string) => {
    try {
      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'add-property-valuation',
        functionArgs: [
          stringAsciiCV(selectedProperty),
          uintCV(appraisedValue),
          standardPrincipalCV(appraiser),
          stringAsciiCV(valuationType),
          stringAsciiCV('USD')
        ],
        network,
        onFinish: () => {
          loadPropertyData(selectedProperty);
        }
      });
    } catch (err) {
      console.error('Error adding valuation:', err);
      setError('Failed to add valuation');
    }
  };

  const handleAddLien = async (lienId: string, lienHolder: string, amount: number, lienType: string) => {
    try {
      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'add-property-lien',
        functionArgs: [
          stringAsciiCV(selectedProperty),
          stringAsciiCV(lienId),
          standardPrincipalCV(lienHolder),
          uintCV(amount),
          stringAsciiCV(lienType)
        ],
        network,
        onFinish: () => {
          loadPropertyData(selectedProperty);
        }
      });
    } catch (err) {
      console.error('Error adding lien:', err);
      setError('Failed to add lien');
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      loadPropertyData(selectedProperty);
    }
  }, [selectedProperty]);

  return (
    <div className="property-management-dashboard">
      <h1>Property Management Dashboard</h1>
      
      <div className="property-selector">
        <label htmlFor="propertySelect">Select Property:</label>
        <input
          type="text"
          id="propertySelect"
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          placeholder="Enter Property ID (e.g., PROP001)"
        />
        <button onClick={() => loadPropertyData(selectedProperty)}>
          Load Property
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="loading">Loading property data...</div>}

      {property && (
        <div className="property-overview">
          <h2>Property Overview</h2>
          <PropertyDetails property={property} />
          
          <div className="property-actions">
            <button 
              onClick={() => setShowMultiSigForm(true)}
              className="primary-button"
            >
              Initiate Multi-Sig Transfer
            </button>
            
            <button 
              onClick={() => loadPropertyData(selectedProperty)}
              className="secondary-button"
            >
              Refresh Data
            </button>
          </div>
        </div>
      )}

      {pendingTransfer && (
        <div className="pending-transfer-section">
          <h2>Pending Transfer</h2>
          <PendingTransferDetails 
            propertyId={selectedProperty}
            userAddress={property?.owner || ''}
            onSuccess={() => loadPropertyData(selectedProperty)}
          />
        </div>
      )}

      {valuations.length > 0 && (
        <div className="valuations-section">
          <h2>Property Valuations</h2>
          {valuations.map((valuation, index) => (
            <div key={index} className="valuation-item">
              <p><strong>Value:</strong> {valuation.appraisedValue} {valuation.currency}</p>
              <p><strong>Type:</strong> {valuation.valuationType}</p>
              <p><strong>Appraiser:</strong> {valuation.appraiser}</p>
            </div>
          ))}
        </div>
      )}

      {liens.length > 0 && (
        <div className="liens-section">
          <h2>Property Liens</h2>
          {liens.map((lien, index) => (
            <div key={index} className="lien-item">
              <p><strong>Lien ID:</strong> {lien.lienId}</p>
              <p><strong>Holder:</strong> {lien.lienHolder}</p>
              <p><strong>Amount:</strong> {lien.amount}</p>
              <p><strong>Type:</strong> {lien.lienType}</p>
              <p><strong>Status:</strong> {lien.status}</p>
            </div>
          ))}
        </div>
      )}

      {showMultiSigForm && property && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MultiSigTransferForm
              propertyId={selectedProperty}
              currentOwner={property.owner}
              onSuccess={() => {
                setShowMultiSigForm(false);
                loadPropertyData(selectedProperty);
              }}
              onCancel={() => setShowMultiSigForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyManagementDashboard;
