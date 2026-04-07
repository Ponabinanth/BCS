import React, { useState, useEffect } from 'react';
import {
  useAccount,
  useEnsName,
  useBalance,
  useSignMessage,
} from 'wagmi';
import { formatEther } from 'viem';
import { Web3Button } from '@web3modal/wagmi/react';

// Function to truncate the wallet address
const truncateAddress = (address) =>
  `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

export default function ConnectorCard() {
  // Wagmi Hooks replace manual listeners and getters
  const { address, isConnected, chain } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { data: balanceData } = useBalance({ address });
  const { signMessage } = useSignMessage();

  const [status, setStatus] = useState('Status: Initializing Web3 connector...');
  const [isSigning, setIsSigning] = useState(false);

  // --- Utility for SIWE ---
  const signAuthenticationMessage = async () => {
    if (!address || !chain) return;

    setIsSigning(true);
    const siweMessage = `${window.location.host} wants you to sign in with your Ethereum account:
${address}

This signature proves ownership of your wallet for secure login.

URI: ${window.location.href}
Version: 1
Chain ID: ${chain.id}
Nonce: ${Math.random().toString(36).substring(2, 10)}
Issued At: ${new Date().toISOString()}`;

    try {
      // Wagmi signMessage action
      const signature = await signMessage({ message: siweMessage });

      setStatus(`✅ AUTHENTICATED! Signature: ${signature.substring(0, 30)}...`);
      console.log('SIWE Signature:', signature);
    } catch (error) {
      console.error('SIWE Signing Failed:', error);
      setStatus(`❌ AUTH FAILED. ${error instanceof Error ? error.message : 'Unknown Error'}`);
    } finally {
      setIsSigning(false);
    }
  };

  // --- Effect to manage the Status UI based on Wagmi state ---
  useEffect(() => {
    if (isConnected) {
      setStatus(`✅ **CONNECTED!** Session established on ${chain?.name}.`);
    } else {
      setStatus('Status: Disconnected. Ready to connect.');
    }
  }, [isConnected, chain]);

  return (
    <div className="connector-card">
      <h2>SecureChain Web3 Connector V3.0 (React/Wagmi)</h2>

      {/* WalletConnect Button component replaces your w3m-button tag */}
      <Web3Button icon="show" label="Connect Wallet" balance="show" />

      {/* New Feature: SIWE Button */}
      <button
        id="siweButton"
        onClick={signAuthenticationMessage}
        disabled={!isConnected || isSigning}
        style={{
          backgroundColor: isSigning ? '#9333ea' : '#6d28d9',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '6px',
          cursor: isConnected ? 'pointer' : 'not-allowed',
          fontSize: '0.95em',
          fontWeight: 700,
          width: '100%',
          marginTop: '10px',
          marginBottom: '10px',
        }}
      >
        {isSigning ? 'Signing Message...' : '🔐 Sign-In with Ethereum (SIWE)'}
      </button>

      <div
        id="statusElement"
        className={`status-box ${isConnected ? 'status-connected' : ''}`}
        // You would apply your original CSS classes here (status-box, status-connected, etc.)
      >
        {status}
      </div>

      {isConnected && address && (
        <div id="details-panel" style={{ display: 'block' }}>
          <p>
            <span>Wallet Provider:</span>{' '}
            {/* Wagmi's useAccount hook doesn't expose provider name easily, use a placeholder or check connector */}
            WalletConnect/Injected
          </p>
          <p>
            <span>Wallet Address:</span> {truncateAddress(address)}
          </p>
          {ensName && (
            <p>
              <span>ENS Name:</span> {ensName}
            </p>
          )}
          <p>
            <span>Primary Chain:</span> {chain?.name || 'Unknown'}
          </p>
          {balanceData && (
            <p>
              <span>Balance:</span> {formatEther(balanceData.value).substring(0, 6)}{' '}
              {balanceData.symbol}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
