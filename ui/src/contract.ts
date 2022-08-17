import { ethers } from "ethers";
import address from './artifacts/address.json';
import OTP from './artifacts/OTP.json';
import OTPFactory from './artifacts/OTPFactory.json';
import { generateCalldata } from './circuit_js/generate_calldata';

let factory: ethers.Contract;
let otp: ethers.Contract;

export async function connectContract(addr: string) {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    console.log('signer: ', await signer.getAddress());

    otp = new ethers.Contract(addr, OTP.abi, signer);

    console.log("Connect to OTP Contract:", OTP);
}

export async function connectFactory() {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    console.log('signer: ', await signer.getAddress());

    factory = new ethers.Contract(address['OTPFactory'], OTPFactory.abi, signer);

    console.log("Connect to OTPFactory Contract:", OTPFactory);
}

export async function deployOTP(root: BigInt) {
    await connectFactory();

    let Tx = await factory.createOTP(address['Verifier'], root);
    let tx = await Tx.wait();

    let deployedAddress = tx.events[0].args.newAddress;

    localStorage.setItem("OTPaddress", deployedAddress);

    return deployedAddress;
}

export async function naiveProof(input: Object) {

    if (localStorage.getItem('OTPaddress')) {
        console.log(localStorage.getItem('OTPaddress'));
        await connectContract(localStorage.getItem('OTPaddress')!);
    } else {
        throw "No OTP contract address found. Deploy first."
    }

    let calldata = await generateCalldata(input);
    let tx;

    if (calldata) {
        tx = await otp.naiveApproval(calldata[0], calldata[1], calldata[2], calldata[3])
            .catch((error: any) => {
                console.log(error);
                let errorMsg;
                if (error.reason) {
                    errorMsg = error.reason;
                } else if (error.data.message) {
                    errorMsg = error.data.message;
                } else {
                    errorMsg = "Unknown error."
                }
                throw errorMsg;
            });
    } else {
        throw "Witness generation failed.";
    }
    return tx;
}

export async function blockTimestampProof(input: Object) {

    if (localStorage.getItem('OTPaddress')) {
        console.log(localStorage.getItem('OTPaddress'));
        await connectContract(localStorage.getItem('OTPaddress')!);
    } else {
        throw "No OTP contract address found. Deploy first."
    }

    let calldata = await generateCalldata(input);
    let tx;

    if (calldata) {
        tx = await otp.blockApproval(calldata[0], calldata[1], calldata[2], calldata[3])
            .catch((error: any) => {
                console.log(error);
                let errorMsg;
                if (error.reason) {
                    errorMsg = error.reason;
                } else if (error.data.message) {
                    errorMsg = error.data.message;
                } else {
                    errorMsg = "Unknown error."
                }
                throw errorMsg;
            });
    } else {
        throw "Witness generation failed.";
    }
    return tx;
}