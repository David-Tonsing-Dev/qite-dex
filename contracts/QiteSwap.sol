// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QitePool.sol";

contract QiteSwap {
    address[] public allPairs;
    mapping(address => mapping(address => address)) public getPair;

    event PairCreated(
        address indexed token1,
        address indexed token2,
        address pair
    );

    function createPairs(
        address token1,
        address token2,
        string calldata token1Name,
        string calldata token2Name
    ) external returns (address) {
        require(token1 != token2, "Identical addresses");
        if (token1 > token2) (token1, token2) = (token2, token1);
        require(getPair[token1][token2] == address(0), "Pair exists");

        string memory name = string(
            abi.encodePacked("Liquidity-", token1Name, "-", token2Name)
        );
        string memory symbol = string(
            abi.encodePacked("LP-", token1Name, "-", token2Name)
        );

        QitePool pool = new QitePool(token1, token2, name, symbol);
        address poolAddress = address(pool);

        require(poolAddress != address(0), "Failed to deploy QitePool");

        getPair[token1][token2] = poolAddress;
        allPairs.push(poolAddress);

        emit PairCreated(token1, token2, poolAddress);
        return poolAddress;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
