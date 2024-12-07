// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    function getLatestPrice() external view returns (uint256); // ETHW price in USD (scaled to 1e8)
}
