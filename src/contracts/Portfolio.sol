// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

interface IGameNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function getTokenYield(uint256 tokenId) external view returns (uint256);
    function getTierLevel(uint256 tokenId) external view returns (uint8);
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function getZone(uint256 tokenId) external view returns (string memory);
}

interface IUpgradeNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function getUpgradeInfoByTokenId(uint256 tokenId) external view returns (uint256 level, string memory name, uint256 yieldIncrease);
}

interface IGameToken {
    function mint(address to, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

interface IWNATIVE {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract Portfolio is Ownable {
    struct StakeInfo {
        address owner;
        uint256 tokenId;
        uint256 stakedAt;
        uint256 lastClaimed;
        uint256 fatigueBps; 
        uint256 lastFatigueUpdate; 
    }

    struct FatigueConsumable {
        uint256 activeUntil; 
        uint256 fatigueReductionBps; 
    }

    struct YieldConsumable {
        uint256 activeUntil;
        uint256 yieldBoostBps;
    }

    struct SkillAllocation {
        uint8 fatigueReduction; 
        uint8 yieldBoost;       
        uint8 taxReduction;     
        uint8 stakingExpansion; 
    }

    struct ZoneModifiers {
        int256 yieldBps;       
        int256 fatigueBps;     
        int256 maintenanceBps; 
    }

    struct PairingModifiers {
        int256 yieldBps;
        int256 fatigueBps;
        int256 maintenanceBps;
    }

    address payable private brokerageAddress;
    address private wnative;
    IUniswapV2Router02 private router;

    IGameNFT private gameNFT;
    IGameToken private gameToken;
    IUpgradeNFT private upgradeNFT;

    mapping(uint256 => StakeInfo) private stakes;
    mapping(address => FatigueConsumable) private activeFatigueConsumables;
    mapping(address => YieldConsumable) private activeYieldConsumables;
    mapping(address => SkillAllocation) private skillAllocations;
    mapping(address => uint256) public totalSkillPoints;
    mapping(uint256 => uint256[]) private baseTokenUpgrades;
    mapping(uint256 => uint256) private upgradeToBaseToken;
    mapping(string => ZoneModifiers) private zoneModifiers;
    mapping(bytes32 => PairingModifiers) private pairingModifiers;

    uint256 private constant MAX_FATIGUE_BPS = 9900; 
    uint256 private constant FATIGUE_RATE_PER_SECOND_BPS = 764; 
    uint256 private constant SECONDS_IN_A_DAY = 86400;

    uint256 private constant FATIGUE_CONSUMABLE_COST_BPS = 2500;
    uint256 private constant FATIGUE_CONSUMABLE_DURATION = 86400;
    uint256 private constant FATIGUE_BASE_REDUCTION_BPS = 1000; 

    uint256 private constant YIELD_BASE_BOOST_BPS = 2000;
    uint256 private constant YIELD_PER_SKILL_POINT_BPS = 500;
    uint256 private constant YIELD_CONSUMABLE_DURATION = 86400;
    uint256 private constant YIELD_CONSUMABLE_COST_BPS = 1500;

    uint256 private constant BASE_COST = 50 * 10**18; 
    uint256 private constant RESET_COST_MULTIPLIER_BPS = 20000;
    uint256 private constant PER_POINT_BONUS_BPS = 500;
    uint256 private constant MAX_SKILL_POINTS = 20;

    uint256 private constant BASE_MAX_STAKED_NFTS = 10;
    uint256 private constant STAKING_LIMIT_PER_POINT = 2;
    uint8 private constant MAX_SKILL_POINTS_STAKING = 5;

    event Staked(address indexed owner, uint256[] tokenIds, uint256 timestamp);
    event Unstaked(address indexed owner, uint256[] tokenIds, uint256 timestamp);
    event YieldClaimed(address indexed owner, uint256 amount);
    event FatigueReset(address indexed owner, uint256 totalResetFee);
    event FatigueConsumableActivated(address indexed user, uint256 fatigueReduction, uint256 duration);
    event TokensBurned(address indexed user, uint256 amount);
    event SkillPointsPurchased(address indexed user, uint256 pointsPurchased, uint256 totalCost);
    event SkillPointsReset(address indexed user, uint256 resetFee);
    event YieldConsumableActivated(address indexed user, uint256 yieldBoostBps, uint256 duration);
    event UpgradeStaked(address indexed owner, uint256 indexed baseTokenId, uint256 indexed upgradeId);
    event UpgradeUnstaked(address indexed owner, uint256 indexed baseTokenId, uint256 indexed upgradeId);
    event SkillPointsAllocated(address indexed user, uint8 fatiguePoints, uint8 yieldPoints, uint8 taxPoints, uint8 stakingPoints);

    constructor(
        address _gameToken,
        address _gameNFT,
        address _upgradeNFT,
        address payable _brokerageAddress,
        address _router,
        address _wnative
    ) Ownable(msg.sender) {
        gameToken = IGameToken(_gameToken);
        gameNFT = IGameNFT(_gameNFT);
        upgradeNFT = IUpgradeNFT(_upgradeNFT);
        brokerageAddress = _brokerageAddress;
        router = IUniswapV2Router02(_router);
        wnative = _wnative;

        // Initialize zones with default values
        zoneModifiers["Foreclosure Fields"] = ZoneModifiers(1000, 1000, 1500);    
        zoneModifiers["Eviction Alley"] = ZoneModifiers(-1500, 0, -1500);        
        zoneModifiers["Gentrification Gardens"] = ZoneModifiers(2000, 1500, 1000);  
        zoneModifiers["Mortgage Mountain"] = ZoneModifiers(1000, 500, 2000);          
        zoneModifiers["Rentpayer's Ravine"] = ZoneModifiers(500, 1000, 500);          
        zoneModifiers["Subprime Suburbia"] = ZoneModifiers(1000, 500, 2500);   
        zoneModifiers["Default Desert"] = ZoneModifiers(-1000, -500, -1000);   
        zoneModifiers["Landlord Lagoon"] = ZoneModifiers(1500, 1000, 2000);        
        zoneModifiers["Tax Haven Terrace"] = ZoneModifiers(500, -1000, 1000);      
        zoneModifiers["Tenant's Trap Canyon"] = ZoneModifiers(-1000, -2000, -500);      
        zoneModifiers["Speculation Springs"] = ZoneModifiers(2500, 1500, 2000);          
        zoneModifiers["Repossession Ridge"] = ZoneModifiers(1000, 1000, 1000);        

        // Initialize pairing modifiers directly
        pairingModifiers[_getPairingKey("Foreclosure Fields", "Landlord Lagoon")] = PairingModifiers(1000, 0, 0);
        pairingModifiers[_getPairingKey("Eviction Alley", "Tax Haven Terrace")] = PairingModifiers(0, 0, -500);
        pairingModifiers[_getPairingKey("Gentrification Gardens", "Tenant's Trap Canyon")] = PairingModifiers(0, -1000, 0);
        pairingModifiers[_getPairingKey("Mortgage Mountain", "Speculation Springs")] = PairingModifiers(500, 0, -500);
        pairingModifiers[_getPairingKey("Rentpayer's Ravine", "Repossession Ridge")] = PairingModifiers(1500, 0, 0);
        pairingModifiers[_getPairingKey("Subprime Suburbia", "Default Desert")] = PairingModifiers(0, -1000, -500);
    }
    
    // --- SAFE MATH HELPER ---
    function _applyPercentageModifier(uint256 amount, int256 modifierBps) internal pure returns (uint256) {
        if (modifierBps == 0) return amount;
        if (modifierBps > 0) {
            return (amount * (10000 + uint256(modifierBps))) / 10000;
        } else {
            int256 adjusted = int256(amount) + (int256(amount) * modifierBps) / 10000;
            return adjusted < 0 ? 0 : uint256(adjusted);
        }
    }

    // --- CORE STAKING & CLAIMING ---

    function getStakedTokens(address player) public view returns (uint256[] memory) {
        uint256 stakedCount = 0;
        uint256 totalStaked = gameNFT.balanceOf(address(this));
        for (uint256 i = 0; i < totalStaked; i++) {
            uint256 tokenId = gameNFT.tokenOfOwnerByIndex(address(this), i);
            if (stakes[tokenId].owner == player) {
                stakedCount++;
            }
        }

        uint256[] memory tokenIds = new uint256[](stakedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < totalStaked; i++) {
            uint256 tokenId = gameNFT.tokenOfOwnerByIndex(address(this), i);
            if (stakes[tokenId].owner == player) {
                tokenIds[index] = tokenId;
                index++;
            }
        }

        return tokenIds;
    }

    function stake(uint256[] calldata tokenIds) external {
        require(gameNFT.isApprovedForAll(msg.sender, address(this)), "Approval required");

        uint256 currentStaked = getStakedTokens(msg.sender).length;
        uint256 maxStaked = viewMaxStakedNFTs(msg.sender);
        require(currentStaked + tokenIds.length <= maxStaked, "Staking limit exceeded");

        uint256 length = tokenIds.length;
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = tokenIds[i];
            require(gameNFT.ownerOf(tokenId) == msg.sender, "Not owner");
            require(stakes[tokenId].owner == address(0), "Already staked");

            gameNFT.transferFrom(msg.sender, address(this), tokenId);

            stakes[tokenId] = StakeInfo({
                owner: msg.sender,
                tokenId: tokenId,
                stakedAt: block.timestamp,
                lastClaimed: block.timestamp,
                fatigueBps: 0,
                lastFatigueUpdate: block.timestamp
            });
        }

        emit Staked(msg.sender, tokenIds, block.timestamp);
    }

    function claimYield() external {
        uint256 totalNetYield = 0;
        uint256 totalTaxYield = 0;
        
        uint256[] memory stakedTokens = getStakedTokens(msg.sender);
        require(stakedTokens.length > 0, "No staked NFTs");

        string[] memory userZones = new string[](stakedTokens.length);
        for (uint256 i = 0; i < stakedTokens.length; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }
        
        PairingModifiers memory pm = getPairingBuff(userZones);
        int256 pairingBonus = pm.maintenanceBps;

        for (uint256 i = 0; i < stakedTokens.length; i++) {
            uint256 tokenId = stakedTokens[i];
            StakeInfo storage stakeInfo = stakes[tokenId];

            _accrueFatigue(tokenId);

            (uint256 pendingNet, uint256 pendingTax) = _simulatePendingYieldForToken(tokenId, stakeInfo, pairingBonus);

            if (pendingNet > 0 || pendingTax > 0) {
                totalNetYield += pendingNet;
                totalTaxYield += pendingTax;
                stakeInfo.lastClaimed = block.timestamp;
            }
        }

        totalNetYield = _applyPercentageModifier(totalNetYield, pm.yieldBps);
        totalTaxYield = _applyPercentageModifier(totalTaxYield, pm.yieldBps);

        uint256 avgFatigue = viewAverageFatigue(msg.sender);
        int256 adjustedFatigue = int256(avgFatigue) + pm.fatigueBps;
        uint256 finalFatigue = adjustedFatigue < 0 ? 0 : uint256(adjustedFatigue);
        
        if (finalFatigue > 0) {
            if (finalFatigue >= 10000) {
                totalNetYield = 0;
                totalTaxYield = 0;
            } else {
                totalNetYield = (totalNetYield * (10000 - finalFatigue)) / 10000;
                totalTaxYield = (totalTaxYield * (10000 - finalFatigue)) / 10000;
            }
        }

        require(totalNetYield > 0 || totalTaxYield > 0, "No yield");
        
        // 1. Mint Net Yield to Player
        if (totalNetYield > 0) {
            gameToken.mint(msg.sender, totalNetYield);
            emit YieldClaimed(msg.sender, totalNetYield);
        }

        // 2. Mint Tax Yield to Contract and Distribute via 95/5 split
        if (totalTaxYield > 0) {
            gameToken.mint(address(this), totalTaxYield);
            _distributeTokens(totalTaxYield);
        }
    }

    function unstake(uint256[] calldata tokenIds) external {
        uint256 length = tokenIds.length;
        uint256 totalNetYield = 0;
        uint256 totalTaxYield = 0;

        uint256[] memory stakedTokens = getStakedTokens(msg.sender);
        string[] memory userZones = new string[](stakedTokens.length);
        for (uint256 i = 0; i < stakedTokens.length; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }
        
        PairingModifiers memory pm = getPairingBuff(userZones);
        int256 pairingBonus = pm.maintenanceBps;

        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = tokenIds[i];
            StakeInfo memory stakeInfo = stakes[tokenId];
            require(stakeInfo.owner == msg.sender, "Not owner");

            _accrueFatigue(tokenId);
            _detachAllUpgrades(tokenId, msg.sender);

            (uint256 pendingNet, uint256 pendingTax) = _simulatePendingYieldForToken(tokenId, stakeInfo, pairingBonus);
            totalNetYield += pendingNet;
            totalTaxYield += pendingTax;

            delete stakes[tokenId];
            gameNFT.transferFrom(address(this), msg.sender, tokenId);
        }

        totalNetYield = _applyPercentageModifier(totalNetYield, pm.yieldBps);
        totalTaxYield = _applyPercentageModifier(totalTaxYield, pm.yieldBps);

        uint256 avgFatigue = viewAverageFatigue(msg.sender);
        int256 adjustedFatigue = int256(avgFatigue) + pm.fatigueBps;
        uint256 finalFatigue = adjustedFatigue < 0 ? 0 : uint256(adjustedFatigue);
        
        if (finalFatigue > 0) {
            if (finalFatigue >= 10000) {
                totalNetYield = 0;
                totalTaxYield = 0;
            } else {
                totalNetYield = (totalNetYield * (10000 - finalFatigue)) / 10000;
                totalTaxYield = (totalTaxYield * (10000 - finalFatigue)) / 10000;
            }
        }

        if (totalNetYield > 0) {
            gameToken.mint(msg.sender, totalNetYield);
        }

        if (totalTaxYield > 0) {
            gameToken.mint(address(this), totalTaxYield);
            _distributeTokens(totalTaxYield);
        }

        emit Unstaked(msg.sender, tokenIds, block.timestamp);
    }

    // --- INTERNAL YIELD MATH ---

    function _simulatePendingYieldForToken(uint256 tokenId, StakeInfo memory stakeInfo, int256 pairingBonus)
        internal
        view
        returns (uint256 netYield, uint256 taxYield)
    {
        uint256 individualYield;

        // --- SCOPE 1: Base Yield & Fatigue ---
        {
            uint256 accrued = ((block.timestamp - stakeInfo.lastFatigueUpdate) * _getEffectiveFatigueRate(tokenId)) / 10000;
            uint256 simulatedFatigueBps = stakeInfo.fatigueBps + accrued;
            if (simulatedFatigueBps > MAX_FATIGUE_BPS) {
                simulatedFatigueBps = MAX_FATIGUE_BPS;
            }

            uint256 baseYield = gameNFT.getTokenYield(tokenId);
            individualYield = (baseYield * (10000 - simulatedFatigueBps)) / 10000;
            individualYield += _computeTotalUpgradeYield(tokenId);
        }

        // --- SCOPE 2: Global Boosts & Zone Multipliers ---
        individualYield = _applyYieldBoost(stakeInfo.owner, individualYield);

        {
            ZoneModifiers memory zm = getZoneBuff(tokenId);
            individualYield = _applyPercentageModifier(individualYield, zm.yieldBps);
        }

        // --- SCOPE 3: Tax Deduction & Time Scaling ---
        {
            uint256 specificTaxBps = getPropertyTax(stakeInfo.owner, tokenId, pairingBonus);
            uint256 netPropertyYield;
            uint256 propertyTaxYield;

            if (specificTaxBps >= 10000) {
                netPropertyYield = 0;
                propertyTaxYield = individualYield; 
            } else {
                netPropertyYield = (individualYield * (10000 - specificTaxBps)) / 10000;
                propertyTaxYield = individualYield - netPropertyYield;
            }

            uint256 elapsedTimeForYield = block.timestamp - stakeInfo.lastClaimed;
            netYield = (netPropertyYield * elapsedTimeForYield) / SECONDS_IN_A_DAY;
            taxYield = (propertyTaxYield * elapsedTimeForYield) / SECONDS_IN_A_DAY;
        }
    }

    function _calculateComprehensiveYield(address user) internal view returns (uint256) {
        uint256 totalNetYield = 0;
        uint256[] memory stakedTokens = getStakedTokens(user);
        if (stakedTokens.length == 0) return 0;

        uint8 taxReductionPoints = skillAllocations[user].taxReduction;
        int256 skillReduction = int256(uint256(taxReductionPoints) * 300);

        string[] memory userZones = new string[](stakedTokens.length);
        for (uint256 i = 0; i < stakedTokens.length; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }
        
        PairingModifiers memory pm = getPairingBuff(userZones);
        int256 portfolioNetBaseTax = 2500 - skillReduction + pm.maintenanceBps;

        for (uint256 i = 0; i < stakedTokens.length; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 individualYield = _calculateActualYield(tokenId);

            ZoneModifiers memory zm = zoneModifiers[userZones[i]];
            individualYield = _applyPercentageModifier(individualYield, zm.yieldBps);

            int256 finalTax = portfolioNetBaseTax + zm.maintenanceBps;
            uint256 taxBps = finalTax < 0 ? 0 : uint256(finalTax);
            
            if (taxBps < 10000) {
                totalNetYield += (individualYield * (10000 - taxBps)) / 10000;
            }
        }

        totalNetYield = _applyPercentageModifier(totalNetYield, pm.yieldBps);

        uint256 avgFatigue = viewAverageFatigue(user);
        int256 adjustedFatigue = int256(avgFatigue) + pm.fatigueBps;
        uint256 finalFatigue = adjustedFatigue < 0 ? 0 : uint256(adjustedFatigue);
        
        if (finalFatigue > 0) {
            if (finalFatigue >= 10000) return 0;
            totalNetYield = (totalNetYield * (10000 - finalFatigue)) / 10000;
        }

        return totalNetYield;
    }
    
    function viewEstimatedYieldClaim(address user) external view returns (uint256) {
        uint256 totalSimulatedYield = 0;
        uint256[] memory stakedTokens = getStakedTokens(user);
        if (stakedTokens.length == 0) return 0;

        string[] memory userZones = new string[](stakedTokens.length);
        for (uint256 i = 0; i < stakedTokens.length; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }
        PairingModifiers memory pm = getPairingBuff(userZones);
        int256 pairingBonus = pm.maintenanceBps;

        for (uint256 i = 0; i < stakedTokens.length; i++) {
            uint256 tokenId = stakedTokens[i];
            StakeInfo memory stakeInfo = stakes[tokenId];
            
            (uint256 pendingNet, ) = _simulatePendingYieldForToken(tokenId, stakeInfo, pairingBonus);
            totalSimulatedYield += pendingNet;
        }

        totalSimulatedYield = _applyPercentageModifier(totalSimulatedYield, pm.yieldBps);

        uint256 avgFatigue = viewAverageFatigue(user);
        int256 adjustedFatigue = int256(avgFatigue) + pm.fatigueBps;
        uint256 finalFatigue = adjustedFatigue < 0 ? 0 : uint256(adjustedFatigue);
        
        if (finalFatigue > 0) {
            if (finalFatigue >= 10000) return 0;
            totalSimulatedYield = (totalSimulatedYield * (10000 - finalFatigue)) / 10000;
        }

        return totalSimulatedYield;
    }

    function _calculateYield(uint256 tokenId) internal view returns (uint256) {
        StakeInfo memory stakeInfo = stakes[tokenId];
        uint256 actualYield = _calculateActualYield(tokenId);
        uint256 elapsedTime = block.timestamp - stakeInfo.lastClaimed;
        return (actualYield * elapsedTime) / SECONDS_IN_A_DAY;
    }

    function _calculateActualYield(uint256 baseTokenId) internal view returns (uint256) {
        StakeInfo memory info = stakes[baseTokenId];
        uint256 baseYield = gameNFT.getTokenYield(baseTokenId);
        uint256 fatigue = info.fatigueBps;

        uint256 yieldAfterFatigue = (baseYield * (10000 - fatigue)) / 10000;

        uint256 totalUpgradeYield = _computeTotalUpgradeYield(baseTokenId);
        uint256 finalYield = yieldAfterFatigue + totalUpgradeYield;

        return _applyYieldBoost(info.owner, finalYield);
    }

    function _computeTotalUpgradeYield(uint256 baseTokenId) internal view returns (uint256) {
        uint256[] memory upgrades = baseTokenUpgrades[baseTokenId];
        uint256 totalUpgradeYield = 0;
        for (uint256 j = 0; j < upgrades.length; j++) {
            (, , uint256 upgradeYieldIncrease) = upgradeNFT.getUpgradeInfoByTokenId(upgrades[j]);
            totalUpgradeYield += upgradeYieldIncrease;
        }
        return totalUpgradeYield;
    }

    function _applyYieldBoost(address user, uint256 baseYield) internal view returns (uint256) {
        uint256 totalBoostBps = 0;

        uint8 allocatedPoints = skillAllocations[user].yieldBoost;
        totalBoostBps += uint256(allocatedPoints) * YIELD_PER_SKILL_POINT_BPS;

        if (block.timestamp <= activeYieldConsumables[user].activeUntil) {
            totalBoostBps += YIELD_BASE_BOOST_BPS;
        }

        if (totalBoostBps > 10000) {
            totalBoostBps = 10000;
        }

        return (baseYield * (10000 + totalBoostBps)) / 10000;
    }

    function getTotalYield(address user) external view returns (uint256) {
        return _calculateComprehensiveYield(user);
    }

    // --- TAX VIEWS ---

    function getBasePlayerTax(address player) public view returns (uint256) {
        int256 baseTaxBps = 2500;
        uint8 taxReductionPoints = skillAllocations[player].taxReduction;
        int256 skillReduction = int256(uint256(taxReductionPoints) * 300);
        
        int256 finalTax = baseTaxBps - skillReduction;
        return finalTax < 0 ? 0 : uint256(finalTax);
    }

    function getPropertyTax(address player, uint256 tokenId, int256 preCalcPairingBonus) public view returns (uint256) {
        int256 baseTaxBps = 2500;
        uint8 taxReductionPoints = skillAllocations[player].taxReduction;
        int256 skillReduction = int256(uint256(taxReductionPoints) * 300);

        string memory zoneName = gameNFT.getZone(tokenId);
        int256 zoneMod = zoneModifiers[zoneName].maintenanceBps;

        int256 finalTax = baseTaxBps - skillReduction + zoneMod + preCalcPairingBonus;

        return finalTax < 0 ? 0 : uint256(finalTax);
    }

    function viewPortfolioTaxRates(address user) external view returns (uint256[] memory) {
        uint256[] memory staked = getStakedTokens(user);
        uint256[] memory rates = new uint256[](staked.length);
        
        string[] memory userZones = new string[](staked.length);
        for (uint256 i = 0; i < staked.length; i++) {
            userZones[i] = gameNFT.getZone(staked[i]);
        }
        int256 pairingBonus = getPairingBuff(userZones).maintenanceBps;

        for (uint256 i = 0; i < staked.length; i++) {
            rates[i] = getPropertyTax(user, staked[i], pairingBonus);
        }
        return rates;
    }

    // --- ECONOMY & PAYMENTS ---

    function _distributeTokens(uint256 amount) internal {
        uint256 swapAmount = (amount * 500) / 10000;
        uint256 burnAmount = amount - swapAmount;

        if (swapAmount > 0) {
            require(IERC20(address(gameToken)).approve(address(router), swapAmount), "Approval failed");

            address[] memory path = new address[](2);
            path[0] = address(gameToken);
            path[1] = wnative;

            uint256[] memory amountsOut = router.getAmountsOut(swapAmount, path);
            uint256 minOutput = amountsOut[amountsOut.length - 1];

            if (minOutput > 0) {
                try
                    router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        swapAmount,
                        0,
                        path,
                        brokerageAddress,
                        block.timestamp
                    )
                {} catch {
                    // Fail silently so claiming doesn't revert if DEX is empty
                }
            }
        }

        if (burnAmount > 0) {
            ERC20Burnable(address(gameToken)).burn(burnAmount);
            emit TokensBurned(address(this), burnAmount);
        }
    }

