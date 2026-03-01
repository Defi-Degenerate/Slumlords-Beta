// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

interface IWNATIVE {
    function deposit() external payable;

    function withdraw(uint256) external;
}

contract UpgradeNFT is ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard {
    function _initializeLevels() internal {
    // Scaling Factor: 0.004 (2/500)
    // Format: UpgradeLevel(name, yieldIncrease, maxSupply, minted, mintCostEth, mintCostGameTokens, uriSuffix)

    upgradeLevels[0] = UpgradeLevel("Garden Renovation", 0.02 ether, 5000, 0, 0.004 ether, 0.4 ether, "GardenRenovation");
    upgradeLevels[1] = UpgradeLevel("Minor Remodel", 0.04 ether, 4500, 0, 0.0044 ether, 0.8 ether, "MinorRemodel");
    upgradeLevels[2] = UpgradeLevel("Energy-Efficient Windows", 0.06 ether, 4000, 0, 0.0048 ether, 1.2 ether, "EnergyEfficientWindows");
    upgradeLevels[3] = UpgradeLevel("High-Speed Internet", 0.08 ether, 3800, 0, 0.0052 ether, 2.0 ether, "HighSpeedInternet");
    upgradeLevels[4] = UpgradeLevel("Luxury Flooring", 0.10 ether, 3600, 0, 0.0056 ether, 2.8 ether, "LuxuryFlooring");
    upgradeLevels[5] = UpgradeLevel("Gourmet Kitchen", 0.12 ether, 3400, 0, 0.006 ether, 3.8 ether, "GourmetKitchen");
    upgradeLevels[6] = UpgradeLevel("Solar Panels", 0.14 ether, 3200, 0, 0.0064 ether, 5.2 ether, "SolarPanels");
    upgradeLevels[7] = UpgradeLevel("Home Gym", 0.16 ether, 3000, 0, 0.0068 ether, 6.8 ether, "HomeGym");
    upgradeLevels[8] = UpgradeLevel("Outdoor Deck", 0.20 ether, 2800, 0, 0.0072 ether, 8.8 ether, "OutdoorDeck");
    upgradeLevels[9] = UpgradeLevel("Private Garage", 0.24 ether, 2600, 0, 0.0076 ether, 11.2 ether, "PrivateGarage");
    upgradeLevels[10] = UpgradeLevel("Smart Home System", 0.30 ether, 2400, 0, 0.008 ether, 14.0 ether, "SmartHomeSystem");
    upgradeLevels[11] = UpgradeLevel("Home Theater", 0.36 ether, 2200, 0, 0.0084 ether, 17.2 ether, "HomeTheater");
    upgradeLevels[12] = UpgradeLevel("Swimming Pool", 0.44 ether, 2000, 0, 0.0088 ether, 20.8 ether, "SwimmingPool");
    upgradeLevels[13] = UpgradeLevel("Guest House", 0.52 ether, 1800, 0, 0.0092 ether, 24.8 ether, "GuestHouse");
    upgradeLevels[14] = UpgradeLevel("Private Dock", 0.60 ether, 1600, 0, 0.0096 ether, 29.2 ether, "PrivateDock");
    upgradeLevels[15] = UpgradeLevel("Game Room", 0.72 ether, 1400, 0, 0.01 ether, 34.0 ether, "GameRoom");
    upgradeLevels[16] = UpgradeLevel("Private Garden", 0.84 ether, 1200, 0, 0.0104 ether, 39.2 ether, "PrivateGarden");
    upgradeLevels[17] = UpgradeLevel("Personal Office Suite", 1.00 ether, 1000, 0, 0.0108 ether, 44.8 ether, "PersonalOfficeSuite");
    upgradeLevels[18] = UpgradeLevel("Wine Cellar", 1.20 ether, 800, 0, 0.0112 ether, 50.8 ether, "WineCellar");
    upgradeLevels[19] = UpgradeLevel("Penthouse Suite", 1.60 ether, 500, 0, 0.012 ether, 57.2 ether, "PenthouseSuite");
}

    using Strings for uint256;

    struct UpgradeLevel {
        string name;
        uint256 yieldIncrease;
        uint256 maxSupply;
        uint256 minted;
        uint256 mintCostEth;
        uint256 mintCostGameTokens;
        string uriSuffix;
    }

    string private _baseURIExtended;
    address private brokerageAddress;
    address private _gameToken;
    IUniswapV2Router02 private router;
    IWNATIVE private wnative;

    UpgradeLevel[20] private upgradeLevels;
    uint256 public currentLevel;

    mapping(uint256 => uint256) private _tokenLevel;
    mapping(uint256 => uint256) private _tokenYield;
    mapping(uint256 => string) private _tokenName;

    event Minted(
        address indexed to,
        uint256 indexed tokenId,
        string levelName,
        uint256 yieldIncrease
    );
    event LevelAdvanced(uint256 newLevel);
    event TokensBurned(address indexed burner, uint256 amount);

    constructor(
        address brokerage,
        string memory initialBaseURI,
        address gameToken,
        address routerAddress,
        address wnativeAddress
    ) ERC721("UpgradeNFT", "UPNFT") Ownable(msg.sender) {
        _initializeLevels();
        brokerageAddress = brokerage;
        _baseURIExtended = initialBaseURI;
        _gameToken = gameToken;
        router = IUniswapV2Router02(routerAddress);
        wnative = IWNATIVE(wnativeAddress);
        _setDefaultRoyalty(brokerage, 250);
        currentLevel = 0;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIExtended;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseURIExtended = newBaseURI;
    }

    function setRoyaltyInfo(address receiver, uint96 feeNumerator)
        external
        onlyOwner
    {
        require(feeNumerator <= 10000, "Fee exceeds maximum");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function updateLevel(
        uint256 level,
        string memory levelName,
        uint256 yieldIncrease,
        uint256 maxSupply,
        uint256 mintCostEth,
        uint256 mintCostGameTokens,
        string memory uriSuffix
    ) external onlyOwner {
        require(level < 20, "UpgradeNFT: Invalid level");
        upgradeLevels[level] = UpgradeLevel(
            levelName,
            yieldIncrease,
            maxSupply,
            upgradeLevels[level].minted,
            mintCostEth,
            mintCostGameTokens,
            uriSuffix
        );
    }

    function getLevelInfo(uint256 level)
        external
        view
        returns (UpgradeLevel memory)
    {
        require(level < 20, "UpgradeNFT: Invalid level");
        return upgradeLevels[level];
    }

    function advanceLevel() external onlyOwner {
        require(currentLevel < 19, "UpgradeNFT: Already at the last level");
        UpgradeLevel storage lvl = upgradeLevels[currentLevel];
        require(
            lvl.minted == lvl.maxSupply,
            "UpgradeNFT: Current level not fully minted"
        );
        currentLevel += 1;
        emit LevelAdvanced(currentLevel);
    }

    function mint(uint256 quantity) external payable nonReentrant {
        require(quantity > 0, "UpgradeNFT: Quantity must be greater than 0");

        UpgradeLevel storage lvl = upgradeLevels[currentLevel];
        require(
            lvl.minted + quantity <= lvl.maxSupply,
            "UpgradeNFT: Exceeds max supply for current level"
        );

        uint256 totalMintCostEth = lvl.mintCostEth * quantity;
        uint256 totalMintCostGameTokens = lvl.mintCostGameTokens * quantity;

        require(
            msg.value >= totalMintCostEth,
            "UpgradeNFT: Insufficient Ether sent"
        );

        if (totalMintCostGameTokens > 0) {
            require(_gameToken != address(0), "UpgradeNFT: Game token not set");
            bool success = IERC20(_gameToken).transferFrom(
                msg.sender,
                address(this),
                totalMintCostGameTokens
            );
            require(success, "UpgradeNFT: Game token transfer failed");
        }

        _handlePayment(totalMintCostEth, totalMintCostGameTokens);

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = (currentLevel + 1) * 1e4 + lvl.minted;
            _safeMint(msg.sender, tokenId);

            _tokenLevel[tokenId] = currentLevel + 1;
            _tokenYield[tokenId] = lvl.yieldIncrease;
            _tokenName[tokenId] = lvl.name;

            lvl.minted += 1;

            emit Minted(msg.sender, tokenId, lvl.name, lvl.yieldIncrease);
        }
    }

    function _handlePayment(uint256 ethAmount, uint256 gameTokenAmount)
        internal
    {
        if (gameTokenAmount > 0) {
            uint256 brokerageGameTokenFee = (gameTokenAmount * 500) / 10000;
            IERC20(_gameToken).approve(address(router), brokerageGameTokenFee);

            address[] memory path = new address[](2);
            path[0] = _gameToken;
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

            (bool brokerageSuccess, ) = brokerageAddress.call{
                value: brokerageEthFee
            }("");
            require(brokerageSuccess, "Brokerage ETH transfer failed");

            if (remainingEth > 0) {
                wnative.deposit{value: remainingEth}();

                uint256 WNATIVEBalance = IERC20(address(wnative)).balanceOf(
                    address(this)
                );
                IERC20(address(wnative)).approve(
                    address(router),
                    WNATIVEBalance
                );

                address[] memory path = new address[](2);
                path[0] = address(wnative);
                path[1] = _gameToken;

                router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                    WNATIVEBalance,
                    0,
                    path,
                    address(this),
                    block.timestamp
                );

                uint256 burnAmount = IERC20(_gameToken).balanceOf(
                    address(this)
                );
                if (burnAmount > 0) {
                    ERC20Burnable(_gameToken).burn(burnAmount);
                    emit TokensBurned(msg.sender, burnAmount);
                }
            }
        }
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        uint256 level = _tokenLevel[tokenId];
        string memory suffix = upgradeLevels[level - 1].uriSuffix;
        return string(abi.encodePacked(_baseURIExtended, suffix));
    }

    function brokerageDeployment(uint256 quantity, address recipient)
    external
    onlyOwner
    nonReentrant
{
    require(quantity > 0, "UpgradeNFT: Quantity must be greater than 0");

    UpgradeLevel storage lvl = upgradeLevels[currentLevel];
    require(
        lvl.minted + quantity <= lvl.maxSupply,
        "UpgradeNFT: Exceeds max supply for current level"
    );

    for (uint256 i = 0; i < quantity; i++) {
        uint256 tokenId = (currentLevel + 1) * 1e4 + lvl.minted;

        // Mint the token using `_safeMint` to ensure ERC721Enumerable tracking
        _safeMint(recipient, tokenId);

        // Update metadata mappings
        _tokenLevel[tokenId] = currentLevel + 1;
        _tokenYield[tokenId] = lvl.yieldIncrease;
        _tokenName[tokenId] = lvl.name;

        lvl.minted += 1;

        emit Minted(recipient, tokenId, lvl.name, lvl.yieldIncrease);
    }
}


    function getUpgradeInfoByTokenId(uint256 tokenId)
        external
        view
        returns (
            uint256 level,
            string memory name,
            uint256 yieldIncrease
        )
    {
        require(
            ownerOf(tokenId) != address(0),
            "UpgradeNFT: Query for nonexistent token"
        );

        level = _tokenLevel[tokenId];
        require(
            level > 0 && level <= upgradeLevels.length,
            "UpgradeNFT: Invalid level"
        );

        UpgradeLevel memory upgrade = upgradeLevels[level - 1];

        name = upgrade.name;
        yieldIncrease = upgrade.yieldIncrease;
    }
}
