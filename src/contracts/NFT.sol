// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./Upgrade.sol";

contract GameNFT is ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard {
    using Address for address;

    enum TokenTier {
        Tier1,
        Tier2,
        Tier3
    }

    struct Upgrade {
        uint256 tokenId;
        uint256 yieldIncrease;
    }

    string private _baseURIExtended;
    uint256 private constant MAX_SUPPLY = 20000;
    uint256 private constant PROMOTIONAL_MINT_LIMIT = 400;
    uint256 private totalMinted;
    uint256 public whitelistStart;
    uint256 public mintStart;

    uint256 private constant BASE_MINT_PRICE_ETH = 0.008 ether;
    uint256 private constant BASE_MINT_PRICE_TOKENS = 200 * 10**15;
    uint256 private constant PRICE_INCREASE_INTERVAL = 5000;
    uint256 private constant PRICE_INCREASE_BPS = 2500;

    uint256 public constant WHITELIST_SPOT_COST = 0.006 ether;
    uint256 public constant WHITELIST_MINT_PRICE = 0.008 ether;
    uint256 private constant MAX_WHITELIST_SPOTS = 250;
    uint256 public whitelistSpotsSold;

    uint256 private constant TIER1_YIELD = 40 * 10**15;
    uint256 private constant TIER2_YIELD = 80 * 10**15;
    uint256 private constant TIER3_YIELD = 120 * 10**15;

    uint256 private currentTier3Id = 0;
    uint256 private currentTier2Id = 1075;
    uint256 private currentTier1Id = 5375;

    uint256 private _tokenIdCounter = 0;
    uint256 private tier3Minted = 0;
    uint256 private tier2Minted = 0;
    uint256 private tier1Minted = 0;

    IERC20 private gameToken;
    IUniswapV2Router02 private router;
    address private wnative;
    address private brokerageAddress;

    mapping(uint256 => TokenTier) public tokenTiers;
    mapping(uint256 => uint256) public tokenLocations;
    mapping(address => bool) private whitelist;
    mapping(address => uint256) public whitelistMints;
    mapping(uint256 => string) private _customTokenURIs;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => uint8) private _tierLevels;
    mapping(uint256 => string) private _zones;
    mapping(uint256 => uint256) private _tokenYields;
    mapping(uint256 => Upgrade[]) private _upgrades;

    event NFTMinted(
        address indexed owner,
        uint256 indexed tokenId,
        uint8 tier,
        string zone,
        uint256 tokenYield
    );
    event TokensBurned(address indexed burner, uint256 amount);
    event Withdrawn(address indexed owner, uint256 ethAmount, uint256 tokenAmount);
    event WhitelistSpotPurchased(address indexed buyer);
    event WhitelistMinted(address indexed buyer, uint256 quantity);
    event UpgradeStaked(address indexed owner, uint256 gameTokenId, uint256 upgradeTokenId, uint256 yieldIncrease);
    event UpgradeUnstaked(address indexed owner, uint256 gameTokenId, uint256 upgradeTokenId, uint256 yieldDecrease);

    string[] private _zoneNames = [
        "Foreclosure Fields",
        "Eviction Alley",
        "Gentrification Gardens",
        "Mortgage Mountain",
        "Rentpayer's Ravine",
        "Subprime Suburbia",
        "Default Desert",
        "Landlord Lagoon",
        "Tax Haven Terrace",
        "Tenant's Trap Canyon",
        "Speculation Springs",
        "Repossession Ridge"
    ];

    constructor(
        address _brokerageAddress,
        address _router,
        address _wnative,
        address _gameToken,
        string memory initialBaseURI
    ) ERC721("GameNFT", "GNFT") Ownable(msg.sender) {
        brokerageAddress = _brokerageAddress;
        router = IUniswapV2Router02(_router);
        wnative = _wnative;
        gameToken = IERC20(_gameToken);
        _baseURIExtended = initialBaseURI;
        _setDefaultRoyalty(_brokerageAddress, 500);
    }

    // Override supportsInterface to include multiple interfaces
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Base URI logic
    function _baseURI() internal view override returns (string memory) {
        return _baseURIExtended;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseURIExtended = newBaseURI;
    }

    /// @dev Calculate the current mint price in ETH
    function getCurrentMintPriceETH() public view returns (uint256) {
        uint256 intervals = totalMinted / PRICE_INCREASE_INTERVAL;
        uint256 price = BASE_MINT_PRICE_ETH;
        for (uint256 i = 0; i < intervals; i++) {
            price += (price * PRICE_INCREASE_BPS) / 10000;
        }
        return price;
    }

    /// @dev Calculate the current mint price in game tokens
    function getCurrentMintPriceTokens() public view returns (uint256) {
        uint256 intervals = totalMinted / PRICE_INCREASE_INTERVAL;
        uint256 price = BASE_MINT_PRICE_TOKENS;
        for (uint256 i = 0; i < intervals; i++) {
            price += (price * PRICE_INCREASE_BPS) / 10000;
        }
        return price;
    }

    /// @dev Mint multiple NFTs by paying the required ETH and game tokens
    function mint(uint256 quantity) external payable nonReentrant {
    require(block.timestamp >= mintStart, "Public minting has not started");
    require(quantity > 0, "Quantity must be greater than zero");
    require(totalMinted + quantity <= MAX_SUPPLY, "Exceeds max supply");

    uint256 currentPriceETH = getCurrentMintPriceETH();
    uint256 currentPriceTokens = getCurrentMintPriceTokens();

    require(msg.value == currentPriceETH * quantity, "Incorrect ETH value sent");
    require(
        gameToken.transferFrom(msg.sender, address(this), currentPriceTokens * quantity),
        "Token payment failed"
    );

    for (uint256 i = 0; i < quantity; i++) {
        _mintTokenWithTier(msg.sender, totalMinted);
        totalMinted++;
    }

    _handlePayment(currentPriceETH * quantity, currentPriceTokens * quantity);
}


    /// @dev Purchase a whitelist spot
    function purchaseWhitelistSpot() external payable nonReentrant {
        require(block.timestamp >= whitelistStart, "Whitelist phase has not started");
        require(whitelistSpotsSold < MAX_WHITELIST_SPOTS, "Whitelist full");
        require(!whitelist[msg.sender], "Already whitelisted");
        require(msg.value == WHITELIST_SPOT_COST, "Incorrect ETH value");

        // Send ETH directly to the brokerage address
        (bool success, ) = brokerageAddress.call{value: msg.value}("");
        require(success, "Brokerage ETH transfer failed");

        whitelist[msg.sender] = true;
        whitelistSpotsSold++;
        emit WhitelistSpotPurchased(msg.sender);

    }

    /// @dev Check if an address is whitelisted
    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user];
    }

    /// @dev Mint NFTs during the whitelist phase
    function whitelistMint(uint256 quantity) external payable nonReentrant {
    require(block.timestamp >= whitelistStart, "Whitelist minting has not started"); // ADDED TIME CHECK
    require(whitelist[msg.sender], "Not whitelisted");
    require(quantity > 0 && quantity <= 10, "Invalid quantity");
    require(totalMinted + quantity <= MAX_SUPPLY, "Exceeds max supply");
    require(
        whitelistMints[msg.sender] + quantity <= 10,
        "Whitelist mint limit reached"
    );
    require(
        msg.value == WHITELIST_MINT_PRICE * quantity,
        "Incorrect ETH value sent"
    );

    whitelistMints[msg.sender] += quantity;

    for (uint256 i = 0; i < quantity; i++) {
        _mintTokenWithTier(msg.sender, totalMinted);
        totalMinted++;
    }

    // Handle payment processing
    _handlePayment(msg.value, 0);
}

    /// @dev Handle ETH and game token payments with brokerage fees and token burning
    function _handlePayment(uint256 ethAmount, uint256 gameTokenAmount) internal {
        if (gameTokenAmount > 0) {
            uint256 brokerageGameTokenFee = (gameTokenAmount * 500) / 10000;
            gameToken.approve(address(router), brokerageGameTokenFee);

            address[] memory path = new address[](2);
            path[0] = address(gameToken);
            path[1] = address(wnative);

            router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                brokerageGameTokenFee,
                0,
                path,
                brokerageAddress,
                block.timestamp
            );
        }

        if (ethAmount > 0) {
            uint256 brokerageEthFee = (ethAmount * 500) / 10000;
            uint256 remainingEth = ethAmount - brokerageEthFee;

            // Send brokerage ETH fee
            (bool brokerageSuccess, ) = brokerageAddress.call{value: brokerageEthFee}("");
            require(brokerageSuccess, "Brokerage ETH transfer failed");

            if (remainingEth > 0) {
                // Wrap the remaining ETH into wnative
                IWNATIVE(wnative).deposit{value: remainingEth}();

                uint256 wnativeBalance = IERC20(wnative).balanceOf(address(this));
                IERC20(wnative).approve(address(router), wnativeBalance);

                address[] memory path = new address[](2);
                path[0] = wnative;
                path[1] = address(gameToken);

                // Swap WNATIVE for game tokens
                router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                    wnativeBalance,
                    0,
                    path,
                    address(this),
                    block.timestamp
                );

                // Burn remaining game tokens
                uint256 burnAmount = gameToken.balanceOf(address(this));
                if (burnAmount > 0) {
                    ERC20Burnable(address(gameToken)).burn(burnAmount);
                    emit TokensBurned(msg.sender, burnAmount);
                }
            }
        }
    }

    function _mintTokenWithTier(address recipient, uint256 mintIndex) internal {
    uint256 tokenId;
    uint8 tier;
    uint256 tokenYield;

    // Determine rarity and assign token ID
    uint256 tierRoll = uint256(
        keccak256(abi.encodePacked(block.timestamp, block.prevrandao, mintIndex))
    ) % 100;

    if (tierRoll < 5) {
        require(currentTier3Id < 1076, "Tier3 token ID out of range");
        tokenId = currentTier3Id++;
        tier = 2;
        tokenYield = TIER3_YIELD;
        tier3Minted++;
    } else if (tierRoll < 25) {
        require(currentTier2Id < 5376, "Tier2 token ID out of range");
        tokenId = currentTier2Id++;
        tier = 1;
        tokenYield = TIER2_YIELD;
        tier2Minted++;
    } else {
        require(currentTier1Id < MAX_SUPPLY, "Tier1 token ID out of range");
        tokenId = currentTier1Id++;
        tier = 0;
        tokenYield = TIER1_YIELD;
        tier1Minted++;
    }

    // Perform the mint
    _safeMint(recipient, tokenId);

    // Assign metadata
    _assignZone(tokenId);
    _tokenYields[tokenId] = tokenYield;
    _tierLevels[tokenId] = tier;
    tokenTiers[tokenId] = TokenTier(tier);

    emit NFTMinted(
        recipient,
        tokenId,
        tier,
        _zones[tokenId],
        tokenYield
    );
}

    function _assignTokenYield(uint256 tokenId, uint8 tier) internal {
        if (tier == 1) {
            _tokenYields[tokenId] = TIER1_YIELD;
        } else if (tier == 2) {
            _tokenYields[tokenId] = TIER2_YIELD;
        } else if (tier == 3) {
            _tokenYields[tokenId] = TIER3_YIELD;
        } else {
            revert("ERC721: invalid tier");
        }
    }

    function _assignZone(uint256 tokenId) internal {
        // Calculate the zone index to be in the range of 0 to 11
        uint256 zoneIndex = (tokenId % _zoneNames.length);

        // Ensure the zone index is within the correct range (0 to 11)
        require(zoneIndex < _zoneNames.length, "Invalid zone index");

        // Store the zone name using zero-based indexing for the array access
        _zones[tokenId] = _zoneNames[zoneIndex];

        // Store the numerical zone ID in the tokenLocations mapping
        tokenLocations[tokenId] = zoneIndex;
    }