    function _handlePayment(uint256 amount) internal {
        require(gameToken.transferFrom(msg.sender, address(this), amount), "Payment failed");
        _distributeTokens(amount);
    }

    // --- SKILL POINTS ---

    function purchaseSkillPoints(uint256 pointsToBuy) external {
        require(pointsToBuy > 0, "At least 1 point");
        uint256 currentTotal = totalSkillPoints[msg.sender];
        require(currentTotal + pointsToBuy <= MAX_SKILL_POINTS, "Max points exceeded");

        uint256 totalCost = 0;
        for (uint256 i = 1; i <= pointsToBuy; i++) {
            uint256 pointCost = BASE_COST * (currentTotal + i)**2; 
            totalCost += pointCost;
        }

        _handlePayment(totalCost);
        totalSkillPoints[msg.sender] += pointsToBuy;

        _updateFatigueReduction(msg.sender);
        emit SkillPointsPurchased(msg.sender, pointsToBuy, totalCost);
    }

    function allocateSkillPoints(
        uint8 fatiguePoints,
        uint8 yieldPoints,
        uint8 taxPoints,
        uint8 stakingPoints
    ) external {
        uint256 requestedTotal = uint256(fatiguePoints) + yieldPoints + taxPoints + stakingPoints;
        require(requestedTotal <= totalSkillPoints[msg.sender], "Not enough points"); 
        
        require(fatiguePoints <= 5, "Max 5 fatigue points");
        require(yieldPoints <= 5, "Max 5 yield points");
        require(taxPoints <= 5, "Max 5 tax points");
        require(stakingPoints <= MAX_SKILL_POINTS_STAKING, "Max staking points exceeded");

        skillAllocations[msg.sender] = SkillAllocation(fatiguePoints, yieldPoints, taxPoints, stakingPoints);

        _updateFatigueReduction(msg.sender);
        _updateYieldBoost(msg.sender);

        emit SkillPointsAllocated(msg.sender, fatiguePoints, yieldPoints, taxPoints, stakingPoints);
    }

