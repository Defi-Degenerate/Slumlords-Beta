// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameToken is ERC20Burnable, Ownable {
    address public portfolioContract;
    bool public liquidityPoolTokensMinted = false;
    bool public promotionalTokensMinted = false;
    bool public brokerageTokensMinted = false;

    uint256 public constant Max_LP = 125_000 * 10**18;
    uint256 public constant Max_Promo = 50_000 * 10**18;
    uint256 public constant Brokerage_Deployment = 15_000 * 10**18;

    event TokensMinted(address indexed recipient, uint256 amount);

    constructor() ERC20("Slumlords The Game", "RENT") Ownable(msg.sender) {}

    function setPortfolioContract(address _portfolioContract) external onlyOwner {
        portfolioContract = _portfolioContract;
    }

    function mintLiquidityPoolTokens(address to, uint256 amount) external onlyOwner {
        require(!liquidityPoolTokensMinted, "LP tokens already minted");
        require(amount <= Max_LP, "Cannot exceed LP token cap");
        liquidityPoolTokensMinted = true;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function mintPromotionalTokens(address to, uint256 amount) external onlyOwner {
        require(!promotionalTokensMinted, "Promotional tokens already minted");
        require(amount <= Max_Promo, "Cannot exceed promotional token cap");
        promotionalTokensMinted = true;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function mintBrokerageTokens(address to, uint256 amount) external onlyOwner {
        require(!brokerageTokensMinted, "Brokerage tokens already minted");
        require(amount <= Brokerage_Deployment, "Cannot exceed brokerage token cap");
        brokerageTokensMinted = true;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == portfolioContract, "Only the portfolio contract can mint");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}
