# USTC Preregistration Frontend

Frontend application for the USTC preregistration swap app, built with React, TypeScript, and Vite.

## Features

- **BSC Integration**: Deposit and withdraw USTC-cb tokens on Binance Smart Chain
- **Terra Classic Integration**: (Coming soon) Native USTC deposits on Terra Classic
- **CL8Y-inspired Dark Theme**: Beautiful dark theme with gold accents
- **Wallet Integration**: MetaMask support for BSC
- **Real-time Updates**: Contract statistics and balances update automatically

## Tech Stack

- **React 18+** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Ethers.js v6** - Ethereum/BSC interactions
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management (if needed)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension (for BSC)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_CONTRACT_ADDRESS=<your_deployed_contract_address>
VITE_TERRA_RPC_URL=https://terra-classic-lcd.publicnode.com
VITE_TERRA_CONTRACT_ADDRESS=<your_terra_contract_address>
VITE_USTC_TOKEN_ADDRESS=0xA4224f910102490Dc02AAbcBc6cb3c59Ff390055
VITE_BSC_CHAIN_ID=56
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Project Structure

```
frontend-dapp/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   ├── bsc/             # BSC-specific components
│   │   └── terraclassic/   # Terra Classic components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── services/            # Service layer (API, contracts)
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   ├── assets/
│   │   └── styles/         # Global styles
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
└── package.json
```

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Environment Variables

- `VITE_BSC_RPC_URL` - BSC RPC endpoint
- `VITE_BSC_CONTRACT_ADDRESS` - Deployed BSC contract address
- `VITE_TERRA_RPC_URL` - Terra Classic LCD endpoint
- `VITE_TERRA_CONTRACT_ADDRESS` - Terra Classic contract address
- `VITE_USTC_TOKEN_ADDRESS` - USTC token address on BSC
- `VITE_BSC_CHAIN_ID` - BSC chain ID (56 for mainnet, 97 for testnet)

## Usage

1. Navigate to the home page
2. Select either BSC or Terra Classic
3. Connect your wallet (MetaMask for BSC)
4. Deposit or withdraw USTC tokens

## Development

The app uses:
- **Path aliases**: `@/` maps to `src/`
- **React Query**: For data fetching with automatic caching
- **Ethers.js**: For blockchain interactions

## Styling

The app uses CSS variables for theming. See `src/assets/styles/global.css` for the theme configuration.

## License

AGPL-3.0