    function resetSkillPoints() external {
        uint256 dailyYield = _calculateComprehensiveYield(msg.sender);
        uint256 resetFee = (dailyYield * RESET_COST_MULTIPLIER_BPS) / 10000;

        _handlePayment(resetFee);

        skillAllocations[msg.sender] = SkillAllocation(0, 0, 0, 0);

        _updateFatigueReduction(msg.sender);
        _updateYieldBoost(msg.sender);

        emit SkillPointsReset(msg.sender, resetFee);
    }

    function viewSkillAllocation(address user)
        external
        view
        returns (
            uint8 fatigueReduction,
            uint8 yieldBoost,
            uint8 taxReduction,
            uint8 stakingExpansion
        )
    {
        SkillAllocation memory allocation = skillAllocations[user];
        return (
            allocation.fatigueReduction,
            allocation.yieldBoost,
            allocation.taxReduction,
            allocation.stakingExpansion
        );
    }

    function viewAvailableSkillPoints(address user) public view returns (uint256) {
        SkillAllocation memory alloc = skillAllocations[user];
        uint256 allocated = uint256(alloc.fatigueReduction) + 
                            alloc.yieldBoost + 
                            alloc.taxReduction + 
                            alloc.stakingExpansion;
        return totalSkillPoints[user] - allocated;
    }

