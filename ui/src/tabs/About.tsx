import ReactMarkdown from 'react-markdown';

export default function About() {

  const md = `
  # zkOTP: Zero-Knowledge OTP verification on chain

  ## Motivation
  Inspired by SmartOTP and Modulo's [1wallet](https://github.com/polymorpher/one-wallet), a zkOTP solution can manage access to a smart contract wallet and provide new web3 users with an authentication method that they are already familiar with using Google Authenticator.

  ## Design
  The design is based on the [list of assumptions on 1wallet's wiki](https://github.com/polymorpher/one-wallet/wiki#assumptions), but implemented by Merkle inclusion proof using Circom. See implementation [here](https://github.com/socathie/zkOTP/blob/master/hardhat/circuits/circuit.circom).

  During setup, a secret seed thus a list of future timestamps and the corresponding TOTPs (currently 2^7=128 ~ 1 hour) are generated, hashed together to form the leaves of a 7-layer Merkle tree, and the Merkle root is committed onto the blockchain. The secret seed will then be discarded after the user adds it to their Google Authenticator app. The Merkle tree and deployed contract address are stored in local storage of the browser.

  During authentication, the user should input the current OTP shown in their app. The corresponding Merkle path and proof will be generated. Currently for demo purpose, a dummy smart contract (rather than a smart contract wallet) is being called for verification.

  There are two verification methods in the smart contract:
  1. Naive proof: The SC keeps track of the most recent timestamp that was used for verification, and checks that the new proof is after the most recent timestamp. This will behave more like HOTP than TOTP.
  2. Block timestamp proof: The SC checks that the submitted timestamp is after block.timestamp. A more lenient interval might be needed for more busy or slower networks.


  ## Using the app

  The verifier and factory contracts are currently deployed on [Harmony devnet](https://docs.harmony.one/home/developers/network-and-faucets). Visit https://zk-otp.netlify.app to try it out.


  * "Deploy" tab: Click the "DEPLOY" button will generate a new OTP contract with a randomly generated seed. After the contract is deployed, the contract address, the seed, and a QR code will be displayed on screen. Make sure to import into your Google Authenticator app, otherwise you will have to pay the gas fee to deploy a new contract.

  * "Verify" tab: Using the display OTP in your Authenticator app, you can try out both authentication methods mentioned above.

  ## Possible next steps
  * use oracle to get live timestamp from external APIs
  * assess security risks in current design`;

  return (
    <ReactMarkdown children={md}/>
  );
}