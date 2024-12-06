// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QiteSwap.sol";

contract QiteRouter {
    QiteSwap public qiteSwap;

    constructor(address _qiteSwap) {
        qiteSwap = QiteSwap(_qiteSwap);
    }

    function addLiquidity(
        address token1,
        address token2,
        uint256 amount1,
        uint256 amount2
    ) external {
        address pool = qiteSwap.getPair(token1, token2);
        require(pool != address(0), "Pair not found");

        IERC20(token1).transferFrom(msg.sender, pool, amount1);
        IERC20(token2).transferFrom(msg.sender, pool, amount2);

        QitePool(pool).addLiquidity(amount1, amount2);
    }

    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external {
        address pool = qiteSwap.getPair(tokenIn, tokenOut);
        require(pool != address(0), "Pair not found");

        IERC20(tokenIn).transferFrom(msg.sender, pool, amountIn);

        uint256 amountOut = QitePool(pool).swapTokens(
            tokenIn,
            tokenOut,
            amountIn
        );
        require(amountOut >= minAmountOut, "Slippage exceeded");

        IERC20(tokenOut).transfer(msg.sender, amountOut);
    }
}
