pragma solidity ^0.8.4;

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) external view returns (bool);
}

contract OTP {
    address public immutable verifierAddr;
    uint256 public immutable root;
    uint256 public lastUsedTime = 0;

    uint256 public dummy = 0; // dummy variable for state update

    constructor(address _verifier, uint256 merkleRoot) {
        verifierAddr = _verifier;
        root = merkleRoot;
    }

    modifier isValidProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) {
        require(
            IVerifier(verifierAddr).verifyProof(a, b, c, input),
            "invalid proof"
        );
        require(input[0] == root, "invalid root");
        require(input[1] > lastUsedTime, "old OTP");
        _;
        lastUsedTime = input[1];
    }

    /**
     * @dev Only checks that time in the proof is larger than lastUsedTime, i.e. behaves like HOTP
     */
    function naiveApproval(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public isValidProof(a, b, c, input) {
        ++dummy;
    }

    /**
     * @dev Uses block timestamp to validate time
     */
    function blockApproval(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public isValidProof(a, b, c, input) {
        require(input[1] > block.timestamp, "old OTP");

        ++dummy;
    }
}