    function viewNextSkillPointCost(address user) external view returns (uint256) {
        return BASE_COST * (totalSkillPoints[user] + 1)**2;
    }

    function _updateYieldBoost(address user) internal {
        YieldConsumable storage consumable = activeYieldConsumables[user];
        if (block.timestamp <= consumable.activeUntil) {
            uint256 allocatedPoints = skillAllocations[user].yieldBoost;
            uint256 skillPointBoost = allocatedPoints * YIELD_PER_SKILL_POINT_BPS;

            uint256 totalBoostBps = YIELD_BASE_BOOST_BPS + skillPointBoost;
            if (totalBoostBps > 10000) {
                totalBoostBps = 10000;
            }

            consumable.yieldBoostBps = totalBoostBps;
        }
    }

    // --- FATIGUE & CONSUMABLES ---

    function resetFatigue() external {
        uint256 totalResetFee = 0;
        uint256[] memory stakedTokens = getStakedTokens(msg.sender);
        uint256 tokenCount = stakedTokens.length;

        if (tokenCount == 0) {
            revert("Nothing to reset");
        }

        string[] memory userZones = new string[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }

        PairingModifiers memory pm = getPairingBuff(userZones);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 baseYield = gameNFT.getTokenYield(tokenId);

            ZoneModifiers memory zm = getZoneBuff(tokenId);
            uint256 modifiedYield = baseYield;

            modifiedYield = _applyPercentageModifier(modifiedYield, zm.yieldBps);
            modifiedYield = _applyPercentageModifier(modifiedYield, pm.yieldBps);

            uint256 resetFee = (modifiedYield * 15) / 100;
            totalResetFee += resetFee;

            StakeInfo storage stakeInfo = stakes[tokenId];
            stakeInfo.fatigueBps = 0;
            stakeInfo.lastFatigueUpdate = block.timestamp;
        }

