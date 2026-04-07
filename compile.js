import fs from 'fs';
// @ts-ignore
import solc from 'solc';

const contractPath = 'contracts/SecureChainNFT.sol';
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'SecureChainNFT.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

console.log('Compiling contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    // @ts-ignore
    output.errors.forEach((err) => {
        console.error(err.formattedMessage);
    });
    // Filter out warnings
    // @ts-ignore
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) process.exit(1);
}

const contract = output.contracts['SecureChainNFT.sol']['SecureChainNFT'];

const artifact = {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
};

fs.writeFileSync('contracts/SecureChainNFT.json', JSON.stringify(artifact, null, 2));
console.log('Contract compiled successfully to contracts/SecureChainNFT.json');
