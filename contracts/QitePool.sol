// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QiteLiquidityToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract QitePool is ReentrancyGuard {
    using Math for uint256;

    address public token1;
    address public token2;
    uint256 public reserve1;
    uint256 public reserve2;
    uint256 public constantK;

    QiteLiquidityToken public liquidityToken;

    event Swap(
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut,
        address tokenIn,
        address tokenOut
    );
    event AddLiquidity(
        address indexed provider,
        uint256 amount1,
        uint256 amount2,
        uint256 liquidity
    );
    event RemoveLiquidity(
        address indexed provider,
        uint256 amount1,
        uint256 amount2,
        uint256 liquidity
    );

    constructor(
        address _token1,
        address _token2,
        string memory _name,
        string memory _symbol
    ) {
        token1 = _token1;
        token2 = _token2;
        liquidityToken = new QiteLiquidityToken(_name, _symbol);
    }

    function addLiquidity(
        uint256 amountToken1,
        uint256 amountToken2
    ) external nonReentrant {
        uint256 liquidity;
        uint256 totalSupply = liquidityToken.totalSupply();
        if (totalSupply == 0) {
            liquidity = Math.sqrt(amountToken1 * amountToken2);
        } else {
            liquidity = Math.min(
                (amountToken1 * totalSupply) / reserve1,
                (amountToken2 * totalSupply) / reserve2
            );
        }

        require(liquidity > 0, "Insufficient liquidity");
        liquidityToken.mint(msg.sender, liquidity);

        IERC20(token1).transferFrom(msg.sender, address(this), amountToken1);
        IERC20(token2).transferFrom(msg.sender, address(this), amountToken2);

        reserve1 += amountToken1;
        reserve2 += amountToken2;
        _updateConstantK();

        emit AddLiquidity(msg.sender, amountToken1, amountToken2, liquidity);
    }

    function swapTokens(
        address fromToken,
        address toToken,
        uint256 amountIn
    ) external nonReentrant returns (uint256 amountOut) {
        require(
            (fromToken == token1 && toToken == token2) ||
                (fromToken == token2 && toToken == token1),
            "Invalid tokens"
        );

        uint256 reserveIn = (fromToken == token1) ? reserve1 : reserve2;
        uint256 reserveOut = (toToken == token1) ? reserve1 : reserve2;

        uint256 amountInWithFee = (amountIn * 997) / 1000;
        amountOut =
            (amountInWithFee * reserveOut) /
            (reserveIn + amountInWithFee);

        require(amountOut > 0, "Invalid output amount");

        IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn);
        IERC20(toToken).transfer(msg.sender, amountOut);

        if (fromToken == token1) {
            reserve1 += amountIn;
            reserve2 -= amountOut;
        } else {
            reserve2 += amountIn;
            reserve1 -= amountOut;
        }

        _updateConstantK();

        emit Swap(msg.sender, amountIn, amountOut, fromToken, toToken);
    }

    function _updateConstantK() internal {
        constantK = reserve1 * reserve2;
    }
}
