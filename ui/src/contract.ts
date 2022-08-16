import { ethers } from "ethers";
import address from './artifacts/address.json';
import Verifier from './artifacts/Verifier.json';
import { generateCalldata } from './circuit_js/generate_calldata';

let verifier: ethers.Contract;

export async function connectContract() {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    console.log('signer: ', await signer.getAddress());

    verifier = new ethers.Contract(address['Verifier'], Verifier.abi, signer);

    console.log("Connect to Verifier Contract:", Verifier);
}

export async function verifyProof(input: Object) {

    await connectContract();

    let calldata = await generateCalldata(input);

    if (calldata) {
        let valid = await verifier.verifyProof(calldata[0], calldata[1], calldata[2], calldata[3]);
        if (valid) {
            return calldata[3];
        }
        else {
            throw "Invalid proof."
        }
    }
    else {
        throw "Witness generation failed.";
    }
}