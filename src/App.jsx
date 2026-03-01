import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Home, Building, Hammer, Scale, RefreshCw, 
  Plug, AlertTriangle, FileSignature, DollarSign, 
  ArrowDown, X, Coffee, ArrowUp, Check, Activity, Square, Minus, Plus, Image as ImageIcon,
  LayoutGrid, List, Database, Percent, Zap, TrendingUp, Flame
} from 'lucide-react';

// ==========================================
// SYS_INIT::C:\SLUMLORDS\CONFIG.INI
// ==========================================
const CONFIG = {
    GAME_NFT: "0xd0a20B4B311f40b32F6c717586D9bE7BD7D27102",
    UPGRADE_NFT: "0x68828596c9d940D62a7d274f7D142c5d0aB08c0B",
    PORTFOLIO: "0xA0737bb659E15Fe229aACeEAEDd30493450061c9",
    GAME_TOKEN: "0x5D29e6Beb3c11545d023cfa03F6F5ece26A269Cc",
    ROUTER: "0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901",
    WETH: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c"
};

const OS_ENV = {
    VERSION: "v1.6.7",
    MORALITY_TOGGLE: false, 
    LEGAL_COMPLIANCE: "STANDARD",
    MAX_BRIBES: 9999
};

// Global cache to prevent redundant IPFS gateway spam
const imageCache = new Map();

const VALID_PAIRINGS = [
    ["Foreclosure Fields", "Landlord Lagoon", "The Evaporation Exploit", "+10% YIELD"],
    ["Eviction Alley", "Tax Haven Terrace", "The Offshore Shuffle", "-5% TAX"],
    ["Gentrification Gardens", "Tenant's Trap Canyon", "The 'Up-And-Coming' Squeeze", "-10% FATIGUE"],
    ["Mortgage Mountain", "Speculation Springs", "The Subprime Pump", "+5% YIELD / -5% TAX"],
    ["Rentpayer's Ravine", "Repossession Ridge", "The Debt-Trap Descent", "+15% YIELD"],
    ["Subprime Suburbia", "Default Desert", "The Bubble Burst Bonus", "-10% FATIGUE / -5% TAX"]
];

const ZONE_MODIFIERS = {
    "Foreclosure Fields": { y: {v:"+10%", c:"text-green-600"}, f: {v:"+10%", c:"text-red-600"}, t: {v:"+15%", c:"text-red-600"}, desc: "High yield, high maintenance." },
    "Eviction Alley": { y: {v:"-5%", c:"text-red-600"}, f: {v:"0%", c:"text-gray-500"}, t: {v:"-5%", c:"text-green-600"}, desc: "Low fatigue reduction." },
    "Gentrification Gardens": { y: {v:"+20%", c:"text-green-600"}, f: {v:"+15%", c:"text-red-600"}, t: {v:"+10%", c:"text-red-600"}, desc: "High yield, moderate fatigue." },
    "Mortgage Mountain": { y: {v:"+10%", c:"text-green-600"}, f: {v:"+5%", c:"text-red-600"}, t: {v:"+20%", c:"text-red-600"}, desc: "High yield, high tax." },
    "Rentpayer's Ravine": { y: {v:"+5%", c:"text-green-600"}, f: {v:"+10%", c:"text-red-600"}, t: {v:"+5%", c:"text-red-600"}, desc: "Steady base income." },
    "Subprime Suburbia": { y: {v:"+10%", c:"text-green-600"}, f: {v:"+5%", c:"text-red-600"}, t: {v:"+25%", c:"text-red-600"}, desc: "High tax, moderate yield." },
    "Default Desert": { y: {v:"-10%", c:"text-red-600"}, f: {v:"-5%", c:"text-green-600"}, t: {v:"-10%", c:"text-green-600"}, desc: "Low yield, low tax." },
    "Landlord Lagoon": { y: {v:"+15%", c:"text-green-600"}, f: {v:"+10%", c:"text-red-600"}, t: {v:"+20%", c:"text-red-600"}, desc: "High yield, high fatigue." },
    "Tax Haven Terrace": { y: {v:"+5%", c:"text-green-600"}, f: {v:"-10%", c:"text-green-600"}, t: {v:"+10%", c:"text-red-600"}, desc: "Low tax environment." },
    "Tenant's Trap Canyon": { y: {v:"-10%", c:"text-red-600"}, f: {v:"-20%", c:"text-green-600"}, t: {v:"-5%", c:"text-green-600"}, desc: "Low fatigue, low turnover." },
    "Speculation Springs": { y: {v:"+25%", c:"text-green-600"}, f: {v:"-15%", c:"text-green-600"}, t: {v:"+20%", c:"text-red-600"}, desc: "High volatility, high yield." },
    "Repossession Ridge": { y: {v:"+10%", c:"text-green-600"}, f: {v:"+10%", c:"text-red-600"}, t: {v:"+10%", c:"text-red-600"}, desc: "Standard modifiers." }
};

const ABIS = {
    GAME_NFT: [
        "function mint(uint256 quantity) payable",
        "function whitelistMint(uint256 quantity) payable",
        "function purchaseWhitelistSpot() payable",
        "function getCurrentMintPriceETH() view returns (uint256)",
        "function getCurrentMintPriceTokens() view returns (uint256)",
        "function WHITELIST_MINT_PRICE() view returns (uint256)",
        "function WHITELIST_SPOT_COST() view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
        "function getTierLevel(uint256 tokenId) external view returns (uint8)",
        "function getTokenYield(uint256 tokenId) external view returns (uint256)",
        "function getZone(uint256 tokenId) external view returns (string)",
        "function tokenURI(uint256 tokenId) view returns (string)",
        "function isApprovedForAll(address owner, address operator) view returns (bool)",
        "function setApprovalForAll(address operator, bool approved)",
        "function isWhitelisted(address user) view returns (bool)",
        "function whitelistSpotsSold() view returns (uint256)",
        "function whitelistMints(address user) view returns (uint256)",
        "function whitelistStart() view returns (uint256)",
        "function mintStart() view returns (uint256)"
    ],
    UPGRADE_NFT: [
        "function mint(uint256 quantity) payable",
        "function currentLevel() view returns (uint256)",
        "function getUpgradeInfoByTokenId(uint256 tokenId) view returns (uint256 level, string name, uint256 yieldIncrease)",
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
        "function tokenURI(uint256 tokenId) view returns (string)",
        "function isApprovedForAll(address owner, address operator) view returns (bool)",
        "function setApprovalForAll(address operator, bool approved)",
        {
            "inputs": [{ "internalType": "uint256", "name": "level", "type": "uint256" }],
            "name": "getLevelInfo",
            "outputs": [{
                "components": [
                    { "internalType": "string", "name": "name", "type": "string" },
                    { "internalType": "uint256", "name": "yieldIncrease", "type": "uint256" },
                    { "internalType": "uint256", "name": "maxSupply", "type": "uint256" },
                    { "internalType": "uint256", "name": "minted", "type": "uint256" },
                    { "internalType": "uint256", "name": "mintCostEth", "type": "uint256" },
                    { "internalType": "uint256", "name": "mintCostGameTokens", "type": "uint256" },
                    { "internalType": "string", "name": "uriSuffix", "type": "string" }
                ],
                "internalType": "struct UpgradeNFT.UpgradeLevel",
                "name": "",
                "type": "tuple"
            }],
            "stateMutability": "view",
            "type": "function"
        }
    ],
    PORTFOLIO: [
        "function stake(uint256[] tokenIds)",
        "function unstake(uint256[] tokenIds)",
        "function claimYield()",
        "function attachUpgradesToBaseToken(uint256 baseTokenId, uint256[] upgradeTokenIds)",
        "function detachUpgradesFromBaseToken(uint256 baseTokenId, uint256[] upgradeTokenIds)",
        "function getStakedTokens(address player) view returns (uint256[])",
        "function getAttachedUpgrades(uint256 baseTokenId) view returns (uint256[])",
        "function viewEstimatedYieldClaim(address user) view returns (uint256)",
        "function viewAverageFatigue(address user) view returns (uint256)",
        "function viewResetFatigueCost(address user) view returns (uint256)",
        "function resetFatigue()",
        "function getPropertyTax(address player, uint256 tokenId, int256 preCalcPairingBonus) view returns (uint256)",
        "function viewPortfolioTaxRates(address user) view returns (uint256[])",
        "function getTotalYield(address user) view returns (uint256)",
        "function viewMaxStakedNFTs(address user) view returns (uint256)",
        "function viewAvailableSkillPoints(address user) view returns (uint256)",
        "function viewNextSkillPointCost(address user) view returns (uint256)",
        "function viewSkillAllocation(address user) view returns (uint8 fatigueReduction, uint8 yieldBoost, uint8 taxReduction, uint8 stakingExpansion)",
        "function allocateSkillPoints(uint8 fatiguePoints, uint8 yieldPoints, uint8 taxPoints, uint8 stakingPoints)",
        "function purchaseSkillPoints(uint256 pointsToBuy)",
        "function resetSkillPoints()",
        "function activateFatigueConsumable()",
        "function activateYieldConsumable()",
        "function isFatigueConsumableActive(address user) view returns (bool)",
        "function isYieldConsumableActive(address user) view returns (bool)",
        "function viewFatigueConsumableCost(address user) view returns (uint256)",
        "function viewYieldConsumableCost(address user) view returns (uint256)",
        "function activeFatigueConsumables(address user) view returns (uint256 activeUntil, uint256 fatigueReductionBps)",
        "function activeYieldConsumables(address user) view returns (uint256 activeUntil, uint256 yieldBoostBps)",
        "function totalSkillPoints(address user) view returns (uint256)",
        "event UpgradeStaked(address indexed owner, uint256 indexed baseTokenId, uint256 indexed upgradeId)",
        "event UpgradeUnstaked(address indexed owner, uint256 indexed baseTokenId, uint256 indexed upgradeId)"
    ],
    TOKEN: [
        "function balanceOf(address account) view returns (uint256)",
        "function approve(address spender, uint256 value) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ],
    ROUTER: [
        { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForTokensSupportingFeeOnTransferTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [], "name": "factory", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsOut", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsIn", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }
    ],
    PAIR: [
        "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() external view returns (address)"
    ]
};

const RetroBtn = ({ onClick, children, className = "", disabled, active, title }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`border-t-2 border-l-2 border-b-2 border-r-2 ${active ? 'border-t-black border-l-black border-b-[#dfdfdf] border-r-[#dfdfdf] shadow-[inset_1px_1px_0px_#808080] bg-white text-black' : 'border-[#dfdfdf] border-b-black border-r-black bg-[#c0c0c0] shadow-[inset_1px_1px_0px_#fff] text-black'} px-3 py-1 font-bold flex items-center justify-center gap-2 transition-none uppercase text-[11px] ${disabled ? 'text-gray-500 opacity-60 cursor-not-allowed' : 'active:translate-x-[1px] active:translate-y-[1px]'} ${className}`}
    >
        {children}
    </button>
);

const RetroWindow = ({ title, children, className = "", headerColor = "from-[#000080] to-[#1084d0]" }) => (
    <div className={`flex flex-col border-t-2 border-l-2 border-[#dfdfdf] border-b-2 border-r-2 border-b-black border-r-black bg-[#c0c0c0] shadow-[1px_1px_0px_rgba(0,0,0,0.5)] ${className}`}>
        <div className={`bg-gradient-to-r ${headerColor} text-white px-2 py-0.5 font-bold flex justify-between items-center text-sm shrink-0 uppercase tracking-tighter`}>
            <span className="truncate">{title}</span>
            <div className="flex gap-1 shrink-0 ml-2">
                <div className="w-3 h-3 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px] text-black">_</div>
                <div className="w-3 h-3 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px] text-black">□</div>
                <div className="w-3 h-3 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px] text-black">×</div>
            </div>
        </div>
        <div className="flex-1 flex flex-col p-2 overflow-hidden">{children}</div>
    </div>
);

const RetroInset = ({ children, className = "" }) => {
    const hasCustomBg = className.includes('bg-');
    const defaultBg = hasCustomBg ? '' : 'bg-white';
    return (
        <div className={`border-t-2 border-l-2 border-b-2 border-r-2 border-t-[#808080] border-l-[#808080] border-b-[#dfdfdf] border-r-[#dfdfdf] shadow-[inset_1px_1px_0px_#000] ${defaultBg} ${className}`}>
            {children}
        </div>
    );
};

const formatCountdown = (timestamp) => {
    if (!timestamp || Number(timestamp) === 0) return null;
    const target = Number(timestamp) * 1000;
    const now = Date.now();
    if (target <= now) return null;
    const totalSeconds = Math.floor((target - now) / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const parseEthersNum = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'bigint') return Number(val);
    if (typeof val.toNumber === 'function') return val.toNumber();
    return Number(val) || 0;
};

