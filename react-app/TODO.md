# TODO: Migrate Web3 Connector to React with Wagmi

## Steps to Complete

- [x] Step 1: Update `react-app/package.json` to add Wagmi v2, Web3Modal v4, and related dependencies (viem, @tanstack/react-query).
- [x] Step 2: Create `react-app/src/Web3Provider.js` to set up Wagmi config and Web3Modal (adapted from Next.js layout.tsx).
- [x] Step 3: Create `react-app/src/ConnectorCard.js` to migrate UI and logic from HTML to React hooks (useAccount, useBalance, useSignMessage, etc.).
- [x] Step 4: Update `react-app/src/App.js` to wrap the app with Web3Provider and add a /connect route for the ConnectorCard component.
- [x] Step 5: Run `npm install` in react-app directory to install new dependencies.
- [ ] Step 6: Replace 'YOUR_WALLETCONNECT_PROJECT_ID' placeholder with actual ID in Web3Provider.js.
- [x] Step 7: Test the app locally to ensure migration works.
- [ ] Step 8: Prepare foundation for Account Abstraction (ERC-4337) and NFT Gating features.
