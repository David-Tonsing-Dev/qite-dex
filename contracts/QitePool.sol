// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./QiteLiquidityToken.sol";

contract QitePool {
    address public token;
    uint256 public ethwReserve;
    uint256 public tokenReserve;
    QiteLiquidityToken public liquidityToken;

    event AddLiquidity(address indexed provider, uint256 ethwAmount, uint256 tokenAmount, uint256 liquidity);
    event RemoveLiquidity(address indexed provider, uint256 ethwAmount, uint256 tokenAmount, uint256 liquidity);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut);

    constructor(address _token, string memory _name, string memory _symbol) {
        token = _token;
        liquidityToken = new QiteLiquidityToken(_name, _symbol);
    }

    receive() external payable {}

    function addLiquidity(uint256 tokenAmount) external payable {
        uint256 ethwAmount = msg.value;
        require(ethwAmount > 0 && tokenAmount > 0, "Invalid amounts");

        uint256 liquidity;
        if (ethwReserve == 0 && tokenReserve == 0) {
            liquidity = ethwAmount;
        } else {
            liquidity = (ethwAmount * liquidityToken.totalSupply()) / ethwReserve;
            require((tokenAmount * liquidityToken.totalSupply()) / tokenReserve == liquidity, "Invalid ratio");
        }

        liquidityToken.mint(msg.sender, liquidity);

        ethwReserve += ethwAmount;
        tokenReserve += tokenAmount;

        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        emit AddLiquidity(msg.sender, ethwAmount, tokenAmount, liquidity);
    }

    function removeLiquidity(uint256 liquidity) external {
        require(liquidity > 0, "Invalid liquidity");
        uint256 totalSupply = liquidityToken.totalSupply();

        uint256 ethwAmount = (liquidity * ethwReserve) / totalSupply;
        uint256 tokenAmount = (liquidity * tokenReserve) / totalSupply;

        liquidityToken.burn(msg.sender, liquidity);

        ethwReserve -= ethwAmount;
        tokenReserve -= tokenAmount;

        payable(msg.sender).transfer(ethwAmount);
        IERC20(token).transfer(msg.sender, tokenAmount);

        emit RemoveLiquidity(msg.sender, ethwAmount, tokenAmount, liquidity);
    }

    function swapTokens(bool isEthwToToken, uint256 amountIn, uint256 minAmountOut) external payable {
        uint256 amountOut;
        if (isEthwToToken) {
            require(msg.value == amountIn, "ETHW mismatch");
            uint256 amountInWithFee = (amountIn * 997) / 1000;
            amountOut = (amountInWithFee * tokenReserve) / (ethwReserve + amountInWithFee);
            require(amountOut >= minAmountOut, "Slippage exceeded");

            ethwReserve += amountIn;
            tokenReserve -= amountOut;

            IERC20(token).transfer(msg.sender, amountOut);
        } else {
            uint256 amountInWithFee = (amountIn * 997) / 1000;
            amountOut = (amountInWithFee * ethwReserve) / (tokenReserve + amountInWithFee);
            require(amountOut >= minAmountOut, "Slippage exceeded");

            ethwReserve -= amountOut;
            tokenReserve += amountIn;

            IERC20(token).transferFrom(msg.sender, address(this), amountIn);
            payable(msg.sender).transfer(amountOut);
        }

        emit Swap(msg.sender, amountIn, amountOut);
    }

    function getTokenPrice() external view returns (uint256 priceInEthw, uint256 priceInToken) {
        if (ethwReserve == 0 || tokenReserve == 0) {
            return (0, 0); // Return zero prices if reserves are empty
        }
        priceInEthw = (ethwReserve * 1e18) / tokenReserve; // Token price in terms of ETHW
        priceInToken = (tokenReserve * 1e18) / ethwReserve; // ETHW price in terms of token
    }
}
