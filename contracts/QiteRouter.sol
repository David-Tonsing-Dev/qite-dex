// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QiteSwap.sol";
import "./IPriceOracle.sol";

contract QiteRouter {
    QiteSwap public qiteSwap;
    IPriceOracle public priceOracle;

    constructor(address _qiteSwap, address _priceOracle) {
        qiteSwap = QiteSwap(_qiteSwap);
        priceOracle = IPriceOracle(_priceOracle);
    }

    function addLiquidity(address token, uint256 tokenAmount) external payable {
        address payable pool = payable(qiteSwap.getPair(token));
        require(pool != address(0), "Pool not found");

        uint256 ethwPrice = priceOracle.getLatestPrice(); // Scaled to 1e8
        uint256 tokenPrice = 1e8; // Assuming token = $1
        uint256 tokenRequired = (msg.value * ethwPrice) / tokenPrice;

        require(tokenAmount >= tokenRequired, "Incorrect token ratio");
        IERC20(token).transferFrom(msg.sender, pool, tokenRequired);

        QitePool(pool).addLiquidity{value: msg.value}(tokenRequired);
    }

    function swap(
        bool isEthwToToken,
        address token,
        uint256 amountIn,
        uint256 minAmountOut
    ) external payable {
        address payable pool = payable(qiteSwap.getPair(token));
        require(pool != address(0), "Pool not found");

        QitePool(pool).swapTokens{value: msg.value}(isEthwToToken, amountIn, minAmountOut);
    }
}