function brokerageDeployment(address recipient, uint256 quantity) public onlyOwner {
    for (uint256 i = 0; i < quantity; i++) {
        uint256 tokenId = currentTier3Id;

        // Ensure token ID is within the valid range
        require(tokenId < MAX_SUPPLY, "Token ID out of range");

        uint8 tier = 3; // Tier3
        uint256 zone = uint256(
            keccak256(abi.encodePacked(block.timestamp, tokenId))
        ) % _zoneNames.length;
        uint256 tokenYield = TIER3_YIELD;

        // Mint the token using `_safeMint` to ensure ERC721Enumerable tracking
        _safeMint(recipient, tokenId);

        // Update metadata mappings
        tokenTiers[tokenId] = TokenTier.Tier3;
        tokenLocations[tokenId] = zone;
        _tierLevels[tokenId] = tier;
        _tokenYields[tokenId] = tokenYield;
        _zones[tokenId] = _zoneNames[zone];

        emit NFTMinted(
            recipient,
            tokenId,
            tier,
            _zoneNames[zone],
            tokenYield
        );

        tier3Minted++;
        currentTier3Id++;
    }
}




    /// @dev Withdraw accumulated ETH and game tokens from the contract
    function withdraw() external onlyOwner nonReentrant {
        uint256 ethBalance = address(this).balance;
        uint256 tokenBalance = gameToken.balanceOf(address(this));

        // Withdraw ETH
        if (ethBalance > 0) {
            (bool success, ) = payable(owner()).call{value: ethBalance}("");
            require(success, "ETH withdrawal failed");
        }

        // Withdraw game tokens
        if (tokenBalance > 0) {
            require(
                gameToken.transfer(owner(), tokenBalance),
                "Token withdrawal failed"
            );
        }
    }

    function getTierLevel(uint256 tokenId) public view returns (uint8) {
        return _tierLevels[tokenId];
    }

    function getTokenYield(uint256 tokenId) public view returns (uint256) {
        return _tokenYields[tokenId];
    }

    function getZone(uint256 tokenId) public view returns (string memory) {
        return _zones[tokenId];
    }

    function getTokenDetails(uint256 tokenId)
        public
        view
        returns (
            uint8 tier,
            string memory zone,
            uint256 tokenYield
        )
    {
        return (
            _tierLevels[tokenId],
            _zones[tokenId],
            _tokenYields[tokenId]
        );
    }

    function setWhitelistStartTime(uint256 _whitelistStartTime)
        external
        onlyOwner
    {
        whitelistStart = _whitelistStartTime;
    }

    function setMintStartTime(uint256 _mintStartTime) external onlyOwner {
        mintStart = _mintStartTime;
    }

    function setTokenURI(uint256 tokenId, string memory newURI) external onlyOwner {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        _customTokenURIs[tokenId] = newURI;
    }

    /// @dev Set the royalty information
    function setRoyaltyInfo(address receiver, uint96 feeNumerator)
        external
        onlyOwner
    {
        require(feeNumerator <= 10000, "Fee exceeds maximum");
        _setDefaultRoyalty(receiver, feeNumerator);
    }
}