        _handlePayment(totalResetFee);

        emit FatigueReset(msg.sender, totalResetFee);
    }

    function _accrueFatigue(uint256 tokenId) internal {
        StakeInfo storage stakeInfo = stakes[tokenId];
        uint256 elapsedTime = block.timestamp - stakeInfo.lastFatigueUpdate;
        uint256 effectiveRate = _getEffectiveFatigueRate(tokenId);

        uint256 accrued = (elapsedTime * effectiveRate) / 10000;

        stakeInfo.fatigueBps = stakeInfo.fatigueBps + accrued > MAX_FATIGUE_BPS
            ? MAX_FATIGUE_BPS
            : stakeInfo.fatigueBps + accrued;

        stakeInfo.lastFatigueUpdate = block.timestamp;
    }

    function viewAverageFatigue(address user) public view returns (uint256) {
        uint256 totalFatigue = 0;
        uint256 stakedCount = gameNFT.balanceOf(address(this));
        uint256 userCount = 0;

        for (uint256 i = 0; i < stakedCount; i++) {
            uint256 tokenId = gameNFT.tokenOfOwnerByIndex(address(this), i);
            StakeInfo memory stakeInfo = stakes[tokenId];
            if (stakeInfo.owner == user) {
                uint256 elapsedTime = block.timestamp - stakeInfo.lastFatigueUpdate;
                uint256 accruedFatigue = (elapsedTime * FATIGUE_RATE_PER_SECOND_BPS) / 10000;

                uint256 currentFatigue = stakeInfo.fatigueBps + accruedFatigue;
                if (currentFatigue > MAX_FATIGUE_BPS) {
                    currentFatigue = MAX_FATIGUE_BPS;
                }

                totalFatigue += currentFatigue;
                userCount++;
            }
        }

        if (userCount == 0) {
            return 0;
        }

        return totalFatigue / userCount;
    }

    function activateFatigueConsumable() external {
        uint256 totalModifiedYield = 0;
        uint256[] memory stakedTokens = getStakedTokens(msg.sender);
        uint256 tokenCount = stakedTokens.length;

        require(tokenCount > 0, "No staked NFTs");

        string[] memory userZones = new string[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }

        PairingModifiers memory pm = getPairingBuff(userZones);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 modifiedYield = gameNFT.getTokenYield(tokenId);

            ZoneModifiers memory zm = getZoneBuff(tokenId);
            
            modifiedYield = _applyPercentageModifier(modifiedYield, zm.yieldBps);
            modifiedYield = _applyPercentageModifier(modifiedYield, pm.yieldBps);

            totalModifiedYield += modifiedYield;
        }

        uint256 cost = (totalModifiedYield * FATIGUE_CONSUMABLE_COST_BPS) / 10000;
        require(cost > 0, "Activation cost is zero");

        _handlePayment(cost);

        uint256 allocatedPoints = skillAllocations[msg.sender].fatigueReduction;
        uint256 skillPointReduction = allocatedPoints * PER_POINT_BONUS_BPS;

        uint256 totalReductionBps = FATIGUE_BASE_REDUCTION_BPS;
        if (allocatedPoints > 0) {
            totalReductionBps += skillPointReduction;
        }

        if (totalReductionBps > 10000) {
            totalReductionBps = 10000;
        }

        activeFatigueConsumables[msg.sender] = FatigueConsumable({
            activeUntil: block.timestamp + FATIGUE_CONSUMABLE_DURATION,
            fatigueReductionBps: totalReductionBps
        });

        emit FatigueConsumableActivated(msg.sender, totalReductionBps, FATIGUE_CONSUMABLE_DURATION);
    }

    function _getEffectiveFatigueRate(uint256 tokenId) internal view returns (uint256) {
        StakeInfo memory stakeInfo = stakes[tokenId];
        uint256 baseRate = FATIGUE_RATE_PER_SECOND_BPS;
        uint256 totalReductionBps = 0;

        uint8 allocatedPoints = skillAllocations[stakeInfo.owner].fatigueReduction;
        totalReductionBps += uint256(allocatedPoints) * PER_POINT_BONUS_BPS;

        if (block.timestamp <= activeFatigueConsumables[stakeInfo.owner].activeUntil) {
            totalReductionBps += FATIGUE_BASE_REDUCTION_BPS;
        }

        if (totalReductionBps > 10000) {
            totalReductionBps = 10000;
        }

        return (baseRate * (10000 - totalReductionBps)) / 10000;
    }

    function isFatigueConsumableActive(address user) external view returns (bool) {
        return block.timestamp <= activeFatigueConsumables[user].activeUntil;
    }

    function _updateFatigueReduction(address user) internal {
        FatigueConsumable storage consumable = activeFatigueConsumables[user];
        if (block.timestamp <= consumable.activeUntil) {
            uint256 allocatedPoints = skillAllocations[user].fatigueReduction;
            uint256 skillPointReduction = allocatedPoints * PER_POINT_BONUS_BPS;

            uint256 totalReduction = FATIGUE_BASE_REDUCTION_BPS + skillPointReduction;
            if (totalReduction > 10000) {
                totalReduction = 10000;
            }

            consumable.fatigueReductionBps = totalReduction;
        }
    }

    function activateYieldConsumable() external {
        uint256 totalModifiedYield = 0;
        uint256[] memory stakedTokens = getStakedTokens(msg.sender);
        uint256 tokenCount = stakedTokens.length;

        require(tokenCount > 0, "No staked NFTs");

        string[] memory userZones = new string[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }

        PairingModifiers memory pm = getPairingBuff(userZones);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 modifiedYield = gameNFT.getTokenYield(tokenId);

            ZoneModifiers memory zm = getZoneBuff(tokenId);
            
            modifiedYield = _applyPercentageModifier(modifiedYield, zm.yieldBps);
            modifiedYield = _applyPercentageModifier(modifiedYield, pm.yieldBps);

            totalModifiedYield += modifiedYield;
        }

        uint256 cost = (totalModifiedYield * YIELD_CONSUMABLE_COST_BPS) / 10000;
        require(cost > 0, "Activation cost is zero");

        _handlePayment(cost);

        uint256 allocatedPoints = skillAllocations[msg.sender].yieldBoost;
        uint256 skillPointBoost = allocatedPoints * YIELD_PER_SKILL_POINT_BPS;

        uint256 totalBoostBps = YIELD_BASE_BOOST_BPS;
        if (allocatedPoints > 0) {
            totalBoostBps += skillPointBoost;
        }

        if (totalBoostBps > 10000) {
            totalBoostBps = 10000;
        }

        activeYieldConsumables[msg.sender] = YieldConsumable({
            activeUntil: block.timestamp + YIELD_CONSUMABLE_DURATION,
            yieldBoostBps: totalBoostBps
        });

        emit YieldConsumableActivated(msg.sender, totalBoostBps, YIELD_CONSUMABLE_DURATION);
    }

    function isYieldConsumableActive(address user) external view returns (bool) {
        return block.timestamp <= activeYieldConsumables[user].activeUntil;
    }

    // --- UPGRADES ---

    function _getAllowedUpgradeSlots(uint8 tierLevel) internal pure returns (uint8) {
        if (tierLevel == 0) {
            return 2;
        } else if (tierLevel == 1) {
            return 3;
        } else if (tierLevel == 2) {
            return 4;
        }
        revert("Invalid tier");
    }

    function attachUpgradesToBaseToken(uint256 baseTokenId, uint256[] calldata upgradeTokenIds) external {
        require(stakes[baseTokenId].owner == msg.sender, "Not owner");

        uint8 allowedSlots = _getAllowedUpgradeSlots(gameNFT.getTierLevel(baseTokenId));
        uint256 currentCount = baseTokenUpgrades[baseTokenId].length;
        require(currentCount + upgradeTokenIds.length <= allowedSlots, "Exceeds slots");

        for (uint256 i = 0; i < upgradeTokenIds.length; i++) {
            uint256 upgradeId = upgradeTokenIds[i];
            require(upgradeNFT.ownerOf(upgradeId) == msg.sender, "Not upgrade owner");
            upgradeNFT.transferFrom(msg.sender, address(this), upgradeId);

            baseTokenUpgrades[baseTokenId].push(upgradeId);
            upgradeToBaseToken[upgradeId] = baseTokenId;

            emit UpgradeStaked(msg.sender, baseTokenId, upgradeId);
        }
    }

    function detachUpgradesFromBaseToken(uint256 baseTokenId, uint256[] calldata upgradeTokenIds) external {
        require(stakes[baseTokenId].owner == msg.sender, "Not owner");

        for (uint256 i = 0; i < upgradeTokenIds.length; i++) {
            uint256 upgradeId = upgradeTokenIds[i];
            require(upgradeToBaseToken[upgradeId] == baseTokenId, "Not attached");

            _removeUpgradeFromBaseToken(baseTokenId, upgradeId);
            upgradeToBaseToken[upgradeId] = 0;

            upgradeNFT.transferFrom(address(this), msg.sender, upgradeId);

            emit UpgradeUnstaked(msg.sender, baseTokenId, upgradeId);
        }
    }

    function _removeUpgradeFromBaseToken(uint256 baseTokenId, uint256 upgradeId) internal {
        uint256[] storage upgrades = baseTokenUpgrades[baseTokenId];
        for (uint256 i = 0; i < upgrades.length; i++) {
            if (upgrades[i] == upgradeId) {
                upgrades[i] = upgrades[upgrades.length - 1];
                upgrades.pop();
                return;
            }
        }
        revert("Upgrade not found");
    }

    function _detachAllUpgrades(uint256 baseTokenId, address owner) internal {
        uint256[] storage upgrades = baseTokenUpgrades[baseTokenId];
        while (upgrades.length > 0) {
            uint256 upgradeId = upgrades[upgrades.length - 1];
            upgrades.pop();
            upgradeToBaseToken[upgradeId] = 0;
            upgradeNFT.transferFrom(address(this), owner, upgradeId);

            emit UpgradeUnstaked(owner, baseTokenId, upgradeId);
        }
    }

    function getAttachedUpgrades(uint256 baseTokenId) external view returns (uint256[] memory) {
        return baseTokenUpgrades[baseTokenId];
    }

    // --- UTILITIES ---

    function setZoneModifier(
        string calldata zoneName,
        int256 yieldBps,
        int256 fatigueBps,
        int256 maintenanceBps
    ) external onlyOwner {
        zoneModifiers[zoneName] = ZoneModifiers(yieldBps, fatigueBps, maintenanceBps);
    }

    function setPairingModifier(
        string calldata zoneA,
        string calldata zoneB,
        int256 yieldBps,
        int256 fatigueBps,
        int256 maintenanceBps
    ) external onlyOwner {
        bytes32 key = _getPairingKey(zoneA, zoneB);
        pairingModifiers[key] = PairingModifiers(yieldBps, fatigueBps, maintenanceBps);
    }

    function getZoneBuff(uint256 tokenId) internal view returns (ZoneModifiers memory) {
        string memory zoneName = gameNFT.getZone(tokenId);
        return zoneModifiers[zoneName];
    }

    function getPairingBuff(string[] memory zones) internal view returns (PairingModifiers memory) {
    PairingModifiers memory totalPairing = PairingModifiers(0, 0, 0);

    string[] memory uniqueZones = new string[](zones.length);
    uint256 uniqueCount = 0;

    for (uint256 i = 0; i < zones.length; i++) {
        bool isDuplicate = false;
        for (uint256 j = 0; j < uniqueCount; j++) {

            if (keccak256(bytes(zones[i])) == keccak256(bytes(uniqueZones[j]))) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            uniqueZones[uniqueCount] = zones[i];
            uniqueCount++;
        }
    }

    for (uint256 i = 0; i < uniqueCount; i++) {
        for (uint256 j = i + 1; j < uniqueCount; j++) {
            bytes32 key = _getPairingKey(uniqueZones[i], uniqueZones[j]);
            PairingModifiers memory pm = pairingModifiers[key];

            totalPairing.yieldBps += pm.yieldBps;
            totalPairing.fatigueBps += pm.fatigueBps;
            totalPairing.maintenanceBps += pm.maintenanceBps;
        }
    }
    
    return totalPairing;
}

    function _getPairingKey(string memory zoneA, string memory zoneB) internal pure returns (bytes32) {
        if (keccak256(bytes(zoneA)) < keccak256(bytes(zoneB))) {
            return keccak256(abi.encodePacked(zoneA, zoneB));
        } else {
            return keccak256(abi.encodePacked(zoneB, zoneA));
        }
    }

    function viewMaxStakedNFTs(address user) public view returns (uint256) {
        uint8 stakingPoints = skillAllocations[user].stakingExpansion;
        return BASE_MAX_STAKED_NFTS + (stakingPoints * STAKING_LIMIT_PER_POINT);
    }

    function viewResetFatigueCost(address user) external view returns (uint256 totalResetFee) {
        uint256[] memory stakedTokens = getStakedTokens(user);
        uint256 tokenCount = stakedTokens.length;

        if (tokenCount == 0) {
            return 0; 
        }

        string[] memory userZones = new string[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }

        PairingModifiers memory pm = getPairingBuff(userZones);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 baseYield = gameNFT.getTokenYield(tokenId);

            ZoneModifiers memory zm = getZoneBuff(tokenId);
            uint256 modifiedYield = baseYield;

            modifiedYield = _applyPercentageModifier(modifiedYield, zm.yieldBps);
            modifiedYield = _applyPercentageModifier(modifiedYield, pm.yieldBps);

            uint256 resetFee = (modifiedYield * 15) / 100;
            totalResetFee += resetFee;
        }

        return totalResetFee;
    }

    function viewFatigueConsumableCost(address user) external view returns (uint256 totalCost) {
        uint256[] memory stakedTokens = getStakedTokens(user);
        uint256 tokenCount = stakedTokens.length;

        if (tokenCount == 0) {
            return 0; 
        }

        string[] memory userZones = new string[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }

        PairingModifiers memory pm = getPairingBuff(userZones);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 modifiedYield = gameNFT.getTokenYield(tokenId);

            ZoneModifiers memory zm = getZoneBuff(tokenId);
            modifiedYield = _applyPercentageModifier(modifiedYield, zm.yieldBps);
            modifiedYield = _applyPercentageModifier(modifiedYield, pm.yieldBps);

            totalCost += modifiedYield;
        }

        totalCost = (totalCost * FATIGUE_CONSUMABLE_COST_BPS) / 10000;
        return totalCost;
    }

    function viewYieldConsumableCost(address user) external view returns (uint256 totalCost) {
        uint256[] memory stakedTokens = getStakedTokens(user);
        uint256 tokenCount = stakedTokens.length;

        if (tokenCount == 0) {
            return 0; 
        }

        string[] memory userZones = new string[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            userZones[i] = gameNFT.getZone(stakedTokens[i]);
        }

        PairingModifiers memory pm = getPairingBuff(userZones);

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = stakedTokens[i];
            uint256 modifiedYield = gameNFT.getTokenYield(tokenId);

            ZoneModifiers memory zm = getZoneBuff(tokenId);
            modifiedYield = _applyPercentageModifier(modifiedYield, zm.yieldBps);
            modifiedYield = _applyPercentageModifier(modifiedYield, pm.yieldBps);

            totalCost += modifiedYield;
        }

        totalCost = (totalCost * YIELD_CONSUMABLE_COST_BPS) / 10000;
        return totalCost;
    }
}