// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureChainNFT {
    struct NFT {
        uint256 id;
        string tokenURI;
        address owner;
        string purpose;
        bool exists;
    }

    mapping(uint256 => NFT) public nfts;
    mapping(address => uint256[]) public userNFTs;
    
    event NFTMinted(uint256 indexed id, address indexed owner, string purpose);
    event NFTTransferred(uint256 indexed id, address indexed from, address indexed to);

    function mintNFT(uint256 _id, string memory _tokenURI, string memory _purpose) public {
        require(!nfts[_id].exists, "NFT ID already exists");
        
        nfts[_id] = NFT({
            id: _id,
            tokenURI: _tokenURI,
            owner: msg.sender,
            purpose: _purpose,
            exists: true
        });

        userNFTs[msg.sender].push(_id);
        emit NFTMinted(_id, msg.sender, _purpose);
    }

    function verifyOwnership(uint256 _id, address _claimer) public view returns (bool) {
        require(nfts[_id].exists, "NFT does not exist");
        return nfts[_id].owner == _claimer;
    }

    function transferNFT(uint256 _id, address _to) public {
        require(nfts[_id].exists, "NFT does not exist");
        require(nfts[_id].owner == msg.sender, "You are not the owner");
        
        nfts[_id].owner = _to;
        userNFTs[_to].push(_id);
        
        // Remove from sender's list (simplified, swapping last element)
        // In prod, use EnumerableSet or mapping
        
        emit NFTTransferred(_id, msg.sender, _to);
    }

    function getNFT(uint256 _id) public view returns (uint256, string memory, address, string memory) {
        require(nfts[_id].exists, "NFT does not exist");
        NFT memory nft = nfts[_id];
        return (nft.id, nft.tokenURI, nft.owner, nft.purpose);
    }
}
