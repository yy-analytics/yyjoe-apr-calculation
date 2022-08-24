export const ANKR_RPC_URL = 'https://rpc.ankr.com/avalanche';

export const YYJOE_ADDRESS = "0xe7462905b79370389e8180e300f58f63d35b725f";
export const YYJOE_STAKING_ADDRESS = "0x2d53bdf5507e9ae283c114a8404b460c05f700cb";

export const JOE_YYJOE_PAIR_ADDRESS = "0xe61dc1c6bb54262a7a24bd506cd50e8986af66c6";

export const BOOSTED_MASTERCHEF_ADDRESS = "0x4483f0b6e2f5486d06958c20f8c39a7abe87bf8f";

export const PERCENTAGE_REWARDS_TO_YYJOE = 0.15;

export const LP_TOKEN_ABI = [
    { "inputs": [], "name": "getReserves", "outputs": [{ "internalType": "uint112", "name": "_reserve0", "type": "uint112" }, { "internalType": "uint112", "name": "_reserve1", "type": "uint112" }, { "internalType": "uint32", "name": "_blockTimestampLast", "type": "uint32" }], "stateMutability": "view", "type": "function" }
];

export const YYJOE_STAKING_ABI = [
    { "inputs": [], "name": "internalBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

export const BOOSTED_MASTERCHEF_ABI = [
    { "inputs": [], "name": "joePerSec", "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "totalAllocPoint", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "poolLength", "outputs": [{ "internalType": "uint256", "name": "pools", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "poolInfo", "outputs": [{ "internalType": "contract IERC20", "name": "lpToken", "type": "address" }, { "internalType": "uint96", "name": "allocPoint", "type": "uint96" }, { "internalType": "uint256", "name": "accJoePerShare", "type": "uint256" }, { "internalType": "uint256", "name": "accJoePerFactorPerShare", "type": "uint256" }, { "internalType": "uint64", "name": "lastRewardTimestamp", "type": "uint64" }, { "internalType": "contract IRewarder", "name": "rewarder", "type": "address" }, { "internalType": "uint32", "name": "veJoeShareBp", "type": "uint32" }, { "internalType": "uint256", "name": "totalFactor", "type": "uint256" }, { "internalType": "uint256", "name": "totalLpSupply", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "address", "name": "", "type": "address" }], "name": "userInfo", "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "rewardDebt", "type": "uint256" }, { "internalType": "uint256", "name": "factor", "type": "uint256" }], "stateMutability": "view", "type": "function" },
];