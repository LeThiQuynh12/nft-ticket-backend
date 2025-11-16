// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTTicket is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)   
    {}

    function mintTicket(address to, string calldata tokenURI_)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }
}