export default function App() {
    const [ethersLoaded, setEthersLoaded] = useState(!!window.ethers);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [address, setAddress] = useState("");
    const [contracts, setContracts] = useState({});
    const [view, setView] = useState("dashboard");
    const [loading, setLoading] = useState(false);
    const [txPending, setTxPending] = useState(false);
    
    const [logs, setLogs] = useState([
        `> SLUMLORDS OS ${OS_ENV.VERSION} BOOTING...`,
        "> SYSTEM: ONLINE",
        "> CONNECTION: ESTABLISHED",
        "> INITIATING ASSET MANAGEMENT..."
    ]);
    const [currentTime, setCurrentTime] = useState("");
    const [now, setNow] = useState(Date.now()); 

    const [balances, setBalances] = useState({ eth: "0.0000", rent: "0.00", wavax: "0.0000", deeds: 0 });
    const [stats, setStats] = useState({ fatigue: "0", tax: "0", baseYield: "0.00", totalYield: "0.00", pending: "0.00", maxStaked: 0, resetCost: "0.00" });
    const [tickingPending, setTickingPending] = useState(0);
    
    const lastSyncTimestamp = useRef(Date.now());
    const yieldDataRef = useRef({ pending: 0, dailyYield: 0, lastSync: Date.now() });

    const [nfts, setNfts] = useState({ wallet: [], staked: [], upgrades: [] });
    const [store, setStore] = useState({ 
        gameCostEthDisplay: "0.0000", 
        gameCostEthRaw: "0", 
        gameCostRentDisplay: "0.00",
        wl: false, 
        upgLvl: "0", 
        upgInfo: null,
        wlCostEthRaw: "0.05",
        wlSpotCostEthRaw: "0.2",
        wlSpotsSold: "0",
        wlMintsUsed: "0",
        allUpgrades: [],
        wlStartMs: 0,
        pubStartMs: 0
    });
    
    // SKILL STATE
    const [skills, setSkills] = useState({ 
        avail: 0, totalOwned: 0, nextCost: "0.00", nextCostRaw: "0", 
        f: 0, y: 0, t: 0, s: 0, draft: { f: 0, y: 0, t: 0, s: 0 } 
    });
    const [skillBuyQty, setSkillBuyQty] = useState(1);
    const [consumables, setConsumables] = useState({ fActive: false, yActive: false, fCost: "0.00", yCost: "0.00", fEndTime: null, yEndTime: null });
    const [portfolioTab, setPortfolioTab] = useState("wallet");
    const [selectedNFTs, setSelectedNFTs] = useState([]);
    
    const [upgradeModalBaseId, setUpgradeModalBaseId] = useState(null);
    const [upgModalTab, setUpgModalTab] = useState("wallet");
    const [selectedModalUpgIds, setSelectedModalUpgIds] = useState([]);
    
    const [nftApprovals, setNftApprovals] = useState({ game: false, upgrade: false });
    const [allowances, setAllowances] = useState({ gameNFT: 0, upgradeNFT: 0, portfolio: 0, router: 0, wavaxRouter: 0 });
    
    const [wlMintQty, setWlMintQty] = useState(1);
    const [publicMintQty, setPublicMintQty] = useState(1);
    const [upgradeMintQty, setUpgradeMintQty] = useState(1);

    // ==========================================
    // TWO-WAY BINDING SWAP STATE
    // ==========================================
    const [payAmount, setPayAmount] = useState("");
    const [receiveAmount, setReceiveAmount] = useState("");
    const [lastEdit, setLastEdit] = useState("pay"); 
    const [swapMode, setSwapMode] = useState("sell"); 
    const [pairInfo, setPairInfo] = useState({ price: "0.00000000", priceUsd: "0.000000", loading: true });

    const portfolioInitialized = useRef(false);

    useEffect(() => {
        if (!window.ethers) {
            const s = document.createElement('script'); s.src = "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.11.1/ethers.umd.min.js";
            s.onload = () => setEthersLoaded(true); document.head.appendChild(s);
        }
    }, []);

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    fetchOnChainData(accounts[0]);
                } else {
                    setAddress("");
                }
            });
        }
    }, []);

    useEffect(() => {
        if (ethersLoaded && !address) {
            connectWallet(true);
        }
    }, [ethersLoaded]);

    useEffect(() => {
        yieldDataRef.current = {
            pending: parseFloat(stats.pending) || 0,
            dailyYield: parseFloat(stats.totalYield) || 0,
            lastSync: lastSyncTimestamp.current
        };
    }, [stats.pending, stats.totalYield]);

    useEffect(() => {
        const ticker = setInterval(() => {
            const { pending, dailyYield, lastSync } = yieldDataRef.current;
            if (dailyYield > 0) {
                const yieldPerSec = dailyYield / 86400; 
                const elapsedSec = (Date.now() - lastSync) / 1000;
                setTickingPending(pending + (yieldPerSec * elapsedSec));
            } else {
                setTickingPending(pending);
            }
        }, 50); 
        return () => clearInterval(ticker);
    }, []);

    useEffect(() => {
        const clockTimer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour12: false }));
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // ------------------------------------------
    // MARKET ORACLE (Price & USD sync)
    // ------------------------------------------
    useEffect(() => {
        const fetchPairData = async () => {
            if (!provider || !contracts.router || !window.ethers) return;
            try {
                const factoryAddr = await contracts.router.factory();
                const factoryContract = new window.ethers.Contract(factoryAddr, ["function getPair(address,address) view returns (address)"], provider);
                const pairAddr = await factoryContract.getPair(CONFIG.GAME_TOKEN, CONFIG.WETH);
                
                let rentPriceInAvax = 0;
                if (pairAddr !== "0x0000000000000000000000000000000000000000") {
                    const pairContract = new window.ethers.Contract(pairAddr, ABIS.PAIR, provider);
                    const [reserves, t0] = await Promise.all([pairContract.getReserves(), pairContract.token0()]);
                    const isRentT0 = t0.toLowerCase() === CONFIG.GAME_TOKEN.toLowerCase();
                    const resRENT = isRentT0 ? reserves.reserve0 : reserves.reserve1;
                    const resAVAX = isRentT0 ? reserves.reserve1 : reserves.reserve0;
                    
                    const fmt = window.ethers.formatEther ? window.ethers.formatEther : window.ethers.utils.formatEther;
                    const rRENT = parseFloat(fmt(resRENT));
                    const rAVAX = parseFloat(fmt(resAVAX));
                    rentPriceInAvax = rRENT > 0 ? (rAVAX / rRENT) : 0;
                }

                let avaxUsd = 0;
                try {
                    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd");
                    const data = await res.json();
                    avaxUsd = data["avalanche-2"].usd || 0;
                } catch(e) { console.error("CoinGecko Error:", e); }

                const rentUsd = rentPriceInAvax * avaxUsd;

                setPairInfo({ 
                    price: rentPriceInAvax.toFixed(8), 
                    priceUsd: rentUsd.toFixed(6),
                    loading: false 
                });
            } catch (e) { console.error("Oracle Error:", e); }
        };
        fetchPairData();
        const interval = setInterval(fetchPairData, 15000);
        return () => clearInterval(interval);
    }, [address, provider, contracts.router]);

    // ------------------------------------------
    // TWO-WAY DEX ESTIMATOR
    // ------------------------------------------
    useEffect(() => {
        const calculateSwap = async () => {
            if (!contracts.router || !window.ethers) return;
            try {
                let path = swapMode === 'sell' ? [CONFIG.GAME_TOKEN, CONFIG.WETH] : [CONFIG.WETH, CONFIG.GAME_TOKEN];
                const parse = window.ethers.parseEther ? window.ethers.parseEther : window.ethers.utils.parseEther;
                const fmt = window.ethers.formatEther ? window.ethers.formatEther : window.ethers.utils.formatEther;

                if (lastEdit === 'pay') {
                    if (!payAmount || Number(payAmount) <= 0) { setReceiveAmount(""); return; }
                    let cleanInput = payAmount.toString().replace(/^\./, '0.');
                    let weiAmount = parse(cleanInput);
                    const amounts = await contracts.router.getAmountsOut(weiAmount, path);
                    const outWei = amounts[amounts.length - 1];
                    setReceiveAmount(parseFloat(fmt(outWei)).toFixed(4));
                } else if (lastEdit === 'receive') {
                    if (!receiveAmount || Number(receiveAmount) <= 0) { setPayAmount(""); return; }
                    let cleanOutput = receiveAmount.toString().replace(/^\./, '0.');
                    let weiAmount = parse(cleanOutput);
                    const amounts = await contracts.router.getAmountsIn(weiAmount, path);
                    const inWeiStr = amounts[0].toString();
                    
                    // Add 0.5% buffer to exact inputs to prevent transaction failures from pool drift
                    const paddedInWeiStr = ((BigInt(inWeiStr) * 1005n) / 1000n).toString();
                    setPayAmount(parseFloat(fmt(paddedInWeiStr)).toFixed(4));
                }
            } catch (e) {
                if (lastEdit === 'pay') setReceiveAmount("");
                else setPayAmount("");
            }
        };
        
        const timeoutId = setTimeout(calculateSwap, 400); 
        return () => clearTimeout(timeoutId);
    }, [payAmount, receiveAmount, lastEdit, swapMode, contracts.router]);

    const formatEther = (val) => {
        if (val === undefined || val === null || !window.ethers) return "0";
        try {
            let strVal = typeof val === 'string' ? val : val.toString();
            return window.ethers.formatEther ? window.ethers.formatEther(strVal) : window.ethers.utils.formatEther(strVal);
        } catch(e) { return "0"; }
    };
    
    const parseEther = (val) => {
        if (val === undefined || val === null || !window.ethers) return "0";
        try {
            return window.ethers.parseEther ? window.ethers.parseEther(val.toString()) : window.ethers.utils.parseEther(val.toString());
        } catch(e) { return "0"; }
    };

    const getMaxUint = () => {
      if (!window.ethers) return "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      return window.ethers.MaxUint256 || "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    };

    const sysLog = (msg) => {
        const time = new Date().toLocaleTimeString([], { hour12: false });
        setLogs(prev => {
            const newLogs = [...prev, `[${time}] > ${msg}`];
            return newLogs.slice(-12); 
        });
    };

    const fetchNftImage = async (metadataUri) => {
        if (!metadataUri) return "";
        if (imageCache.has(metadataUri)) return imageCache.get(metadataUri);
        try {
            let url = metadataUri.startsWith("ipfs://") ? metadataUri.replace("ipfs://", "https://ipfs.io/ipfs/") : metadataUri;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); 
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return "";
            const json = await res.json();
            let img = json.image || "";
            if (img.startsWith("ipfs://")) img = img.replace("ipfs://", "https://ipfs.io/ipfs/");
            imageCache.set(metadataUri, img);
            return img;
        } catch (e) { return ""; }
    };

    const connectWallet = async (silent = false) => {
        if (!window.ethereum) {
            if (!silent) alert("MetaMask not detected!");
            return;
        }
        try {
            const p = new window.ethers.BrowserProvider(window.ethereum);
            if (silent) {
                const accs = await p.send("eth_accounts", []);
                if (!accs || accs.length === 0) return;
            } else {
                await p.send("eth_requestAccounts", []);
            }
            const s = await p.getSigner();
            const a = await s.getAddress();
            const c = {
                gameNFT: new window.ethers.Contract(CONFIG.GAME_NFT, ABIS.GAME_NFT, s),
                upgradeNFT: new window.ethers.Contract(CONFIG.UPGRADE_NFT, ABIS.UPGRADE_NFT, s),
                portfolio: new window.ethers.Contract(CONFIG.PORTFOLIO, ABIS.PORTFOLIO, s),
                token: new window.ethers.Contract(CONFIG.GAME_TOKEN, ABIS.TOKEN, s),
                router: new window.ethers.Contract(CONFIG.ROUTER, ABIS.ROUTER, s)
            };
            setProvider(p); setSigner(s); setAddress(a); setContracts(c);
            sysLog(`NODE CONNECTED: ${a.slice(0,6)}...`);
            fetchOnChainData(a, p, c);
        } catch (err) { 
            if (!silent) sysLog(`CONN ERROR: ${err.message}`); 
        }
    };

    const runInChunks = async (items, fn, chunkSize = 5) => {
        let res = [];
        for (let i = 0; i < items.length; i += chunkSize) {
            res.push(...await Promise.all(items.slice(i, i + chunkSize).map(fn)));
        }
        return res;
    };

    const fetchOnChainData = async (addr = address, p = provider, c = contracts) => {
        if (!addr || !c.portfolio || !window.ethers) return;
        setLoading(true);
        try {
            const safeRead = async (fn, fallback = "0") => {
                try { const res = await fn(); return res ?? fallback; } catch (e) { return fallback; }
            };

            const checksumAddr = window.ethers.getAddress(addr);
            const checksumPortfolio = window.ethers.getAddress(CONFIG.PORTFOLIO);

            let isGameApproved = false; let isUpgApproved = false;
            try { isGameApproved = await c.gameNFT.isApprovedForAll(checksumAddr, checksumPortfolio); } catch (e) {}
            try { isUpgApproved = await c.upgradeNFT.isApprovedForAll(checksumAddr, checksumPortfolio); } catch (e) {}
            
            setNftApprovals({ game: isGameApproved === true, upgrade: isUpgApproved === true });

            const wContract = new window.ethers.Contract(CONFIG.WETH, ABIS.TOKEN, p);
            const wavaxBalRaw = await safeRead(() => wContract.balanceOf(checksumAddr));

            const ethBal = await safeRead(() => p.getBalance(checksumAddr));
            const rentBal = await safeRead(() => c.token.balanceOf(checksumAddr));
            setBalances({ 
                eth: parseFloat(formatEther(ethBal)).toFixed(4), 
                rent: parseFloat(formatEther(rentBal)).toFixed(2),
                wavax: parseFloat(formatEther(wavaxBalRaw)).toFixed(4)
            });

            const [aGame, aUpg, aPort, aRouter, aWavaxRouter] = await Promise.all([
                safeRead(() => c.token.allowance(checksumAddr, CONFIG.GAME_NFT)),
                safeRead(() => c.token.allowance(checksumAddr, CONFIG.UPGRADE_NFT)),
                safeRead(() => c.token.allowance(checksumAddr, CONFIG.PORTFOLIO)),
                safeRead(() => c.token.allowance(checksumAddr, CONFIG.ROUTER)),
                safeRead(() => wContract.allowance(checksumAddr, CONFIG.ROUTER))
            ]);
            
            setAllowances({
                gameNFT: parseFloat(formatEther(aGame)), 
                upgradeNFT: parseFloat(formatEther(aUpg)),
                portfolio: parseFloat(formatEther(aPort)), 
                router: parseFloat(formatEther(aRouter)),
                wavaxRouter: parseFloat(formatEther(aWavaxRouter))
            });

            const [avgF, pTaxArray, ty, py, maxS, rCost] = await Promise.all([
                safeRead(() => c.portfolio.viewAverageFatigue(checksumAddr)), 
                safeRead(() => c.portfolio.viewPortfolioTaxRates(checksumAddr), []), 
                safeRead(() => c.portfolio.getTotalYield(checksumAddr)), 
                safeRead(() => c.portfolio.viewEstimatedYieldClaim(checksumAddr)), 
                safeRead(() => c.portfolio.viewMaxStakedNFTs(checksumAddr)), 
                safeRead(() => c.portfolio.viewResetFatigueCost(checksumAddr))
            ]);

            const [availS, nextS, allocS, fAct, yAct, fCost, yCost, fConsData, yConsData, totalS] = await Promise.all([
                safeRead(() => c.portfolio.viewAvailableSkillPoints(checksumAddr)), 
                safeRead(() => c.portfolio.viewNextSkillPointCost(checksumAddr)), 
                safeRead(() => c.portfolio.viewSkillAllocation(checksumAddr), { fatigueReduction: 0, yieldBoost: 0, taxReduction: 0, stakingExpansion: 0 }),
                safeRead(() => c.portfolio.isFatigueConsumableActive(checksumAddr), false), 
                safeRead(() => c.portfolio.isYieldConsumableActive(checksumAddr), false),
                safeRead(() => c.portfolio.viewFatigueConsumableCost(checksumAddr)), 
                safeRead(() => c.portfolio.viewYieldConsumableCost(checksumAddr)),
                safeRead(() => c.portfolio.activeFatigueConsumables(checksumAddr), { activeUntil: 0 }), 
                safeRead(() => c.portfolio.activeYieldConsumables(checksumAddr), { activeUntil: 0 }),
                safeRead(() => c.portfolio.totalSkillPoints(checksumAddr))
            ]);

            setSkills(p => ({
                ...p, 
                avail: parseEthersNum(availS), 
                totalOwned: parseEthersNum(totalS), 
                nextCost: parseFloat(formatEther(nextS)).toFixed(2), 
                nextCostRaw: nextS.toString(),
                f: parseEthersNum(allocS.fatigueReduction), y: parseEthersNum(allocS.yieldBoost), 
                t: parseEthersNum(allocS.taxReduction), s: parseEthersNum(allocS.stakingExpansion), draft: { f: 0, y: 0, t: 0, s: 0 }
            }));

            setConsumables({ 
                fActive: !!fAct, yActive: !!yAct, fCost: parseFloat(formatEther(fCost)).toFixed(2), yCost: parseFloat(formatEther(yCost)).toFixed(2),
                fEndTime: fConsData?.activeUntil?.toString() || "0", yEndTime: yConsData?.activeUntil?.toString() || "0"
            });

            const [gEth, gRent, wl, currLvl, wlStartRaw, pubStartRaw] = await Promise.all([
                safeRead(() => c.gameNFT.getCurrentMintPriceETH()), 
                safeRead(() => c.gameNFT.getCurrentMintPriceTokens()), 
                safeRead(() => c.gameNFT.isWhitelisted(checksumAddr), false), 
                safeRead(() => c.upgradeNFT.currentLevel(), 0),
                safeRead(() => c.gameNFT.whitelistStart(), 0),
                safeRead(() => c.gameNFT.mintStart(), 0)
            ]);
            let wlPrice = await safeRead(() => c.gameNFT.WHITELIST_MINT_PRICE(), "50000000000000000"); 
            let wlSpotPrice = await safeRead(() => c.gameNFT.WHITELIST_SPOT_COST(), "200000000000000000"); 
            let wlSpots = await safeRead(() => c.gameNFT.whitelistSpotsSold(), "0");
            let wlUsed = await safeRead(() => c.gameNFT.whitelistMints(checksumAddr), "0");
            
            const upgIndices = Array.from({length: 20}, (_, i) => i);
            
            let rawUpgData = await runInChunks(upgIndices, async (i) => {
                try {
                    const r = await c.upgradeNFT.getLevelInfo(i);
                    if (!r) return null;
                    
                    let nameStr, yInc, mSup, mintd, cEth, cRent, uSuf;

                    if (r.name !== undefined) {
                        nameStr = r.name;
                        yInc = r.yieldIncrease;
                        mSup = r.maxSupply;
                        mintd = r.minted;
                        cEth = r.mintCostEth;
                        cRent = r.mintCostGameTokens;
                        uSuf = r.uriSuffix;
                    } else if (Array.isArray(r)) {
                        const data = Array.isArray(r[0]) ? r[0] : r;
                        nameStr = data[0];
                        yInc = data[1];
                        mSup = data[2];
                        mintd = data[3];
                        cEth = data[4];
                        cRent = data[5];
                        uSuf = data[6];
                    } else {
                        throw new Error("Unknown tuple format returned");
                    }

                    if (!nameStr) return null; 

                    return {
                        id: i,
                        name: nameStr,
                        yield: formatEther(yInc),
                        maxSupply: parseEthersNum(mSup),
                        minted: parseEthersNum(mintd),
                        costEth: formatEther(cEth),
                        costRent: formatEther(cRent),
                        uriSuffix: uSuf || ""
                    };
                } catch (e) {
                    console.error(`UPGRADE FETCH ERROR (LEVEL ${i}):`, e);
                    return { id: i, name: `Level ${i+1} Upgrade`, yield: "0", maxSupply: 0, minted: 0, costEth: "0", costRent: "0", uriSuffix: "" };
                }
            }, 3);
            
            rawUpgData = rawUpgData.filter(Boolean);

            let baseURI = "";
            for (let i = 0; i < rawUpgData.length; i++) {
                if (rawUpgData[i].minted > 0 && rawUpgData[i].uriSuffix) {
                    try {
                        const tokenId = (i + 1) * 10000;
                        const sampleUri = await safeRead(() => c.upgradeNFT.tokenURI(tokenId), "");
                        if (sampleUri && rawUpgData[i].uriSuffix) {
                            baseURI = sampleUri.replace(rawUpgData[i].uriSuffix, "");
                            break;
                        }
                    } catch(e) {}
                }
            }

            const allUpgData = await runInChunks(rawUpgData, async (upg) => {
                let img = "";
                if (baseURI && upg.uriSuffix) img = await fetchNftImage(baseURI + upg.uriSuffix);
                return { ...upg, image: img };
            }, 5);

            setStore(prev => ({ 
                ...prev, gameCostEthDisplay: parseFloat(formatEther(gEth)).toFixed(4), gameCostEthRaw: formatEther(gEth), 
                gameCostRentDisplay: parseFloat(formatEther(gRent)).toFixed(2), wl: !!wl, upgLvl: currLvl.toString(),
                wlCostEthRaw: formatEther(wlPrice), wlSpotCostEthRaw: formatEther(wlSpotPrice),
                wlSpotsSold: wlSpots.toString(), wlMintsUsed: wlUsed.toString(), allUpgrades: allUpgData, upgInfo: allUpgData[parseEthersNum(currLvl)] || null,
                wlStartMs: parseEthersNum(wlStartRaw) * 1000,
                pubStartMs: parseEthersNum(pubStartRaw) * 1000
            }));

            const wBalCount = await safeRead(() => c.gameNFT.balanceOf(checksumAddr), 0);
            const wIndices = Array.from({length: parseEthersNum(wBalCount)}, (_, i) => i);
            const wIds = await runInChunks(wIndices, async (i) => await safeRead(() => c.gameNFT.tokenOfOwnerByIndex(checksumAddr, i), null), 5);
            const validWIds = wIds.filter(id => id !== null && id !== "0" && id !== undefined);
            
            const wNfts = await runInChunks(validWIds, async (id) => {
                const [t, z, y, uri] = await Promise.all([
                    safeRead(() => c.gameNFT.getTierLevel(id), 0),
                    safeRead(() => c.gameNFT.getZone(id), "Unknown"),
                    safeRead(() => c.gameNFT.getTokenYield(id), 0),
                    safeRead(() => c.gameNFT.tokenURI(id), "")
                ]);
                let img = ""; if(uri) img = await fetchNftImage(uri);
                return { id: id.toString(), tier: parseEthersNum(t), zone: z, yield: formatEther(y), image: img };
            }, 5);

            let sIdsRaw = [];
            try { const result = await safeRead(() => c.portfolio.getStakedTokens(checksumAddr), []); if (result) sIdsRaw = Array.from(result); } catch(e) {}
            const validSIds = sIdsRaw.filter(id => id !== null && id !== undefined);

            const sNfts = await runInChunks(validSIds, async (id, index) => {
                const [t, z, y, uri, upgIdsResult] = await Promise.all([
                    safeRead(() => c.gameNFT.getTierLevel(id), 0),
                    safeRead(() => c.gameNFT.getZone(id), "Unknown"),
                    safeRead(() => c.gameNFT.getTokenYield(id), 0),
                    safeRead(() => c.gameNFT.tokenURI(id), ""),
                    safeRead(() => c.portfolio.getAttachedUpgrades(id), [])
                ]);
                let img = ""; if(uri) img = await fetchNftImage(uri);
                
                let attachedUpgradesList = [];
                if (upgIdsResult && upgIdsResult.length > 0) {
                    const safeUpgIds = Array.from(upgIdsResult);
                    attachedUpgradesList = await runInChunks(safeUpgIds, async (uId) => {
                        const [ui, uUri] = await Promise.all([
                            safeRead(() => c.upgradeNFT.getUpgradeInfoByTokenId(uId), null),
                            safeRead(() => c.upgradeNFT.tokenURI(uId), "")
                        ]);
                        if(!ui) return null;
                        let uImg = ""; if(uUri) uImg = await fetchNftImage(uUri);
                        return { baseId: id.toString(), id: uId.toString(), name: ui.name, boost: formatEther(ui.yieldIncrease), image: uImg };
                    }, 3);
                    attachedUpgradesList = attachedUpgradesList.filter(Boolean);
                }
                const safePTaxArray = pTaxArray ? Array.from(pTaxArray) : [];
                const taxRate = safePTaxArray && safePTaxArray[index] !== undefined ? (parseEthersNum(safePTaxArray[index]) / 100).toFixed(1) : "25.0";
                return { id: id.toString(), tier: parseEthersNum(t), zone: z, yield: formatEther(y), image: img, attachedUpgrades: attachedUpgradesList, taxRate: taxRate };
            }, 5);

            const uBalCount = await safeRead(() => c.upgradeNFT.balanceOf(checksumAddr), 0);
            const uIndices = Array.from({length: parseEthersNum(uBalCount)}, (_, i) => i);
            const uIds = await runInChunks(uIndices, async (i) => await safeRead(() => c.upgradeNFT.tokenOfOwnerByIndex(checksumAddr, i), null), 5);
            const validUIds = uIds.filter(id => id !== null && id !== "0" && id !== undefined);

            const uNfts = await runInChunks(validUIds, async (id) => {
                const [ui, uri] = await Promise.all([
                    safeRead(() => c.upgradeNFT.getUpgradeInfoByTokenId(id), null),
                    safeRead(() => c.upgradeNFT.tokenURI(id), "")
                ]);
                if(!ui) return null;
                let img = ""; if(uri) img = await fetchNftImage(uri);
                return { id: id.toString(), name: ui.name, boost: formatEther(ui.yieldIncrease), image: img };
            }, 5);

            setNfts({ wallet: wNfts, staked: sNfts, upgrades: uNfts.filter(Boolean) });

            let fetchedTotalYield = parseFloat(formatEther(ty));
            let localBaseYield = 0;
            let localUpgradeYield = 0;
            sNfts.forEach(nft => { 
                localBaseYield += parseFloat(nft.yield || "0"); 
                if (nft.attachedUpgrades && nft.attachedUpgrades.length > 0) {
                    nft.attachedUpgrades.forEach(u => { localUpgradeYield += parseFloat(u.boost || "0"); });
                }
            });

            let totalBaseGross = localBaseYield + localUpgradeYield;

            if (fetchedTotalYield === 0 && (localBaseYield > 0 || localUpgradeYield > 0)) {
                const fatiguePercent = parseEthersNum(avgF) / 10000;
                fetchedTotalYield = (totalBaseGross) * (1 - fatiguePercent);
            } else if (fetchedTotalYield > 0 && localUpgradeYield > 0) {
                const fatiguePercent = parseEthersNum(avgF) / 10000;
                const expectedBaseAfterFatigue = localBaseYield * (1 - fatiguePercent);
                if (Math.abs(fetchedTotalYield - expectedBaseAfterFatigue) < 0.1) { fetchedTotalYield += localUpgradeYield; }
            }

            let fetchedPending = parseFloat(formatEther(py));
            let avgTax = "25.0";
            const safePTaxArray = pTaxArray ? Array.from(pTaxArray) : [];
            if (safePTaxArray && safePTaxArray.length > 0) {
                const totalTaxSum = safePTaxArray.reduce((acc, val) => acc + parseEthersNum(val), 0);
                avgTax = (totalTaxSum / safePTaxArray.length / 100).toFixed(1);
            } else if (allocS) {
                avgTax = (25.0 - (parseEthersNum(allocS.taxReduction || 0) * 3)).toFixed(1);
            }

            lastSyncTimestamp.current = Date.now();
            yieldDataRef.current = { pending: fetchedPending, dailyYield: fetchedTotalYield, lastSync: lastSyncTimestamp.current };

            setStats({ 
                fatigue: (parseEthersNum(avgF) / 100).toFixed(1), 
                tax: avgTax, 
                taxRates: safePTaxArray ? safePTaxArray.map(r => (parseEthersNum(r) / 100).toFixed(1)) : [],
                baseYield: totalBaseGross.toFixed(2),
                totalYield: fetchedTotalYield.toFixed(2), 
                pending: fetchedPending.toFixed(4), 
                maxStaked: parseEthersNum(maxS), 
                resetCost: parseFloat(formatEther(rCost)).toFixed(2) 
            });
            
            setTickingPending(fetchedPending);
            if (!portfolioInitialized.current) { setPortfolioTab(sNfts.length > 0 ? "staked" : "wallet"); portfolioInitialized.current = true; }
            sysLog("LEDGER SYNC SUCCESS.");
        } catch (e) { console.error(e); sysLog("FETCH ERROR."); } finally { setLoading(false); }
    };

    const executeTx = async (fn, msg) => {
        if (!signer) return false; setTxPending(true); 
        try {
            const tx = await fn(); 
            sysLog("AWAITING CONFIRMATION...");
            await tx.wait(); 
            sysLog(`SUCCESS: ${msg}`);
            fetchOnChainData();
            return true;
        } catch (e) { 
            let errStr = "TX REVERTED";
            if (e.reason) errStr = `REVERT: ${e.reason}`;
            else if (e.data && e.data.message) errStr = `REVERT: ${e.data.message}`;
            else if (e.message) errStr = `ERR: ${e.message.split('(')[0].trim()}`;
            sysLog(errStr); 
            return false;
        } finally { setTxPending(false); }
    };

    const actionMint = async (isWl) => {
        try {
            let ethReqStr;
            const targetQty = isWl ? wlMintQty : publicMintQty;
            const rawCost = isWl && store.wlCostEthRaw ? store.wlCostEthRaw : store.gameCostEthRaw;
            let weiCost = window.ethers.parseEther(rawCost.toString());
            ethReqStr = (weiCost * BigInt(targetQty)).toString();
            if (isWl) executeTx(() => contracts.gameNFT.whitelistMint(targetQty, { value: ethReqStr }), `Whitelisted Mint x${targetQty}`);
            else executeTx(() => contracts.gameNFT.mint(targetQty, { value: ethReqStr }), `Public Mint x${targetQty}`);
        } catch (e) { sysLog(`Data Error: ${e.message}`); }
    };

    const actionBuyWhitelist = () => {
        try {
            let ethReqStr = window.ethers.parseEther(store.wlSpotCostEthRaw).toString();
            executeTx(() => contracts.gameNFT.purchaseWhitelistSpot({ value: ethReqStr }), `Purchased Whitelist Spot`);
        } catch (e) { sysLog(`Data Error: ${e.message}`); }
    };

    const actionBuyUpg = () => {
        if(!store.upgInfo) return;
        try {
            const maxAvail = store.upgInfo.maxSupply - store.upgInfo.minted;
            const actualQty = Math.min(upgradeMintQty, maxAvail, 10);
            if (actualQty <= 0) return;
            let ethReqStr;
            let weiCost = window.ethers.parseEther(store.upgInfo.costEth.toString());
            ethReqStr = (weiCost * BigInt(actualQty)).toString();
            executeTx(() => contracts.upgradeNFT.mint(actualQty, { value: ethReqStr }), `Purchased ${store.upgInfo.name} x${actualQty}`);
        } catch (e) { sysLog(`Data Error: ${e.message}`); }
    };

    const actionSwap = async () => {
        if(!payAmount || Number(payAmount) <= 0) return;
        try {
            let cleanInput = payAmount.toString().replace(/^\./, '0.');
            let weiAmountIn = window.ethers.parseEther(cleanInput);
            const dLine = Math.floor(Date.now() / 1000) + 1200; 
            const txOverrides = { gasLimit: 600000 }; 

            if (swapMode === 'sell') {
                await executeTx(
                    () => contracts.router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        weiAmountIn, 0, [CONFIG.GAME_TOKEN, CONFIG.WETH], address, dLine, txOverrides
                    ), 
                    "Swapped RENT for WAVAX."
                );
            } else {
                await executeTx(
                    () => contracts.router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        weiAmountIn, 0, [CONFIG.WETH, CONFIG.GAME_TOKEN], address, dLine, txOverrides
                    ), 
                    "Swapped WAVAX for RENT."
                );
            }
            setPayAmount("");
            setReceiveAmount("");
        } catch (e) { 
            let errMessage = e.reason || e.message?.split('(')[0].trim() || "Transaction Failed";
            sysLog(`Swap Error: ${errMessage}`); 
        }
    };

    const actionSaveSkills = () => {
        const fTotal = skills.f + skills.draft.f;
        const yTotal = skills.y + skills.draft.y;
        const tTotal = skills.t + skills.draft.t;
        const sTotal = skills.s + skills.draft.s;
        executeTx(() => contracts.portfolio.allocateSkillPoints(fTotal, yTotal, tTotal, sTotal), "Skills Allocated.");
    };

    const modSkill = (stat, delta) => {
        const d = skills.draft;
        const currentDraftTotal = d.f + d.y + d.t + d.s;
        if (delta > 0) {
            if (currentDraftTotal >= skills.avail) return;
            if ((skills[stat] + d[stat]) >= 5) return;
            setSkills(p => ({...p, draft: {...p.draft, [stat]: p.draft[stat] + 1}}));
        } else {
            if (d[stat] <= 0) return;
            setSkills(p => ({...p, draft: {...p.draft, [stat]: p.draft[stat] - 1}}));
        }
    };

    const actionApproveToken = (target) => executeTx(() => contracts.token.approve(target, getMaxUint()), "Approval Granted.");
    const actionStakeSelected = async () => { const success = await executeTx(() => contracts.portfolio.stake(selectedNFTs.map(id => BigInt(id))), "BATCH STAKE COMPLETE."); if (success) setSelectedNFTs([]); };
    const actionUnstakeSelected = async () => { const success = await executeTx(() => contracts.portfolio.unstake(selectedNFTs.map(id => BigInt(id))), "BATCH UNSTAKE COMPLETE."); if (success) setSelectedNFTs([]); };

    const renderZoneBars = () => {
        const all = [...nfts.wallet, ...nfts.staked];
        if(all.length === 0) return <div className="text-gray-500 text-center py-4 italic uppercase text-[10px]">NO_DATA_NULL</div>;
        const map = {}; 
        all.forEach(n => { 
            if (!map[n.zone]) map[n.zone] = { staked: 0, wallet: 0 };
            if (nfts.staked.find(s => s.id === n.id)) map[n.zone].staked++;
            else map[n.zone].wallet++;
        });
        return (
            <div className="flex flex-col gap-1 w-full text-[10px] font-mono h-full">
                <div className="grid grid-cols-12 border-b-2 border-black pb-1 mb-1 font-bold bg-gray-300 px-1">
                    <div className="col-span-8">DISTRICT</div>
                    <div className="col-span-2 text-center text-blue-700">STKD</div>
                    <div className="col-span-2 text-center text-gray-600">HELD</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {Object.entries(map).sort((a,b) => (b[1].staked + b[1].wallet) - (a[1].staked + a[1].wallet)).map(([zone, counts]) => (
                        <div key={zone} className="grid grid-cols-12 border-b border-gray-300 py-1.5 hover:bg-gray-100 transition-colors px-1">
                            <div className="col-span-8 uppercase truncate pr-2 font-bold">{zone}</div>
                            <div className="col-span-2 text-center font-bold text-blue-800">{counts.staked}</div>
                            <div className="col-span-2 text-center text-gray-500">{counts.wallet}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderPairingGraph = () => {
        const stakedZones = [...new Set(nfts.staked.map(n => n.zone).filter(Boolean))];
        return (
            <div className="flex-1 mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {VALID_PAIRINGS.map(([z1, z2, lore, buffText], i) => {
                    const hasZ1 = stakedZones.includes(z1);
                    const hasZ2 = stakedZones.includes(z2);
                    const count = (hasZ1 ? 1 : 0) + (hasZ2 ? 1 : 0);
                    const isActive = count === 2;
                    return (
                        <div key={i} className={`flex flex-col items-center justify-center p-4 border-2 relative overflow-hidden min-h-[160px] ${isActive ? 'bg-purple-50 border-purple-500 shadow-[inset_2px_2px_0px_#fff]' : 'bg-gray-200 border-gray-400'}`}>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                <div className={`text-4xl font-black -rotate-12 whitespace-nowrap text-center leading-none ${isActive ? 'text-green-600 opacity-20' : 'text-gray-600 opacity-5'}`}>
                                    {buffText}
                                </div>
                            </div>
                            <div className="relative w-14 h-14 mb-3 z-10">
                                <svg viewBox="0 0 36 36" className="w-14 h-14 transform -rotate-90">
                                    <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="#a3a3a3" strokeWidth="3"/>
                                    <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke={isActive ? "#39ff14" : count === 1 ? "#eab308" : "transparent"} strokeWidth="6" strokeDasharray={`${count * 50}, 100`}/>
                                </svg>
                                <div className={`absolute inset-0 flex items-center justify-center text-sm font-mono font-black ${isActive ? 'text-green-700' : 'text-gray-700'}`}>
                                    {count}/2
                                </div>
                            </div>
                            <div className={`text-sm font-black text-center leading-tight mb-3 uppercase ${isActive ? 'text-purple-900' : 'text-gray-700'} z-10 px-1`}>
                                {lore}
                            </div>
                            <div className="w-full space-y-1.5 z-10 mb-3">
                                <div className={`text-xs uppercase truncate w-full text-center px-2 py-1 rounded border ${hasZ1 ? 'font-black bg-green-300 border-green-600 text-black' : 'text-gray-500 bg-gray-300 border-gray-400 line-through opacity-60'}`}>
                                    {z1}
                                </div>
                                <div className={`text-xs uppercase truncate w-full text-center px-2 py-1 rounded border ${hasZ2 ? 'font-black bg-green-300 border-green-600 text-black' : 'text-gray-500 bg-gray-300 border-gray-400 line-through opacity-60'}`}>
                                    {z2}
                                </div>
                            </div>
                            <div className={`mt-auto w-full border-t-2 border-black text-center font-black text-xs py-2 z-10 shadow-sm uppercase ${isActive ? 'bg-green-400 text-black animate-pulse' : 'bg-gray-400 text-gray-700'}`}>
                                {buffText} {isActive ? 'ACTIVE' : 'LOCKED'}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const isFatigueZero = parseFloat(stats.fatigue || "0") === 0;

    const views = {
        dashboard: (
            <div className="space-y-6 pb-20">
                <RetroWindow className="bg-yellow-50" headerColor="from-yellow-600 to-yellow-800" title="SYSTEM_STATUS">
                    <div className="flex items-center gap-3 p-3">
                        <AlertTriangle size={24} className="text-yellow-700 shrink-0"/>
                        <p className="text-sm font-black uppercase tracking-tight">System check: All protocols active. Node synchronized. Performance is nominal.</p>
                    </div>
                </RetroWindow>

                <RetroWindow title="YIELD_RESERVE">
                    <div className="retro-inset bg-black p-8 flex flex-col items-center justify-center min-h-[200px] border-4 border-gray-600">
                        <div className="flex w-full justify-between px-6 mb-6 text-sm font-mono text-gray-400 uppercase border-b-2 border-gray-800 pb-3">
                            <span>Net Yield/Day: <span className="text-yellow-400 font-black">{String(stats.totalYield)}</span></span>
                            <span>Fatigue: <span className={`font-black ${parseFloat(stats.fatigue) > 50 ? 'text-red-500' : 'text-orange-400'}`}>{String(stats.fatigue)}%</span></span>
                        </div>
                        <span className="text-7xl font-black text-[#39ff14] font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(57,255,20,0.6)]">
                            {tickingPending.toFixed(6)}
                        </span>
                        <span className="text-sm text-gray-500 font-mono tracking-[0.4em] mt-6 uppercase font-black">UNCLAIMED $RENT</span>
                    </div>
                    <RetroBtn onClick={() => executeTx(() => contracts.portfolio.claimYield(), "RENT CLAIMED")} className="w-full bg-green-300 py-5 mt-3 text-lg border-4 border-black uppercase font-black shadow-[6px_6px_0px_#000] hover:bg-green-400">
                        CLAIM YIELD
                    </RetroBtn>
                    
                    <div className="mt-8 pt-6 border-t-2 border-gray-400 border-dashed">
                        <div className="text-sm font-black mb-4 uppercase tracking-widest text-center text-gray-800 underline">MAINTENANCE & BOOSTS</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {allowances.portfolio < 100000 ? (
                                <RetroBtn onClick={() => actionApproveToken(CONFIG.PORTFOLIO)} className="w-full md:col-span-3 bg-yellow-200 py-4 text-sm border-2 border-black font-black uppercase">APPROVE PORTFOLIO CONTRACT</RetroBtn>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <RetroBtn disabled={isFatigueZero} onClick={() => executeTx(() => contracts.portfolio.resetFatigue(), "FATIGUE RESET")} className={`w-full py-4 text-xs border-2 border-black font-black uppercase ${isFatigueZero ? 'bg-gray-400' : 'bg-yellow-200 hover:bg-yellow-300'}`}>
                                            <RefreshCw size={16} className="mr-1"/> RESET FATIGUE ({String(stats.resetCost)})
                                        </RetroBtn>
                                        <span className="text-[9px] text-gray-600 font-bold text-center leading-tight uppercase">Resets property fatigue to 0%.</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <RetroBtn disabled={consumables.fActive} onClick={() => executeTx(() => contracts.portfolio.activateFatigueConsumable(), "FATIGUE CONSUMABLE ACTIVATED")} className={`w-full py-4 text-xs border-2 border-black font-black uppercase ${consumables.fActive ? 'bg-gray-400' : 'bg-blue-200 hover:bg-blue-300'}`}>
                                            <Coffee size={16} className="mr-1"/> {consumables.fActive ? `ACTIVE (${formatCountdown(consumables.fEndTime) || '...'})` : `SLOW FATIGUE (${String(consumables.fCost)})`}
                                        </RetroBtn>
                                        <span className="text-[9px] text-blue-800 font-bold text-center leading-tight uppercase">Reduces fatigue accumulation by 10% for 24H.</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <RetroBtn disabled={consumables.yActive} onClick={() => executeTx(() => contracts.portfolio.activateYieldConsumable(), "YIELD CONSUMABLE ACTIVATED")} className={`w-full py-4 text-xs border-2 border-black font-black uppercase ${consumables.yActive ? 'bg-gray-400' : 'bg-green-200 hover:bg-green-300'}`}>
                                            <TrendingUp size={16} className="mr-1"/> {consumables.yActive ? `ACTIVE (${formatCountdown(consumables.yEndTime) || '...'})` : `BOOST YIELD (${String(consumables.yCost)})`}
                                        </RetroBtn>
                                        <span className="text-[9px] text-green-800 font-bold text-center leading-tight uppercase">Increases base yield by +20% for 24H.</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </RetroWindow>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RetroWindow title="SYNERGY_NETWORK" headerColor="from-purple-800 to-purple-600" className="h-full">
                        <div className="flex flex-col h-full p-3">
                            <div className="text-sm font-black uppercase flex justify-between px-3 py-2 bg-purple-100 border-b-2 border-purple-300 mb-3">
                                <span>ACTIVE PAIRINGS</span>
                                <span className="text-purple-700">ACTIVE: {nfts.staked.length} UNITS</span>
                            </div>
                            {renderPairingGraph()}
                        </div>
                    </RetroWindow>
                    <RetroWindow title="ZONE_DISTRIBUTION" className="h-full">
                        <div className="p-3 h-full bg-gray-50 flex flex-col">
                            <div className="text-sm font-black uppercase px-3 py-2 bg-blue-100 border-b-2 border-blue-300 mb-3">DISTRICT SATURATION</div>
                            <div className="flex-1 min-h-[400px]">{renderZoneBars()}</div>
                        </div>
                    </RetroWindow>
                </div>
            </div>
        ),
        finance: (() => {
            const netYield = parseFloat(stats.totalYield) || 0;
            const baseYield = parseFloat(stats.baseYield) || 0;
            const fatiguePct = parseFloat(stats.fatigue) || 0;
            const usdPrice = parseFloat(pairInfo.priceUsd) || 0;
    
            const dailyUsd = (netYield * usdPrice).toFixed(2);
            const weeklyYield = (netYield * 7).toFixed(2);
            const weeklyUsd = (netYield * 7 * usdPrice).toFixed(2);
            const monthlyYield = (netYield * 30).toFixed(2);
            const monthlyUsd = (netYield * 30 * usdPrice).toFixed(2);
            const yearlyYield = (netYield * 365).toFixed(2);
            const yearlyUsd = (netYield * 365 * usdPrice).toFixed(2);
    
            const totalUpgrades = nfts.staked.reduce((sum, nft) => sum + (nft.attachedUpgrades?.length || 0), 0);
            const totalLiquidUsd = ((parseFloat(balances.rent) + tickingPending) * usdPrice).toFixed(2);
            
            // Fatigue ROI Math
            const resetCost = parseFloat(stats.resetCost) || 0;
            const lostYieldPerDay = baseYield * (fatiguePct / 100);
            const daysToPayback = lostYieldPerDay > 0 ? (resetCost / lostYieldPerDay).toFixed(1) : "N/A";
            const roiVerdict = lostYieldPerDay === 0 ? "STATUS: OPTIMAL" : (daysToPayback < 5 ? "RECOMMENDATION: RESET FATIGUE" : "RECOMMENDATION: DEFER MAINTENANCE");

            // Steroid ROI Math
            const steroidCost = parseFloat(consumables.yCost) || 0;
            const assumedBoostRate = 0.20; 
            const estBoostYield = baseYield * assumedBoostRate;
            const steroidNetProfit = estBoostYield - steroidCost;
            const steroidVerdict = consumables.yActive ? "STATUS: BOOST ACTIVE" : (steroidNetProfit > 0 ? "RECOMMENDATION: ACTIVATE BOOST" : "RECOMMENDATION: DEFER BOOST");
    
            return (
                <div className="flex flex-col h-full p-2 gap-4 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <RetroWindow title="TREASURY_RESERVES.SYS" headerColor="from-green-900 to-green-700">
                            <div className="bg-black text-[#39ff14] p-4 font-mono uppercase shadow-inner flex flex-col items-center justify-center border-4 border-gray-600 m-2 h-full min-h-[160px]">
                                <span className="text-gray-400 text-[10px] mb-1 font-bold tracking-widest text-center">TOTAL LIQUID VALUE (USD)</span>
                                <span className="text-4xl font-black drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">
                                    ${totalLiquidUsd}
                                </span>
                                <div className="w-full flex justify-between mt-4 pt-3 border-t border-gray-800 text-[10px]">
                                    <div className="flex flex-col items-center">
                                        <span className="text-gray-500">WALLET BALANCE</span>
                                        <span className="font-bold">{balances.rent} RENT</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-gray-500">UNCLAIMED YIELD</span>
                                        <span className="font-bold">{tickingPending.toFixed(4)} RENT</span>
                                    </div>
                                </div>
                            </div>
                        </RetroWindow>
    
                        <RetroWindow title="MAINTENANCE_ROI_ANALYZER" headerColor="from-orange-900 to-orange-700">
                            <div className="p-4 bg-white font-mono text-[10px] uppercase h-full flex flex-col justify-between shadow-inner border-2 border-gray-400 m-2">
                                <div className="flex flex-col gap-1.5 border-b border-gray-300 pb-2 mb-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">CURRENT RESET COST:</span>
                                        <span className="font-bold">{resetCost.toFixed(2)} RENT</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">LOST YIELD (FATIGUE):</span>
                                        <span className="font-bold text-red-600">-{lostYieldPerDay.toFixed(2)} RENT / DAY</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">EST. PAYBACK PERIOD:</span>
                                        <span className="font-bold">{daysToPayback} DAYS</span>
                                    </div>
                                </div>
                                <div className="text-[8px] text-gray-500 leading-tight italic mb-2">
                                    * ROI INFO: The reset fee is a flat rate. If the payback period is high, defer maintenance until the daily fatigue loss justifies the reset cost.
                                </div>
                                <div className={`p-2 text-center font-black border-2 ${roiVerdict === 'RECOMMENDATION: RESET FATIGUE' ? 'bg-red-200 border-red-600 text-red-900 animate-pulse' : 'bg-gray-200 border-gray-500 text-gray-700'}`}>
                                    {roiVerdict}
                                </div>
                            </div>
                        </RetroWindow>

                        <RetroWindow title="YIELD_BOOST_ANALYZER.EXE" headerColor="from-blue-900 to-blue-700">
                            <div className="p-4 bg-white font-mono text-[10px] uppercase h-full flex flex-col justify-between shadow-inner border-2 border-gray-400 m-2">
                                <div className="flex flex-col gap-1.5 border-b border-gray-300 pb-2 mb-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">CONSUMABLE COST:</span>
                                        <span className="font-bold">{steroidCost.toFixed(2)} RENT</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">EST. YIELD INCREASE:</span>
                                        <span className="font-bold text-green-600">+{estBoostYield.toFixed(2)} RENT / DAY</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">NET DAILY PROFIT:</span>
                                        <span className={`font-bold ${steroidNetProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {steroidNetProfit > 0 ? '+' : ''}{steroidNetProfit.toFixed(2)} RENT
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[8px] text-gray-500 leading-tight italic mb-2">
                                    * ROI INFO: Assumes a ~20% temporary yield boost. Positive net profit indicates favorable ROI.
                                </div>
                                <div className={`p-2 text-center font-black border-2 ${consumables.yActive ? 'bg-blue-200 border-blue-600 text-blue-900' : steroidVerdict === 'RECOMMENDATION: ACTIVATE BOOST' ? 'bg-green-200 border-green-600 text-green-900 animate-pulse' : 'bg-gray-200 border-gray-500 text-gray-700'}`}>
                                    {steroidVerdict}
                                </div>
                            </div>
                        </RetroWindow>
                    </div>
    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-16">
                        <RetroWindow title="P&L_STATEMENT (24H)" headerColor="from-gray-800 to-black">
                            <div className="p-3 bg-gray-100 font-mono text-[10px] uppercase space-y-2 h-full shadow-inner border-2 border-gray-400">
                                <div className="flex justify-between border-b border-gray-300 pb-1">
                                    <span className="text-gray-600">GROSS BASE YIELD:</span>
                                    <span className="font-bold">{baseYield.toFixed(2)} RENT</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 pb-1">
                                    <span className="text-gray-600">AVG FATIGUE IMPACT:</span>
                                    <span className="font-bold text-red-600">-{stats.fatigue}%</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 pb-1">
                                    <span className="text-gray-600">EFFECTIVE TAX RATE:</span>
                                    <span className="font-bold text-red-600">-{stats.tax}%</span>
                                </div>
                                <div className="flex justify-between font-black text-green-700 text-xs pt-1">
                                    <span>NET TAKE-HOME YIELD:</span>
                                    <span>{netYield.toFixed(2)} RENT</span>
                                </div>
                            </div>
                        </RetroWindow>
    
                        <RetroWindow title="REVENUE_PROJECTIONS" headerColor="from-purple-900 to-purple-700">
                            <div className="p-3 bg-gray-100 font-mono text-[10px] uppercase h-full shadow-inner border-2 border-gray-400">
                                <div className="grid grid-cols-3 font-bold text-gray-500 border-b border-gray-400 pb-1 mb-1">
                                    <span>TERM</span><span className="text-right">RENT</span><span className="text-right">USD</span>
                                </div>
                                <div className="grid grid-cols-3 border-b border-gray-300 pb-1 mb-1">
                                    <span>DAILY</span><span className="text-right font-bold text-green-700">{netYield.toFixed(2)}</span><span className="text-right font-bold text-green-700">${dailyUsd}</span>
                                </div>
                                <div className="grid grid-cols-3 border-b border-gray-300 pb-1 mb-1">
                                    <span>WEEKLY</span><span className="text-right font-bold text-green-700">{weeklyYield}</span><span className="text-right font-bold text-green-700">${weeklyUsd}</span>
                                </div>
                                <div className="grid grid-cols-3 border-b border-gray-300 pb-1 mb-1">
                                    <span>MONTHLY</span><span className="text-right font-bold text-green-700">{monthlyYield}</span><span className="text-right font-bold text-green-700">${monthlyUsd}</span>
                                </div>
                                <div className="grid grid-cols-3 pb-1">
                                    <span>YEARLY</span><span className="text-right font-bold text-green-700">{yearlyYield}</span><span className="text-right font-bold text-green-700">${yearlyUsd}</span>
                                </div>
                                <div className="text-[8px] text-gray-500 mt-2 italic leading-tight text-center border-t border-gray-300 pt-1">* Projections assume 0% fatigue drift and stable market conditions.</div>
                            </div>
                        </RetroWindow>
    
                        <RetroWindow title="ASSET_ALLOCATION" headerColor="from-gray-800 to-gray-600">
                            <div className="p-3 bg-gray-100 font-mono text-[10px] uppercase h-full shadow-inner border-2 border-gray-400 flex flex-col justify-center space-y-2">
                                <div className="flex justify-between border-b border-gray-300 pb-1">
                                    <span className="text-gray-600">PROPERTIES OWNED:</span>
                                    <span className="font-bold">{(nfts.staked.length + nfts.wallet.length)} UNITS</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 pb-1">
                                    <span className="text-gray-600">ACTIVE PORTFOLIO:</span>
                                    <span className="font-bold text-blue-700">{nfts.staked.length} / {stats.maxStaked} SLOTS</span>
                                </div>
                                <div className="w-full bg-gray-300 h-2 border border-black mb-1">
                                    <div className="h-full bg-blue-600" style={{ width: `${stats.maxStaked > 0 ? (nfts.staked.length / stats.maxStaked) * 100 : 0}%` }}></div>
                                </div>
                                <div className="flex justify-between border-b border-gray-300 pb-1 pt-1">
                                    <span className="text-gray-600">INSTALLED UPGRADES:</span>
                                    <span className="font-bold text-orange-600">{totalUpgrades} ACTIVE</span>
                                </div>
                            </div>
                        </RetroWindow>
                    </div>
                </div>
            );
        })(),
        portfolio: (
            <div className="flex flex-col h-full gap-2 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
                    <RetroWindow title="PORTFOLIO_OPS" headerColor="from-blue-800 to-blue-600">
                        <div className="p-1 flex flex-col gap-1 h-full">
                            <div className="flex gap-1">
                                <RetroBtn active={portfolioTab==='wallet'} onClick={() => { setPortfolioTab('wallet'); setSelectedNFTs([]); }} className="flex-1 font-bold">WALLET</RetroBtn>
                                <RetroBtn active={portfolioTab==='staked'} onClick={() => { setPortfolioTab('staked'); setSelectedNFTs([]); }} className="flex-1 font-bold">STAKED</RetroBtn>
                            </div>
                            <RetroBtn 
                                onClick={() => { 
                                    if (selectedNFTs.length > 0) {
                                        setSelectedNFTs([]); 
                                    } else {
                                        if (portfolioTab === 'wallet') {
                                            const availableSlots = Math.max(0, stats.maxStaked - nfts.staked.length);
                                            setSelectedNFTs(nfts.wallet.slice(0, availableSlots).map(n => n.id));
                                        } else {
                                            setSelectedNFTs(nfts.staked.map(n => n.id));
                                        }
                                    }
                                }} 
                                className="w-full text-[9px] py-1 border-2 border-black font-bold"
                            >
                                SELECT ALL
                            </RetroBtn>
                        </div>
                    </RetroWindow>
                    <RetroWindow title="STAKING_CAPACITY" headerColor="from-green-800 to-green-600"><div className="p-2 space-y-1 font-bold text-[9px] uppercase h-full flex flex-col justify-center"><div className="flex justify-between"><span>STAKED:</span> <span>{nfts.staked.length}/{stats.maxStaked}</span></div><div className="w-full bg-gray-300 h-3 border-2 border-black overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${stats.maxStaked > 0 ? (nfts.staked.length / stats.maxStaked) * 100 : 0}%` }}></div></div><div className="flex justify-between"><span>FATIGUE:</span> <span>{String(stats.fatigue)}%</span></div><div className="w-full bg-gray-300 h-3 border-2 border-black overflow-hidden"><div className="h-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)] transition-all duration-500" style={{ width: `${Math.min(100, parseFloat(stats.fatigue || 0))}%` }}></div></div></div></RetroWindow>
                    <RetroWindow title="MAINTENANCE_PANEL" headerColor="from-red-800 to-red-600">
                        <div className="p-1 flex flex-col h-full gap-1 justify-center">
                            {allowances.portfolio < 100000 ? (
                                <RetroBtn onClick={() => actionApproveToken(CONFIG.PORTFOLIO)} className="w-full bg-yellow-200 py-2 text-[9px] border-2 border-black font-bold uppercase">APPROVE CONTRACT</RetroBtn>
                            ) : (
                                <>
                                    <RetroBtn disabled={isFatigueZero} onClick={() => executeTx(() => contracts.portfolio.resetFatigue(), "FATIGUE RESET")} className={`w-full py-1 text-[9px] border-2 border-black font-bold uppercase flex-1 ${isFatigueZero ? 'bg-gray-400 text-gray-700' : 'bg-yellow-200 hover:bg-yellow-300'}`}><RefreshCw size={10} className="mr-1"/>RESET FATIGUE ({String(stats.resetCost)})</RetroBtn>
                                    <RetroBtn disabled={consumables.fActive} onClick={() => executeTx(() => contracts.portfolio.activateFatigueConsumable(), "FATIGUE CONSUMABLE ACTIVATED")} className={`w-full py-1 text-[9px] border-2 border-black font-bold uppercase flex-1 ${consumables.fActive ? 'bg-gray-400 text-gray-700' : 'bg-blue-100 hover:bg-blue-200'}`}><Coffee size={10} className="mr-1"/>{consumables.fActive ? `ACTIVE (${formatCountdown(consumables.fEndTime) || '...'})` : `SLOW FATIGUE (${String(consumables.fCost)})`}</RetroBtn>
                                    <RetroBtn disabled={consumables.yActive} onClick={() => executeTx(() => contracts.portfolio.activateYieldConsumable(), "YIELD CONSUMABLE ACTIVATED")} className={`w-full py-1 text-[9px] border-2 border-black font-bold uppercase flex-1 ${consumables.yActive ? 'bg-gray-400 text-gray-700' : 'bg-green-100 hover:bg-green-200'}`}><ArrowUp size={10} className="mr-1"/>{consumables.yActive ? `ACTIVE (${formatCountdown(consumables.yEndTime) || '...'})` : `BOOST YIELD (${String(consumables.yCost)})`}</RetroBtn>
                                </>
                            )}
                        </div>
                    </RetroWindow>
                </div>
                <RetroInset className="flex-1 p-2 overflow-y-auto bg-[#c0c0c0] min-h-0 relative shadow-inner">
                    <div className="flex justify-end items-center mb-2">
                        {selectedNFTs.length > 0 && (
                            <div className="bg-yellow-100 border-4 border-black p-1 flex items-center gap-2 shadow-[4px_4px_0px_#000]">
                                <span className="font-bold text-[11px] uppercase px-2"><Zap size={14}/> {selectedNFTs.length} Units</span>
                                {portfolioTab === 'wallet' ? (
                                    nftApprovals.game === true ? (
                                        <RetroBtn onClick={actionStakeSelected} className="bg-green-300 px-4 border-2 border-black font-bold uppercase">STAKE</RetroBtn>
                                    ) : (
                                        <RetroBtn onClick={() => executeTx(() => contracts.gameNFT.setApprovalForAll(CONFIG.PORTFOLIO, true), "STAKING APPROVED")} className="bg-yellow-300 hover:bg-yellow-400 px-4 border-2 border-black font-bold uppercase">APPROVE STAKING</RetroBtn>
                                    )
                                ) : ( <RetroBtn onClick={actionUnstakeSelected} className="bg-red-300 px-4 border-2 border-black font-bold uppercase">UNSTAKE</RetroBtn> )}
                                <RetroBtn onClick={()=>setSelectedNFTs([])} className="px-2 border-2 border-black shadow-none"><X size={12}/></RetroBtn>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2 pb-8">
                        {(portfolioTab==='wallet' ? nfts.wallet : nfts.staked).map(item => (
                            <div key={item.id} className={`border-2 border-black bg-gray-200 p-1 transition-all ${selectedNFTs.includes(item.id) ? 'scale-95 brightness-110 border-blue-600 shadow-inner' : ''}`}>
                                <div className="bg-gray-800 text-white text-[10px] py-1 px-1 flex justify-between items-center font-mono">
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedNFTs.includes(item.id)} 
                                            onChange={(e) => { 
                                                e.stopPropagation(); 
                                                setSelectedNFTs(prev => {
                                                    if (prev.includes(item.id)) return prev.filter(id=>id!==item.id);
                                                    const availableSlots = Math.max(0, stats.maxStaked - nfts.staked.length);
                                                    if (portfolioTab === 'wallet' && prev.length >= availableSlots) return prev;
                                                    return [...prev, item.id];
                                                }); 
                                            }} 
                                            className="w-3.5 h-3.5 cursor-pointer accent-blue-600 m-0"
                                        />
                                        <span>#{String(item.id)}</span>
                                    </div>
                                    <span>T{String(item.tier + 1)}</span>
                                </div>
                                <div className="bg-white p-1 cursor-pointer" onClick={(e) => {
                                    e.stopPropagation(); 
                                    setSelectedNFTs(prev => {
                                        if (prev.includes(item.id)) return prev.filter(id=>id!==item.id);
                                        const availableSlots = Math.max(0, stats.maxStaked - nfts.staked.length);
                                        if (portfolioTab === 'wallet' && prev.length >= availableSlots) return prev;
                                        return [...prev, item.id];
                                    }); 
                                }}>
                                  <div className="w-full aspect-square bg-gray-100 border border-gray-400 overflow-hidden relative shadow-inner">
                                    {item.image ? <img src={item.image} className="w-full h-full object-cover pixelated pointer-events-none" alt="" /> : <div className="flex items-center justify-center h-full opacity-10"><ImageIcon size={18}/></div>}
                                    {item.attachedUpgrades && item.attachedUpgrades.length > 0 && (
                                        <div className="absolute bottom-0 left-0 w-full bg-black/60 p-1 flex gap-1 justify-center z-10 backdrop-blur-sm">
                                            {item.attachedUpgrades.map((u, idx) => (
                                                <div key={idx} className="w-6 h-6 border-2 border-white bg-gray-800 shadow-md">{u.image ? <img src={u.image} className="w-full h-full object-cover pixelated" title={`${u.name} (+${u.boost})`} alt="U" /> : <Hammer size={12} className="text-white m-auto mt-1 opacity-50"/>}</div>
                                            ))}
                                        </div>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-col gap-1">
                                    <div className="text-[11px] font-bold uppercase truncate bg-blue-50 px-1 border-b border-blue-200">{String(item.zone)}</div>
                                    {ZONE_MODIFIERS[item.zone] && (
                                        <div className="flex flex-col gap-0.5 text-[10px] font-mono px-1.5 py-1 bg-gray-50 border border-gray-200">
                                            <div className="flex justify-between"><span className="text-gray-500">Yield:</span><span className={ZONE_MODIFIERS[item.zone].y.c}>{String(ZONE_MODIFIERS[item.zone].y.v)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Fatigue:</span><span className={ZONE_MODIFIERS[item.zone].f.c}>{String(ZONE_MODIFIERS[item.zone].f.v)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">{portfolioTab === 'staked' ? 'Net Tax:' : 'Zone Tax:'}</span><span className={ZONE_MODIFIERS[item.zone].t.c}>{portfolioTab === 'staked' && item.taxRate ? `${item.taxRate}%` : String(ZONE_MODIFIERS[item.zone].t.v)}</span></div>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-[12px] font-bold mt-1">
                                      {(() => {
                                          const cardYield = parseFloat(item.yield || "0") + (item.attachedUpgrades || []).reduce((sum, u) => sum + parseFloat(u.boost || "0"), 0);
                                          return <span className="text-green-700 font-mono flex items-center"><DollarSign size={14} className="inline -mt-0.5 mr-0.5"/>{cardYield.toFixed(1)}/D</span>;
                                      })()}
                                      {portfolioTab === 'staked' && ( <button onClick={(e)=>{e.stopPropagation(); setUpgradeModalBaseId(item.id); setSelectedModalUpgIds([]); setUpgModalTab("wallet"); }} className="text-[11px] bg-orange-100 border-2 border-orange-400 text-black px-2.5 uppercase font-black py-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5 hover:bg-orange-200 z-20 relative">Upgrades</button> )}
                                    </div>
                                  </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </RetroInset>
            </div>
        ),
        mint: (() => {
            const isWlScheduled = store.wlStartMs > 0;
            const wlNotStarted = !isWlScheduled || now < store.wlStartMs;
            
            const isPubScheduled = store.pubStartMs > 0;
            const pubNotStarted = !isPubScheduled || now < store.pubStartMs;

            const getCountdownStr = (targetMs) => {
                if (!targetMs || targetMs <= now) return "00:00:00";
                const totalSeconds = Math.floor((targetMs - now) / 1000);
                const d = Math.floor(totalSeconds / 86400);
                const h = Math.floor((totalSeconds % 86400) / 3600).toString().padStart(2, '0');
                const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
                const s = (totalSeconds % 60).toString().padStart(2, '0');
                return d > 0 ? `${d}D ${h}:${m}:${s}` : `${h}:${m}:${s}`;
            };

            const wlCountdown = isWlScheduled ? getCountdownStr(store.wlStartMs) : "TBD";
            const pubCountdown = isPubScheduled ? getCountdownStr(store.pubStartMs) : "TBD";

            // Price Calculators
            const reqPubRent = parseFloat(store.gameCostRentDisplay || "0") * publicMintQty;
            const needsPubApproval = allowances.gameNFT < reqPubRent;
            
            const totalWlEth = (parseFloat(store.wlCostEthRaw || "0") * wlMintQty).toFixed(4);
            const totalPubEth = (parseFloat(store.gameCostEthDisplay || "0") * publicMintQty).toFixed(4);
            const totalPubRent = reqPubRent.toFixed(2);
            
            const isWlSoldOut = (250 - Number(store.wlSpotsSold)) <= 0;

            // Balance Validation
            const hasEnoughWlEth = parseFloat(balances.eth || "0") >= parseFloat(totalWlEth);
            const hasEnoughPubEth = parseFloat(balances.eth || "0") >= parseFloat(totalPubEth);
            const hasEnoughPubRent = parseFloat(balances.rent || "0") >= parseFloat(totalPubRent);
            const canAffordPublic = hasEnoughPubEth && hasEnoughPubRent;
            
            const reqWlSpotEth = parseFloat(store.wlSpotCostEthRaw || "0");
            const hasEnoughSpotEth = parseFloat(balances.eth || "0") >= reqWlSpotEth;
            const isWlDepleted = 10 - Number(store.wlMintsUsed) <= 0;

            return (
                <div className="flex flex-col gap-4 h-full overflow-y-auto p-4 pb-16">
                    
                    {/* ========================================== */}
                    {/* NEW OVERHAULED HERO SALES PITCH */}
                    {/* ========================================== */}
                    <RetroWindow title="MINT_OVERVIEW" headerColor="from-gray-800 to-black">
                        <div className="p-4 bg-[#c0c0c0] flex flex-col gap-4">
                            <div className="bg-black text-[#39ff14] p-5 font-mono shadow-inner border-4 border-gray-600 flex flex-col items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                                    <Building size={120} />
                                </div>
                                <span className="text-lg md:text-2xl font-black tracking-widest uppercase mb-2 z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                                    Build Your Portfolio
                                </span>
                                <span className="text-xs md:text-sm text-[#39ff14] font-bold uppercase leading-relaxed max-w-2xl z-10">
                                    Mint properties to unlock daily yield generation. Every mint directly drives value back into the ecosystem through automated mechanics.
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <RetroInset className="p-4 bg-white flex flex-col items-center text-center gap-3 border-2 border-gray-400">
                                    <div className="bg-green-100 p-3 border-2 border-green-500 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                                        <DollarSign size={24} className="text-green-700"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm uppercase text-gray-800 mb-1">1. Generate Yield</span>
                                        <span className="text-[10px] text-gray-600 font-bold leading-tight">Stake your properties in your portfolio to instantly begin earning daily $RENT token rewards.</span>
                                    </div>
                                </RetroInset>
                                
                                <RetroInset className="p-4 bg-white flex flex-col items-center text-center gap-3 border-2 border-gray-400">
                                    <div className="bg-red-100 p-3 border-2 border-red-500 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                                        <Flame size={24} className="text-red-700"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm uppercase text-gray-800 mb-1">2. Deflationary Burn</span>
                                        <span className="text-[10px] text-gray-600 font-bold leading-tight">100% of the token cost from public mints is automatically burned, permanently reducing supply.</span>
                                    </div>
                                </RetroInset>
                                
                                <RetroInset className="p-4 bg-white flex flex-col items-center text-center gap-3 border-2 border-gray-400">
                                    <div className="bg-blue-100 p-3 border-2 border-blue-500 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                                        <TrendingUp size={24} className="text-blue-700"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm uppercase text-gray-800 mb-1">3. Scale & Upgrade</span>
                                        <span className="text-[10px] text-gray-600 font-bold leading-tight">Reinvest your earnings to unlock powerful property upgrades and maximize your ROI over time.</span>
                                    </div>
                                </RetroInset>
                            </div>
                        </div>
                    </RetroWindow>
                    
                    <div className="flex flex-col lg:flex-row gap-6 justify-center items-stretch flex-1">
                        {/* ========================================== */}
                        {/* WHITELIST CARD */}
                        {/* ========================================== */}
                        <RetroWindow title="WHITELIST_MINT.EXE" className="w-full max-w-md flex-1" headerColor="from-purple-900 to-purple-600">
                            <div className="p-4 flex flex-col gap-4 h-full bg-[#c0c0c0]">
                                
                                {/* Header Banner */}
                                <div className="w-full bg-white border-2 border-gray-500 shadow-inner flex p-3 items-center gap-4">
                                    <div className="bg-purple-100 p-2 border border-purple-300 shadow-inner shrink-0">
                                        <FileSignature size={36} className="text-purple-700"/>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h2 className="text-xl font-black uppercase tracking-tighter text-gray-800 leading-none mb-1">Whitelist Access</h2>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Priority Minting Phase</span>
                                    </div>
                                </div>
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <RetroInset className="p-2 bg-gray-100 flex flex-col items-center justify-center text-center shadow-inner">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase mb-0.5">Unit Cost</span>
                                        <span className="font-mono font-black text-sm text-purple-700">{store.wl ? parseFloat(store.wlCostEthRaw || "0").toFixed(4) : "---"} ETH</span>
                                    </RetroInset>
                                    <RetroInset className="p-2 bg-gray-100 flex flex-col items-center justify-center text-center shadow-inner">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase mb-0.5">{store.wl ? "Mints Remaining" : "Spots Available"}</span>
                                        <span className={`font-mono font-black text-sm ${store.wl ? 'text-purple-700' : 'text-blue-700'}`}>
                                            {store.wl ? `${10 - Number(store.wlMintsUsed)} / 10` : `${250 - Number(store.wlSpotsSold)} / 250`}
                                        </span>
                                    </RetroInset>
                                </div>
                                
                                {/* Information & Pitches */}
                                <div className="flex-1 flex flex-col justify-center">
                                    {store.wl ? (
                                        <div className="bg-green-50 border border-green-300 p-3 shadow-inner text-center w-full">
                                            <span className="text-[11px] font-black text-green-800 uppercase leading-tight flex items-center justify-center gap-1"><Check size={14}/> STATUS CONFIRMED</span>
                                            <p className="text-[9px] text-green-700 mt-1 font-bold uppercase leading-relaxed">You may bypass the $RENT token burn and mint properties at the discounted ETH rate.</p>
                                        </div>
                                    ) : isWlSoldOut ? (
                                        <div className="bg-red-50 border border-red-200 p-3 shadow-inner text-center w-full">
                                            <span className="text-[12px] font-black text-red-800 uppercase leading-tight">WHITELIST SOLD OUT</span>
                                            <p className="text-[9px] text-red-600 mt-1 font-bold uppercase">All allocations have been claimed. Please proceed to the public offering.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="text-[10px] text-gray-700 text-center uppercase font-bold px-2 leading-relaxed bg-white border border-gray-300 p-2 shadow-inner">
                                                Secure a whitelist spot to significantly lower your minting costs. Whitelist users save money by bypassing the $RENT token burn requirement and locking in a fixed, discounted ETH rate.
                                            </div>
                                            <div className="bg-blue-50 border border-blue-200 p-2 shadow-inner text-center">
                                                <span className="text-[9px] font-bold text-blue-800 uppercase leading-tight">
                                                    Funding Allocation Notice:<br/> 100% of the ETH raised from whitelist spot purchases is used to deploy the initial liquidity pool.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Control Deck */}
                                <div className="w-full mt-auto border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-gray-500 border-r-gray-500 bg-gray-200 p-3 flex flex-col gap-3 shadow-[2px_2px_4px_rgba(0,0,0,0.2)]">
                                    {store.wl ? (
                                        wlNotStarted ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-red-600 uppercase animate-pulse">SYSTEM LOCKED</span>
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">MINT OPENS IN:</span>
                                                </div>
                                                <div className="w-full bg-black border-2 border-gray-600 shadow-inner p-3 flex justify-center items-center">
                                                    <span className="font-mono font-black text-2xl text-[#39ff14] tracking-widest">{isWlScheduled ? wlCountdown : "AWAITING TIME"}</span>
                                                </div>
                                                <RetroBtn disabled={true} className="w-full py-3 font-bold text-sm uppercase border-2 border-gray-500 bg-gray-300 text-gray-500 shadow-none mt-1">
                                                    STANDBY
                                                </RetroBtn>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between bg-white border-2 border-gray-500 shadow-inner p-1.5 pl-3">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Quantity</span>
                                                    <div className="flex items-center gap-3">
                                                        <RetroBtn onClick={() => setWlMintQty(Math.max(1, wlMintQty-1))} className="px-3 py-1"><Minus size={16}/></RetroBtn>
                                                        <span className="font-bold text-xl font-mono w-6 text-center">{wlMintQty > (10 - Number(store.wlMintsUsed)) ? Math.max(0, 10 - Number(store.wlMintsUsed)) : wlMintQty}</span>
                                                        <RetroBtn onClick={() => setWlMintQty(Math.min(10 - Number(store.wlMintsUsed), wlMintQty+1))} className="px-3 py-1"><Plus size={16}/></RetroBtn>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-black border-2 border-gray-600 shadow-inner p-2.5 flex justify-between items-center">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Cost</span>
                                                    <span className="font-mono font-black text-lg text-[#39ff14]">{totalWlEth} ETH</span>
                                                </div>
                                                <RetroBtn 
                                                    disabled={isWlDepleted || !hasEnoughWlEth} 
                                                    onClick={() => actionMint(true)} 
                                                    className={`w-full py-3 font-black text-sm uppercase shadow-[2px_2px_0px_#000] ${(isWlDepleted || !hasEnoughWlEth) ? 'bg-gray-400 text-gray-600 shadow-none border-2 border-gray-500' : 'bg-purple-300 hover:bg-purple-400 border-2 border-black'}`}
                                                >
                                                    {isWlDepleted ? "ALLOCATION DEPLETED" : !hasEnoughWlEth ? "INSUFFICIENT ETH" : "CONFIRM MINT"}
                                                </RetroBtn>
                                            </>
                                        )
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {wlNotStarted && !isWlSoldOut && (
                                                <div className="w-full bg-black border-2 border-gray-600 shadow-inner p-2 flex justify-between items-center mb-1">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">MINT OPENS</span>
                                                    <span className="font-mono font-bold text-sm text-yellow-400">{isWlScheduled ? wlCountdown : "TBD"}</span>
                                                </div>
                                            )}
                                            <RetroBtn 
                                                disabled={isWlSoldOut || !hasEnoughSpotEth} 
                                                onClick={actionBuyWhitelist} 
                                                className={`w-full py-4 font-black text-sm uppercase shadow-[2px_2px_0px_#000] ${(isWlSoldOut || !hasEnoughSpotEth) ? 'bg-gray-400 text-gray-600 shadow-none border-2 border-gray-500' : 'bg-yellow-300 hover:bg-yellow-400 border-2 border-black'}`}
                                            >
                                                {isWlSoldOut ? "SOLD OUT" : !hasEnoughSpotEth ? "INSUFFICIENT ETH" : `BUY WL SPOT (${String(store.wlSpotCostEthRaw)} ETH)`}
                                            </RetroBtn>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </RetroWindow>

                        {/* ========================================== */}
                        {/* PUBLIC MINT CARD */}
                        {/* ========================================== */}
                        <RetroWindow title="PUBLIC_MINT.EXE" className="w-full max-w-md flex-1" headerColor="from-blue-900 to-blue-600">
                            <div className="p-4 flex flex-col gap-4 h-full bg-[#c0c0c0]">
                                
                                {/* Header Banner */}
                                <div className="w-full bg-white border-2 border-gray-500 shadow-inner flex p-3 items-center gap-4">
                                    <div className="bg-blue-100 p-2 border border-blue-300 shadow-inner shrink-0">
                                        <Building size={36} className="text-blue-700"/>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h2 className="text-xl font-black uppercase tracking-tighter text-gray-800 leading-none mb-1">Public Offering</h2>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Standard Market Access</span>
                                    </div>
                                </div>
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <RetroInset className="p-2 bg-gray-100 flex flex-col items-center justify-center text-center shadow-inner">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase mb-0.5">Base Cost</span>
                                        <span className="font-mono font-black text-sm text-black">{String(store.gameCostEthDisplay)} ETH</span>
                                    </RetroInset>
                                    <RetroInset className="p-2 bg-gray-100 flex flex-col items-center justify-center text-center shadow-inner border-green-200 bg-green-50">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase mb-0.5">Required Burn</span>
                                        <span className="font-mono font-black text-sm text-green-700">{String(store.gameCostRentDisplay)} RENT</span>
                                    </RetroInset>
                                </div>
                                
                                {/* Information Pitch */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="text-[10px] text-gray-700 text-center uppercase font-bold px-3 py-2 leading-relaxed bg-white border border-gray-300 shadow-inner">
                                        Every public mint requires a dual transaction: a base ETH fee plus a $RENT token burn. The required $RENT is permanently destroyed to support the ecosystem's deflationary metrics.
                                    </div>
                                </div>
                                
                                {/* Control Deck */}
                                <div className="w-full mt-auto border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-gray-500 border-r-gray-500 bg-gray-200 p-3 flex flex-col gap-3 shadow-[2px_2px_4px_rgba(0,0,0,0.2)]">
                                    {pubNotStarted ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-red-600 uppercase animate-pulse">SYSTEM LOCKED</span>
                                                <span className="text-[9px] font-bold text-gray-500 uppercase">MINT OPENS IN:</span>
                                            </div>
                                            <div className="w-full bg-black border-2 border-gray-600 shadow-inner p-3 flex justify-center items-center">
                                                <span className="font-mono font-black text-2xl text-[#39ff14] tracking-widest">{isPubScheduled ? pubCountdown : "AWAITING TIME"}</span>
                                            </div>
                                            <RetroBtn disabled={true} className="w-full py-3 font-bold text-sm uppercase border-2 border-gray-500 bg-gray-300 text-gray-500 shadow-none mt-1">
                                                STANDBY
                                            </RetroBtn>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between bg-white border-2 border-gray-500 shadow-inner p-1.5 pl-3">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Quantity</span>
                                                <div className="flex items-center gap-3">
                                                    <RetroBtn onClick={() => setPublicMintQty(Math.max(1, publicMintQty-1))} className="px-3 py-1"><Minus size={16}/></RetroBtn>
                                                    <span className="font-bold text-xl font-mono w-6 text-center">{publicMintQty}</span>
                                                    <RetroBtn onClick={() => setPublicMintQty(Math.min(10, publicMintQty+1))} className="px-3 py-1"><Plus size={16}/></RetroBtn>
                                                </div>
                                            </div>
                                            <div className="w-full bg-black border-2 border-gray-600 shadow-inner p-2.5 flex justify-between items-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Total<br/>Cost</span>
                                                <div className="flex flex-col items-end leading-tight">
                                                    <span className="font-mono font-black text-base text-[#39ff14]">{totalPubEth} ETH</span>
                                                    <span className="font-mono font-bold text-[10px] text-yellow-400">+ {totalPubRent} RENT</span>
                                                </div>
                                            </div>
                                            
                                            {!canAffordPublic ? (
                                                <RetroBtn disabled={true} className="w-full bg-gray-400 text-gray-600 py-3 font-black text-sm uppercase border-2 border-gray-500 shadow-none">
                                                    {!hasEnoughPubEth && !hasEnoughPubRent ? "INSUFFICIENT ETH & RENT" : !hasEnoughPubEth ? "INSUFFICIENT ETH" : "INSUFFICIENT RENT"}
                                                </RetroBtn>
                                            ) : needsPubApproval ? (
                                                <RetroBtn onClick={() => actionApproveToken(CONFIG.GAME_NFT)} className="w-full bg-orange-300 hover:bg-orange-400 py-3 font-black text-sm uppercase border-2 border-black shadow-[2px_2px_0px_#000]">
                                                    AUTHORIZE RENT
                                                </RetroBtn>
                                            ) : (
                                                <RetroBtn onClick={() => actionMint(false)} className="w-full bg-blue-300 hover:bg-blue-400 py-3 font-black text-sm uppercase border-2 border-black shadow-[2px_2px_0px_#000]">
                                                    MINT PROPERTIES
                                                </RetroBtn>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </RetroWindow>
                    </div>
                </div>
            );
        })(),
        upgrades: (() => {
            const UPGRADE_PITCHES = [
    "Scatter some cheap gravel and drought-resistant weeds. Call it 'eco-chic' and hike the rent.",
    "Slap a fresh layer of 'landlord white' paint over the mold. Instant premium pricing.",
    "Seal them shut permanently. Tell tenants it lowers AC bills while boosting your net yield.",
    "Throttle a captive network monopoly and force residents to pay a mandatory monthly tech fee.",
    "Roll out the thinnest vinyl plank available. Looks like wood, bubbles when mopped. Charge a premium.",
    "Install a stainless-steel facade over a failing refrigerator. Culinary gentrification at its finest.",
    "Harvest grid credits directly to your offshore wallet while still charging tenants full utility rates.",
    "Throw a rusty treadmill in the basement. Introduce a non-negotiable monthly wellness surcharge.",
    "Nail untreated plywood to the fire escape. Market it as 'exclusive private outdoor living space'.",
    "Evict the feral cats, paint lines on the dirt, and charge exorbitant parking fees under threat of towing.",
    "Install cameras and remote thermostat overrides to ensure absolute surveillance and minimize utility overhead.",
    "Bolt a cheap flatscreen to the drywall and hook up a restricted cable box. Entertainment is mandatory.",
    "Dig a hole, fill it with over-chlorinated city water, and enforce a zero-guest policy. Add a pool tax.",
    "Subdivide the legally condemned shed out back into a micro-unit. Maximum density means maximum extraction.",
    "Claim access to the toxic drainage canal as a 'waterfront amenity'. Double the base rent.",
    "Add a sticky pool table and an arcade cabinet that eats quarters. Squeeze extra $RENT out of their free time.",
    "Fence off the only remaining patch of grass. Rent it back to them by the hour. Trespassers will be fined.",
    "Rebrand a windowless closet as a 'remote work hub'. Capitalize on work-from-home desperation.",
    "Lock the damp, leaky basement and lease it as 'climate-controlled luxury storage' for the new tax bracket.",
    "The ultimate corporate slumlord ascension. Maximum yield extraction from the highest point in the skyline."
];

            return (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="bg-black text-orange-400 p-2 text-[10px] font-mono border-b-4 border-double border-gray-600 shadow-inner flex justify-between shrink-0">
                        <span>{">"} UPGRADE_CATALOG.EXE</span>
                        <span>ACTIVE_TIER: {Number(store.upgLvl) + 1} / 20</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {store.allUpgrades.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <RefreshCw className="animate-spin text-orange-600" size={48}/>
                                <p className="font-bold text-xs uppercase text-gray-500">DOWNLOADING_CATALOG...</p>
                                <p className="text-[10px] text-gray-400">If this spins indefinitely, check developer console for ABI errors.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16">
                                {store.allUpgrades.map((upg, i) => {
                                    const isActive = i === Number(store.upgLvl);
                                    const isPast = i < Number(store.upgLvl);
                                    return (
                                        <RetroWindow key={i} title={`LVL_${i+1}::${isActive ? 'ACTIVE' : isPast ? 'ARCHIVED' : 'LOCKED'}`} headerColor={isActive ? 'from-orange-900 to-orange-600' : isPast ? 'from-gray-700 to-gray-500' : 'from-blue-900 to-blue-700'}>
                                            <div className={`p-4 flex flex-col items-center gap-3 h-full ${isActive ? 'bg-orange-50' : 'bg-gray-200'}`}>
                                                <div className={`w-20 h-20 shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-inner ${isActive ? 'bg-white border-orange-400' : 'bg-gray-300 border-gray-400'}`}>
                                                    {upg.image ? <img src={upg.image} alt={upg.name} className={`w-full h-full object-cover pixelated ${!isActive && !isPast ? 'grayscale opacity-40' : ''}`} /> : <Hammer size={32} className={`${isActive ? 'text-orange-600 drop-shadow-md' : 'text-gray-400 opacity-50'}`}/>}
                                                </div>
                                                
                                                <h4 className={`text-sm font-bold uppercase text-center leading-tight tracking-tighter h-10 flex items-center ${isActive ? 'text-black' : 'text-gray-500'}`}>
                                                    {upg.name}
                                                </h4>

                                                {/* --- DYNAMIC LORE PITCH --- */}
                                                <div className={`text-[9px] text-center uppercase font-bold px-2 py-1.5 leading-relaxed border shadow-inner mb-2 w-full flex-1 flex items-center justify-center ${isActive ? 'bg-white border-orange-200 text-orange-900' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                                    {UPGRADE_PITCHES[i] || "UNCLASSIFIED PROTOCOL. PROCEED WITH YIELD EXTRACTION."}
                                                </div>
                                                
                                                <RetroInset className={`w-full p-2 text-[10px] font-bold space-y-1.5 uppercase ${isActive ? 'bg-white border-black' : 'bg-gray-100 border-gray-400 text-gray-500'}`}>
                                                    <div className="flex justify-between"><span>YIELD:</span><span className={isActive ? "text-green-700" : ""}>+{upg.yield}</span></div>
                                                    <div className="flex justify-between"><span>ETH:</span><span className="font-mono">{upg.costEth}</span></div>
                                                    <div className="flex justify-between"><span>RENT:</span><span className="font-mono">{upg.costRent}</span></div>
                                                    <div className="flex justify-between border-t border-dashed border-gray-400 pt-1 mt-1"><span>AVAIL:</span><span className="font-mono">{upg.maxSupply - upg.minted} / {upg.maxSupply}</span></div>
                                                </RetroInset>
                                                
                                                <div className="mt-auto w-full pt-2 shrink-0">
                                                    {isActive ? (
                                                        (upg.maxSupply - upg.minted) <= 0 ? (
                                                            <div className="w-full bg-gray-400 text-center font-bold py-2 text-[10px] uppercase border-2 border-gray-500 text-gray-700 shadow-inner">INVENTORY DEPLETED</div>
                                                        ) : (() => {
                                                            const actualQty = Math.min(upgradeMintQty, upg.maxSupply - upg.minted, 10);
                                                            const totalEthRaw = parseFloat(upg.costEth) * actualQty;
                                                            const totalRentRaw = parseFloat(upg.costRent) * actualQty;
                                                            const totalEth = totalEthRaw.toFixed(4);
                                                            const totalRent = totalRentRaw.toFixed(2);
                                                            const hasEnoughEth = parseFloat(balances.eth || "0") >= totalEthRaw;
                                                            const hasEnoughRent = parseFloat(balances.rent || "0") >= totalRentRaw;
                                                            const canAfford = hasEnoughEth && hasEnoughRent;
                                                            const needsApproval = allowances.upgradeNFT < totalRentRaw;

                                                            return (
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center justify-between bg-white border-2 border-gray-400 shadow-inner p-1 pl-2">
                                                                        <span className="text-[9px] font-bold text-gray-500 uppercase">QTY</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <RetroBtn onClick={() => setUpgradeMintQty(Math.max(1, upgradeMintQty-1))} className="p-1 px-2"><Minus size={12}/></RetroBtn>
                                                                            <span className="font-bold text-sm font-mono w-4 text-center">{actualQty}</span>
                                                                            <RetroBtn onClick={() => setUpgradeMintQty(Math.min(10, upg.maxSupply - upg.minted, upgradeMintQty+1))} className="p-1 px-2"><Plus size={12}/></RetroBtn>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full bg-black border-2 border-gray-600 shadow-inner p-2 flex justify-between items-center">
                                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">Total<br/>Cost</span>
                                                                        <div className="flex flex-col items-end leading-tight">
                                                                            <span className="font-mono font-black text-xs text-[#39ff14]">{totalEth} ETH</span>
                                                                            <span className="font-mono font-bold text-[8px] text-yellow-400">+ {totalRent} RENT</span>
                                                                        </div>
                                                                    </div>
                                                                    {!canAfford ? (
                                                                        <RetroBtn disabled={true} className="w-full bg-gray-400 text-gray-600 py-2 text-[9px] font-black uppercase border-2 border-gray-500 shadow-none">
                                                                            {!hasEnoughEth && !hasEnoughRent ? "INSUF. ETH & RENT" : !hasEnoughEth ? "INSUFFICIENT ETH" : "INSUFFICIENT RENT"}
                                                                       </RetroBtn>
                                                                    ) : needsApproval ? (
                                                                        <RetroBtn onClick={() => actionApproveToken(CONFIG.UPGRADE_NFT)} className="w-full bg-yellow-300 hover:bg-yellow-400 py-2 text-[9px] border-2 border-black font-bold uppercase shadow-[2px_2px_0px_#000]">APPROVE RENT</RetroBtn>
                                                                    ) : (
                                                                        <RetroBtn onClick={actionBuyUpg} className="w-full bg-orange-300 hover:bg-orange-400 font-bold py-2 text-[10px] uppercase border-2 border-black shadow-[2px_2px_0px_#000]">ACQUIRE x{actualQty}</RetroBtn>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    ) : isPast ? (
                                                        <div className="w-full bg-gray-400 text-center font-bold py-2 text-[10px] uppercase border-2 border-gray-500 text-gray-700 shadow-inner">ARCHIVED</div>
                                                    ) : (
                                                        <div className="w-full bg-blue-200 text-center font-bold py-2 text-[10px] uppercase border-2 border-blue-400 text-blue-800 opacity-70 shadow-inner">AWAITING UNLOCK</div>
                                                    )}
                                                </div>
                                            </div>
                                        </RetroWindow>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        })(),
        skills: (() => {
            const availableToAllocate = Number(skills.avail || 0); 
            const lifetimeTotalOwned = Number(skills.totalOwned || 0);

            const nextPointCostRaw = BigInt(skills.nextCostRaw || "0");
            const divisor = BigInt(Math.pow(lifetimeTotalOwned + 1, 2));
            const baseCostBig = divisor > 0n ? nextPointCostRaw / divisor : 0n;
            
            let batchCostRaw = 0n;
            for(let i = 1; i <= skillBuyQty; i++) {
                batchCostRaw += baseCostBig * BigInt(Math.pow(lifetimeTotalOwned + i, 2));
            }

            const maxCanBuy = Math.max(0, 20 - lifetimeTotalOwned);
            const batchCostEth = parseFloat(formatEther(batchCostRaw));
            const totalBatchCostDisplay = batchCostEth.toFixed(2);

            const skillDefs = {
                f: { label: 'Fatigue Reduction', desc: 'Slows down property exhaustion. Each point reduces fatigue rate by 5%.', unit: '%', calc: (pts) => pts * 5 },
                y: { label: 'Yield Multiplier', desc: 'Boosts gross income. Each point adds a 5% multiplier to base earnings.', unit: '%', calc: (pts) => pts * 5 },
                t: { label: 'Tax Reduction', desc: 'Reduces protocol maintenance tax. Each point lowers tax by 3%.', unit: '%', calc: (pts) => pts * 3 },
                s: { label: 'Staking Expansion', desc: 'Increases your max staked property limit. Each point adds 2 slots.', unit: ' Slots', calc: (pts) => (pts * 2) + 10 }
            };

            return (
                <div className="flex flex-col xl:flex-row items-stretch justify-center w-full h-full p-4 gap-6 overflow-y-auto xl:overflow-hidden">
                    
                    {/* MODULE 1: PURCHASING INFLUENCE */}
                    <RetroWindow 
                        title="SKILL_ACQUISITION.EXE" 
                        className="flex-1 w-full max-w-2xl h-fit xl:h-full xl:overflow-y-auto shadow-[10px_10px_0px_#000]" 
                        headerColor="from-blue-900 to-blue-700"
                    >
                        <div className="p-4 space-y-6 h-full flex flex-col uppercase bg-[#c0c0c0]">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-center">
                                <RetroInset className="p-3 bg-blue-50 border-blue-200">
                                    <div className="text-[10px] text-blue-600 font-bold">SKILL POINTS OWNED</div>
                                    <div className="text-3xl font-black text-blue-900 mt-1">{lifetimeTotalOwned} <span className="text-sm text-blue-500">/ 20</span></div>
                                </RetroInset>
                                <RetroInset className="p-3 bg-green-50 border-green-200">
                                    <div className="text-[10px] text-green-600 font-bold">NEXT POINT COST</div>
                                    <div className="text-2xl font-black text-green-900 mt-2">
                                        {formatEther(nextPointCostRaw)} <span className="text-sm">ETH</span>
                                    </div>
                                </RetroInset>
                            </div>

                            <RetroInset className="p-5 bg-white flex flex-col items-center text-xs font-bold shadow-inner gap-5 border-2 border-dashed border-gray-400">
                                <div className="text-center">
                                    <span className="text-gray-500 text-[10px] tracking-widest">QUANTITY TO ACQUIRE</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <RetroBtn onClick={() => setSkillBuyQty(Math.max(1, skillBuyQty - 1))} className="p-2 px-5 bg-gray-200 hover:bg-gray-300"><Minus size={20}/></RetroBtn>
                                    <span className="font-black text-4xl font-mono w-12 text-center text-blue-700">{skillBuyQty}</span>
                                    <RetroBtn onClick={() => setSkillBuyQty(Math.min(maxCanBuy, skillBuyQty + 1))} className="p-2 px-5 bg-gray-200 hover:bg-gray-300"><Plus size={20}/></RetroBtn>
                                </div>
                                <div className="text-center border-t-2 border-gray-200 pt-3 w-full">
                                    <span className="text-[14px] text-green-700 font-mono font-black">TOTAL COST: {totalBatchCostDisplay} RENT</span>
                                </div>

                                {allowances.portfolio < batchCostEth ? (
                                    <RetroBtn 
                                        onClick={() => actionApproveToken(CONFIG.PORTFOLIO)} 
                                        className="w-full py-4 bg-yellow-300 border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_#000] hover:bg-yellow-400 mt-2"
                                    >
                                        <Zap size={16} className="fill-current mr-2"/> AUTHORIZE RENT
                                    </RetroBtn>
                                ) : (
                                    <RetroBtn 
                                        disabled={maxCanBuy === 0 || skillBuyQty <= 0} 
                                        onClick={async () => {
                                            const success = await executeTx(() => contracts.portfolio.purchaseSkillPoints(skillBuyQty), "SKILL POINTS PURCHASED");
                                            if (success) setSkillBuyQty(1);
                                        }} 
                                        className={`w-full py-4 border-2 border-black font-black uppercase text-sm mt-2 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none ${maxCanBuy === 0 ? 'bg-gray-400 text-gray-600 shadow-none' : 'bg-blue-400 text-white hover:bg-blue-500 shadow-[4px_4px_0px_#000]'}`}
                                    >
                                        {maxCanBuy === 0 ? 'MAX LEVEL REACHED' : 'PURCHASE POINTS'}
                                    </RetroBtn>
                                )}
                            </RetroInset>

                            <div className="mt-auto pt-4">
                                <div className="text-[10px] text-gray-800 font-black uppercase mb-2 tracking-widest text-center border-b-2 border-black pb-1">
                                    Skill Point Cost Projection
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: 20 }, (_, i) => {
                                        const lvl = i + 1;
                                        const cost = 50 * Math.pow(lvl, 2);
                                        const isOwned = lifetimeTotalOwned >= lvl;
                                        const isNext = lifetimeTotalOwned + 1 === lvl;
                                        
                                        return (
                                            <div 
                                                key={lvl} 
                                                className={`flex flex-col items-center justify-center py-2 px-1 border-2 text-[9px] font-mono transition-colors
                                                    ${isOwned ? 'bg-green-200 border-green-600 text-green-900 opacity-50' : 
                                                      isNext ? 'bg-yellow-300 border-yellow-600 text-yellow-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] scale-105 z-10 font-black' : 
                                                      'bg-white border-gray-400 text-gray-500 shadow-inner'}`}
                                            >
                                                <span className="font-black text-[9px] mb-0.5 opacity-60">L{lvl}</span>
                                                <span>{cost}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </RetroWindow>

                    {/* MODULE 2: ALLOCATING INFLUENCE */}
                    <RetroWindow 
                        title="SKILL_ALLOCATION_DESK.SYS" 
                        className="flex-[1.5] w-full max-w-3xl h-fit xl:h-full xl:overflow-y-auto shadow-[10px_10px_0px_#000]" 
                        headerColor="from-yellow-700 to-yellow-500"
                    >
                        <div className="p-4 space-y-5 h-full flex flex-col uppercase bg-[#c0c0c0]">
                            
                            {/* Unallocated Points Display */}
                            <div className="bg-black text-[#39ff14] p-6 border-4 border-gray-700 shadow-inner flex flex-col items-center justify-center">
                                <span className="text-gray-400 text-xs mb-1 font-bold tracking-widest">UNALLOCATED SKILL POINTS</span>
                                <span className="text-6xl font-black font-mono drop-shadow-[0_0_12px_rgba(57,255,20,0.6)]">
                                    {availableToAllocate}
                                </span>
                                <span className="text-[10px] text-green-700 mt-2 font-black tracking-widest">AVAILABLE FOR DEPLOYMENT</span>
                            </div>

                            {/* Skill Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                {Object.entries(skillDefs).map(([key, def]) => (
                                    <div key={key} className="bg-white border-2 border-black p-3 flex flex-col gap-3 shadow-[4px_4px_0px_#000]">
                                        <div className="flex justify-between items-start border-b-2 border-gray-200 pb-2">
                                            <div className="flex flex-col pr-2">
                                                <span className="text-blue-900 font-black text-sm tracking-tighter">{def.label}</span>
                                                <span className="text-[9px] text-gray-500 lowercase italic leading-tight mt-1">{def.desc}</span>
                                            </div>
                                            <div className="flex flex-col items-center shrink-0">
                                                <span className="text-2xl bg-black text-yellow-400 px-3 py-1 font-mono border-2 border-gray-600 shadow-inner">
                                                    {String(skills[key] + skills.draft[key])}<span className="text-sm text-gray-500">/5</span>
                                                </span>
                                                {skills.draft[key] > 0 && <span className="text-[9px] text-blue-500 font-black mt-1 animate-pulse">+{skills.draft[key]} PENDING</span>}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center bg-gray-100 p-2 border border-gray-300 shadow-inner mt-auto">
                                            <div className="flex flex-col text-[10px] font-mono">
                                                <div className="text-gray-500">ACTIVE: <span className="text-black font-black text-xs">{def.calc(skills[key])}{def.unit}</span></div>
                                                {(skills[key] + skills.draft[key]) < 5 && (
                                                    <div className="text-blue-700 font-bold mt-0.5">NEXT: <span>{def.calc(skills[key] + skills.draft[key] + 1)}{def.unit}</span></div>
                                                )}
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button 
                                                    onClick={() => {
                                                        if (skills.draft[key] > 0) {
                                                            setSkills(p => ({...p, draft: {...p.draft, [key]: p.draft[key] - 1}}));
                                                        }
                                                    }} 
                                                    className="w-10 h-8 border-2 border-black bg-gray-300 text-black font-black text-lg shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none hover:bg-gray-400 flex items-center justify-center"
                                                >-</button>
                                                <button 
                                                    onClick={() => {
                                                        const currentDraftTotal = skills.draft.f + skills.draft.y + skills.draft.t + skills.draft.s;
                                                        if (currentDraftTotal < availableToAllocate && (skills[key] + skills.draft[key]) < 5) {
                                                            setSkills(p => ({...p, draft: {...p.draft, [key]: p.draft[key] + 1}}));
                                                        }
                                                    }} 
                                                    className="w-10 h-8 border-2 border-black bg-gray-300 text-black font-black text-lg shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none hover:bg-gray-400 flex items-center justify-center"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Action Footer */}
                            <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t-2 border-black border-dashed">
                                <RetroBtn 
                                    onClick={() => setSkills(p => ({...p, draft: { f: 0, y: 0, t: 0, s: 0 }}))} 
                                    className="flex-1 bg-red-200 py-4 font-black border-2 border-black text-sm hover:bg-red-300 shadow-[4px_4px_0px_#000]"
                                >
                                    RESET SKILLS
                                </RetroBtn>
                                <RetroBtn 
                                    onClick={actionSaveSkills} 
                                    className="flex-[2] bg-green-400 py-4 font-black text-base border-2 border-black uppercase shadow-[4px_4px_0px_#000] hover:bg-green-500"
                                >
                                    CONFIRM ALLOCATION
                                </RetroBtn>
                            </div>
                        </div>
                    </RetroWindow>
                </div>
            );
        })(),
        swap: (() => {
            const isBuy = swapMode === 'buy';
            const needsApproval = isBuy 
                ? allowances.wavaxRouter < (parseFloat(payAmount) || 1000000)
                : allowances.router < (parseFloat(payAmount) || 1000000);
            
            const isInvalidInput = !payAmount || Number(payAmount) <= 0;
            const isSwapDisabled = isInvalidInput || needsApproval;

            return (
                <div className="flex flex-col items-center justify-center h-full p-4 gap-4 overflow-y-auto">
                    <div className="w-full max-w-md space-y-4">
                        
                        {/* MARKET ORACLE UI */}
                        <RetroWindow title="MARKET_ORACLE.SYS" headerColor="from-blue-900 to-blue-700">
                            <div className="p-6 bg-black text-[#39ff14] font-mono uppercase shadow-inner text-center flex flex-col items-center justify-center border-b-4 border-gray-800">
                                <div className="text-gray-400 text-xs mb-1 font-bold tracking-widest">$RENT / WAVAX</div>
                                <div className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                                    {pairInfo.price}
                                </div>
                                <div className="text-lg text-green-400 mt-3 font-bold bg-green-900/30 px-4 py-1 rounded">
                                    ≈ ${pairInfo.priceUsd} USD
                                </div>
                                <div className="pt-4 text-[9px] text-gray-500 italic animate-pulse">[ AUTO_SYNC: 15S ]</div>
                            </div>
                        </RetroWindow>

                        {/* TWO-WAY DEX UI */}
                        <RetroWindow title="LIQUIDITY_ROUTER" headerColor="from-red-900 to-red-600">
                            <div className="p-4 space-y-4 uppercase bg-[#c0c0c0]">
                                
                                <div className="bg-white border-2 border-gray-500 p-3 shadow-inner focus-within:border-black transition-colors">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2">
                                        <span>YOU PAY</span>
                                        <span className="font-mono">BAL: {swapMode === 'sell' ? balances.rent : balances.wavax}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={payAmount} 
                                            onChange={(e) => {
                                                setLastEdit('pay');
                                                setPayAmount(e.target.value);
                                            }} 
                                            className="w-full text-2xl font-mono outline-none bg-transparent" 
                                            placeholder="0.0"
                                        />
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button 
                                                onClick={() => { 
                                                    setLastEdit('pay');
                                                    if (swapMode === 'sell') setPayAmount(balances.rent); 
                                                    else setPayAmount(balances.wavax); 
                                                }} 
                                                className="bg-gray-200 border border-black px-2 py-1 font-bold text-[10px] active:shadow-inner hover:bg-gray-300"
                                            >
                                                MAX
                                            </button>
                                            <span className="font-black text-lg">{swapMode === 'sell' ? "$RENT" : "WAVAX"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center -my-6 z-10 relative">
                                    <button 
                                        onClick={() => { 
                                            setSwapMode(swapMode === 'sell' ? 'buy' : 'sell'); 
                                            setPayAmount(""); 
                                            setReceiveAmount(""); 
                                            setLastEdit("pay");
                                        }} 
                                        className="bg-gray-200 border-2 border-black p-1.5 shadow-[2px_2px_0px_#000] hover:bg-gray-300 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all"
                                    >
                                        <ArrowDown size={16} className="text-black font-bold"/>
                                    </button>
                                </div>

                                <div className="bg-gray-100 border-2 border-gray-500 p-3 shadow-inner mt-2 focus-within:bg-white focus-within:border-black transition-colors">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2">
                                        <span>YOU RECEIVE (EST.)</span>
                                        <span className="font-mono">BAL: {swapMode === 'sell' ? balances.wavax : balances.rent}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={receiveAmount} 
                                            onChange={(e) => {
                                                setLastEdit('receive');
                                                setReceiveAmount(e.target.value);
                                            }} 
                                            className="w-full text-2xl font-mono outline-none bg-transparent" 
                                            placeholder="0.0"
                                        />
                                        <span className="font-black text-lg shrink-0">{swapMode === 'sell' ? "WAVAX" : "$RENT"}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    {needsApproval && (
                                        <RetroBtn 
                                            onClick={() => {
                                                if (swapMode === 'sell') {
                                                    executeTx(() => contracts.token.approve(CONFIG.ROUTER, getMaxUint()), "ROUTER AUTHORIZED FOR RENT");
                                                } else {
                                                    const wContract = new window.ethers.Contract(CONFIG.WETH, ABIS.TOKEN, signer);
                                                    executeTx(() => wContract.approve(CONFIG.ROUTER, getMaxUint()), "ROUTER AUTHORIZED FOR WAVAX");
                                                }
                                            }} 
                                            className="bg-yellow-300 py-3 font-black text-sm uppercase shadow-[4px_4px_0px_#000] hover:bg-yellow-400"
                                        >
                                            1. AUTHORIZE ROUTER
                                        </RetroBtn>
                                    )}
                                    <RetroBtn 
                                        onClick={actionSwap} 
                                        disabled={isSwapDisabled}
                                        className={`py-4 font-black text-sm shadow-[4px_4px_0px_#000] uppercase ${isSwapDisabled ? 'bg-gray-400 text-gray-600' : swapMode === 'sell' ? 'bg-red-400 text-white hover:bg-red-500' : 'bg-green-400 text-black hover:bg-green-500'}`}
                                    >
                                        {swapMode === 'sell' ? (needsApproval ? "AWAITING APPROVAL" : "SWAP RENT FOR WAVAX") : "SWAP WAVAX FOR RENT"}
                                    </RetroBtn>
                                </div>

                                <div className="mt-2 pt-2 border-t border-gray-400 text-center">
                                    <a href="https://dexscreener.com/avalanche/usdc" target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 hover:underline font-bold">{">"} VIEW USDC/STABLE REFERENCE CHART</a>
                                </div>
                            </div>
                        </RetroWindow>
                    </div>
                </div>
            );
        })()
    };

    return (
        <div className="min-h-screen md:h-screen flex flex-col bg-[#008080] text-black overflow-x-hidden font-mono" style={{backgroundImage: 'linear-gradient(45deg, #008080 25%, #006060 25%, #006060 50%, #008080 50%, #008080 75%, #006060 75%, #006060 100%)', backgroundSize: '4px 4px'}}>
            <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-50 opacity-10"></div>
            <div className="w-full bg-[#c0c0c0] border-t-2 border-white p-1 flex justify-between items-center z-40 fixed md:absolute bottom-0 left-0 shadow-[0_-2px_5px_rgba(0,0,0,0.3)] shrink-0">
                <div className="flex items-center gap-1"><RetroBtn className="px-4 border-2 border-black font-bold uppercase"><Square className="text-blue-800" fill="currentColor" size={12}/> START</RetroBtn><RetroInset className="hidden md:block px-3 py-0.5 text-[10px] font-bold bg-gray-200 uppercase tracking-tighter border-2 border-black shadow-inner">SLUMLORDS_OS_V1.1</RetroInset></div>
                <div className="flex items-center gap-2">{txPending && <div className="bg-yellow-300 border-2 border-black px-3 py-0.5 text-[10px] font-bold animate-pulse uppercase">TX_PENDING...</div>}<div className="px-4 py-0.5 bg-black text-[#39ff14] font-bold text-[11px] overflow-hidden border-2 border-gray-700 shadow-inner font-mono">{currentTime}</div><button onClick={() => connectWallet(false)} className={`retro-btn border-2 border-black px-4 py-1 flex items-center gap-2 font-bold uppercase ${address ? 'bg-green-100' : 'bg-[#c0c0c0] shadow-[inset_1px_1px_0px_#fff]'}`}><Plug size={16} className={address ? 'text-green-600' : 'text-red-600'}/><span className="text-[11px]">{address ? `${address.slice(0,6)}...` : "CONNECT_NODE"}</span></button></div>
            </div>
            <main className="flex-1 p-2 md:p-4 pb-16 md:pb-4 overflow-y-auto flex flex-col md:flex-row gap-4 relative z-10 min-h-0 text-black">
                {!address ? (
                    <div className="flex-1 flex items-center justify-center w-full h-full p-4"><RetroWindow title="LOGIN.EXE" className="w-full max-w-lg shadow-[10px_10px_0px_#000]" headerColor="from-[#000080] to-[#1084d0]"><div className="p-8 flex flex-col items-center gap-6 bg-gray-200 text-center"><div className="bg-black text-[#39ff14] p-4 font-mono text-xs text-left w-full shadow-inner border-2 border-gray-600 mb-2 leading-relaxed">{">"} SYSTEM BOOT SEQUENCE INITIATED...<br/>{">"} LOADING PROTOCOLS... OK.<br/>{">"} CHECKING CREDENTIALS...<br/>{">"} ERROR: NO WEB3 NODE DETECTED.<br/><span className="animate-pulse">_</span></div><div><h2 className="text-3xl font-bold uppercase tracking-widest mb-2">Slumlords OS</h2><p className="text-sm font-bold text-gray-600 uppercase">Connect your wallet to access the asset management dashboard.</p></div><RetroBtn onClick={() => connectWallet(false)} className="w-full bg-green-200 py-4 text-lg border-2 border-black font-bold uppercase mt-2"><Plug size={20}/> INITIALIZE CONNECTION</RetroBtn></div></RetroWindow></div>
                ) : (
                    <><aside className="w-full md:w-64 flex flex-col gap-4 shrink-0"><RetroWindow title="DISK_DRIVE::C"><div className="flex flex-col gap-1 bg-white p-1 border-2 border-gray-400 shadow-inner">{[
                        { id: 'dashboard', icon: <Activity size={16}/>, label: 'Dashboard' },
                        { id: 'finance', icon: <Database size={16}/>, label: 'Finance' },
                        { id: 'portfolio', icon: <Building size={16}/>, label: 'Portfolio' },
                        { id: 'mint', icon: <FileSignature size={16}/>, label: 'Mint' },
                        { id: 'upgrades', icon: <Hammer size={16}/>, label: 'Upgrades' },
                        { id: 'skills', icon: <Scale size={16}/>, label: 'Skills' },
                        { id: 'swap', icon: <DollarSign size={16}/>, label: 'Swap' }
                    ].map(nav => (<RetroBtn key={nav.id} active={view === nav.id} onClick={() => setView(nav.id)} className="w-full justify-start py-2 px-4 shadow-none border-transparent hover:border-black font-bold uppercase">{nav.icon} {nav.label}</RetroBtn>))}</div></RetroWindow>
                    
                    <RetroWindow title="OS_METRICS" className="flex-1 min-h-[300px]">
                        <div className="bg-gray-200 flex-1 flex flex-col space-y-2 text-sm border-2 border-gray-400 p-2 shadow-inner h-full">
                            
                            {/* NEW RECEIPT STYLE P&L LEDGER */}
                            <RetroInset className="p-3 bg-[#fdfdfd] text-gray-900 font-bold space-y-1 text-[10px] overflow-hidden uppercase shadow-inner border-2 border-gray-400 font-mono leading-tight">
                                <div className="text-center font-black tracking-widest border-b-2 border-dashed border-gray-400 pb-1 mb-1">ASSET_LEDGER</div>
                                <div className="flex justify-between"><span>ETH / AVAX:</span> <span>{String(balances.eth)}</span></div>
                                <div className="flex justify-between"><span>WETH / WAVAX:</span> <span>{String(balances.wavax)}</span></div>
                                <div className="flex justify-between"><span>LIQUID $RENT:</span> <span>{String(balances.rent)}</span></div>
                                <div className="flex justify-between text-green-700 mt-1 pt-1 border-t border-dashed border-gray-400"><span>ORACLE PRICE:</span> <span>${pairInfo.priceUsd}</span></div>
                                
                                <div className="text-center font-black tracking-widest border-b-2 border-t-2 border-dashed border-gray-400 py-1 mt-2 mb-1">24H P&L RECEIPT</div>
                                <div className="flex justify-between text-gray-600"><span>GROSS YIELD:</span> <span>{String(stats.baseYield)}</span></div>
                                <div className="flex justify-between text-red-600"><span>FATIGUE DECAY:</span> <span>-{String(stats.fatigue)}%</span></div>
                                <div className="flex justify-between text-red-600"><span>MAINT. TAX:</span> <span>-{String(stats.tax)}%</span></div>
                                <div className="flex justify-between font-black text-[11px] mt-1 pt-1 border-t border-dashed border-gray-400"><span>NET TAKE-HOME:</span> <span className="text-green-600">{String(stats.totalYield)}</span></div>
                            </RetroInset>

                            <RetroInset className="flex-1 p-2 text-[10px] overflow-y-auto bg-black text-[#39ff14] flex flex-col justify-end min-h-[100px] border-2 border-gray-700 font-mono text-left lowercase shadow-inner">{logs.map((l, i) => <div key={i}>{l}</div>)}<div className="animate-pulse">_</div></RetroInset>
                        </div>
                    </RetroWindow>

                    </aside><RetroWindow title={`SYSTEM::C:\\EXECUTABLES\\${view.toUpperCase()}.EXE`} className="flex-1 shadow-[8px_8px_0px_#000] relative bg-[#008080] overflow-hidden min-h-[500px]" headerColor="from-gray-700 to-black"><div className="flex-1 overflow-y-auto flex flex-col bg-inherit p-2 min-h-0 h-full">{views[view]}</div>{loading && <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-center justify-center p-4"><div className="retro-window p-10 text-center max-w-xs bg-gray-200 border-4 border-black shadow-[10px_10px_0px_#000]"><RefreshCw className="animate-spin mx-auto mb-4 text-black" size={40}/> <p className="font-bold text-sm uppercase tracking-widest text-black">SYNCHRONIZING...</p></div></div>}</RetroWindow></>
                )}
            </main>
            {upgradeModalBaseId && (() => {
                const selectedNFT = nfts.staked.find(n => n.id === upgradeModalBaseId);
                const maxSlots = selectedNFT ? (selectedNFT.tier === 0 ? 2 : selectedNFT.tier === 1 ? 3 : 4) : 0;
                const attached = selectedNFT?.attachedUpgrades || [];
                const listToRender = upgModalTab === 'wallet' ? nfts.upgrades : attached;
                const toggleSelection = (id) => { if (selectedModalUpgIds.includes(id)) { setSelectedModalUpgIds(prev => prev.filter(u => u !== id)); } else { if (upgModalTab === 'wallet' && selectedModalUpgIds.length >= (maxSlots - attached.length)) return; setSelectedModalUpgIds(prev => [...prev, id]); } };
                const executeModalTx = async (isAttach) => { const ids = selectedModalUpgIds.map(id => BigInt(id)); const baseId = BigInt(upgradeModalBaseId); const action = isAttach ? () => contracts.portfolio.attachUpgradesToBaseToken(baseId, ids) : () => contracts.portfolio.detachUpgradesFromBaseToken(baseId, ids); const success = await executeTx(action, isAttach ? "UPGRADES ATTACHED" : "UPGRADES DETACHED"); if (success) { setSelectedModalUpgIds([]); setUpgradeModalBaseId(null); } };
                return (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-[10px]">
                        <RetroWindow title="RENOVATION_MODULE.SYS" className="max-w-md w-full bg-gray-200 shadow-[10px_10px_0px_#000]">
                            <div className="p-4 space-y-4 uppercase">
                                <div className="flex justify-between items-center border-b-2 border-black pb-2"><div><p className="font-bold text-black text-sm">PROPERTY #{String(upgradeModalBaseId)}</p>{selectedNFT && (<p className={`text-[10px] font-bold mt-0.5 ${attached.length >= maxSlots ? 'text-red-600' : 'text-blue-800'}`}>SLOTS: {attached.length}/{maxSlots} {attached.length >= maxSlots ? '(MAX CAPACITY)' : ''}</p>)}</div><RetroBtn onClick={() => {setUpgradeModalBaseId(null); setSelectedModalUpgIds([]);}} className="px-3 py-1 text-lg border-2 border-black font-bold">X</RetroBtn></div>
                                <div className="flex gap-2"><RetroBtn active={upgModalTab === 'wallet'} onClick={() => { setUpgModalTab('wallet'); setSelectedModalUpgIds([]); }} className="flex-1 font-bold">IN STORAGE</RetroBtn><RetroBtn active={upgModalTab === 'attached'} onClick={() => { setUpgModalTab('attached'); setSelectedModalUpgIds([]); }} className="flex-1 font-bold">INSTALLED</RetroBtn></div>
                                <RetroInset className="h-64 overflow-y-auto p-2 bg-white font-bold space-y-2 text-black border-2 border-black shadow-inner relative">{listToRender.length === 0 ? (<div className="flex items-center justify-center h-full text-gray-400 italic text-center uppercase tracking-widest">{upgModalTab === 'wallet' ? "NO UPGRADES IN STORAGE." : "NO UPGRADES INSTALLED."}</div>) : (listToRender.map(u => { const isSelected = selectedModalUpgIds.includes(u.id); return (<div key={u.id} onClick={() => toggleSelection(u.id)} className={`flex items-center gap-3 border-b-2 pb-2 p-2 cursor-pointer transition-all border-2 ${isSelected ? 'bg-blue-100 border-blue-600 scale-95 shadow-inner' : 'bg-gray-50 border-transparent hover:border-gray-400'}`}><div className="w-10 h-10 bg-gray-200 border border-gray-400 shrink-0">{u.image ? <img src={u.image} alt="" className="w-full h-full object-cover pixelated" /> : <ImageIcon size={20} className="m-auto mt-2 opacity-20"/>}</div><div className="flex-1 min-w-0"><div className="truncate">#{String(u.id)} {String(u.name)}</div><div className="text-green-600 text-[8px] font-mono">+{String(u.boost)} YIELD</div></div>{isSelected && <Check size={16} className="text-blue-600 mr-2 shrink-0"/>}</div>);}))}</RetroInset>
                                <div className="flex flex-col gap-2 mt-2"><div className="flex justify-between items-center bg-gray-300 p-2 border-2 border-black"><span className="font-bold">SELECTED: {selectedModalUpgIds.length}</span>{upgModalTab === 'wallet' ? (<RetroBtn disabled={selectedModalUpgIds.length === 0 || !nftApprovals.upgrade} onClick={() => executeModalTx(true)} className={`px-6 py-2 border-2 border-black font-bold ${selectedModalUpgIds.length > 0 && nftApprovals.upgrade ? 'bg-green-300' : 'bg-gray-400 text-gray-600'}`}>ATTACH</RetroBtn>) : (<RetroBtn disabled={selectedModalUpgIds.length === 0} onClick={() => executeModalTx(false)} className={`px-6 py-2 border-2 border-black font-bold ${selectedModalUpgIds.length > 0 ? 'bg-red-300' : 'bg-gray-400 text-gray-600'}`}>DETACH</RetroBtn>)}</div>{upgModalTab === 'wallet' && (<RetroBtn onClick={() => executeTx(() => contracts.upgradeNFT.setApprovalForAll(CONFIG.PORTFOLIO, true), "UPGRADES APPROVED")} className={`w-full py-2 border-2 border-black font-bold uppercase ${nftApprovals.upgrade ? 'bg-gray-300 text-gray-500' : 'bg-yellow-300 hover:bg-yellow-400'}`}>{nftApprovals.upgrade ? '✓ CONTRACT AUTHORIZED' : 'AUTHORIZE CONTRACT'}</RetroBtn>)}</div>
                            </div>
                        </RetroWindow>
                    </div>
                );
            })()}
        </div>
    );
}