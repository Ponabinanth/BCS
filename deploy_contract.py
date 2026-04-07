import json
import os
from web3 import Web3
from solcx import compile_standard, install_solc
from dotenv import load_dotenv

load_dotenv()

def deploy():
    # 1. Configuration
    # For local development (e.g., Ganache or Hardhat node)
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    private_key = os.getenv("PRIVATE_KEY") 
    # If no private key in env, use a dummy one (ONLY FOR LOCAL TESTNETS)
    if not private_key:
        print("WARNING: No PRIVATE_KEY found in simple deployment. Using a hardcoded test key (unsafe for prod).")
        # Common Hardhat/Ganache test key 0
        private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" 

    # 2. Compile Solidity
    print("Installing/Checking solc...")
    install_solc("0.8.0")
    
    with open("./contracts/SecureChainNFT.sol", "r") as file:
        simple_storage_file = file.read()

    print("Compiling contract...")
    compiled_sol = compile_standard(
        {
            "language": "Solidity",
            "sources": {"SecureChainNFT.sol": {"content": simple_storage_file}},
            "settings": {
                "outputSelection": {
                    "*": {"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]}
                }
            },
        },
        solc_version="0.8.0",
    )

    bytecode = compiled_sol["contracts"]["SecureChainNFT.sol"]["SecureChainNFT"]["evm"]["bytecode"]["object"]
    abi = json.loads(compiled_sol["contracts"]["SecureChainNFT.sol"]["SecureChainNFT"]["metadata"])["output"]["abi"]

    # Save ABI to JSON for frontend usage
    with open("./contracts/SecureChainNFT.json", "w") as outfile:
        json.dump({"abi": abi, "bytecode": bytecode}, outfile)
    print("ABI saved to ./contracts/SecureChainNFT.json")

    # 3. Deploy
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        print(f"Connection to {rpc_url} failed. Make sure your local blockchain node is running.")
        return

    chain_id = w3.eth.chain_id
    my_address = w3.eth.account.from_key(private_key).address
    print(f"Deploying from {my_address} on chain {chain_id}")

    SecureChainNFT = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    # Build transaction
    nonce = w3.eth.get_transaction_count(my_address)
    transaction = SecureChainNFT.constructor().build_transaction({
        "chainId": chain_id,
        "from": my_address,
        "nonce": nonce,
        "gasPrice": w3.eth.gas_price
    })

    # Sign and Send
    signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    print(f"Deploying... Tx Hash: {tx_hash.hex()}")
    
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Deployed! Contract Address: {tx_receipt.contractAddress}")

    # Save address
    with open("./contracts/contract_address.txt", "w") as f:
        f.write(tx_receipt.contractAddress)

if __name__ == "__main__":
    deploy()
