const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");
const wasm_tester = require("circom_tester").wasm;
const totp = require("totp-generator");
const { buildPoseidon } = require('circomlibjs');

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const startTime = Math.floor(Date.now()/30000 - 1)*30000; 

const abi = require("../artifacts/contracts/OTP.sol/OTP.json");

let INPUT;

describe("Circuit test", function () {
        
    let tokens = {};
    let hashes = [];

    let root;
    let time;

    let poseidon;

    before(async function () {

        poseidon = await buildPoseidon();

        for (var i=0; i<2**7; i++) {
            time = startTime+i*30000;
            let token = totp(SECRET, { timestamp: time });
            tokens[time] = token;
            hashes.push(poseidon.F.toObject(poseidon([BigInt(time),BigInt(token)])));
        }
        //console.log(tokens);
        //console.log(hashes);
        
        // compute root
        let k = 0;
        
        for (var i=2**7; i < 2**8-1; i++) {
            hashes.push(poseidon.F.toObject(poseidon([hashes[k*2],hashes[k*2+1]])));
            k++;
        }
        root = hashes[2**8-2];
        console.log("Merkle root:", root);
    });

    it("Circuit test on leftmost path", async () => {
        const circuit = await wasm_tester("circuits/circuit.circom");

        let currentIndex = 1;
        let pathElements = [hashes[currentIndex]];

        for (var i=7; i>1; i--) {
            currentIndex = currentIndex + 2**i;
            pathElements.push(hashes[currentIndex]);
        }

        INPUT = {
            "time": startTime,
            "otp": tokens[startTime],
            "path_elements": pathElements,
            "path_index": ["0","0","0","0","0","0","0"]
        }

        console.log("Time:", INPUT.time);
        console.log("OTP:", INPUT.otp);

        const witness = await circuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(root)));
        assert(Fr.eq(Fr.e(witness[2]),Fr.e(startTime)));

    });

    it("Circuit test on rightmost path", async () => {
        const circuit = await wasm_tester("circuits/circuit.circom");

        let currentIndex = 2**7-2;
        let pathElements = [hashes[currentIndex]];

        for (var i=6; i>0; i--) {
            //console.log(currentIndex);
            currentIndex = currentIndex + 2**i;
            pathElements.push(hashes[currentIndex]);
        }

        INPUT = {
            "time": time,
            "otp": tokens[time],
            "path_elements": pathElements,
            "path_index": ["1","1","1","1","1","1","1"]
        }

        console.log("Time:", INPUT.time);
        console.log("OTP:", INPUT.otp);

        const witness = await circuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(root)));
        assert(Fr.eq(Fr.e(witness[2]),Fr.e(time)));

    });

    it("Circuit test on current time", async () => {
        let currentTime = Math.floor(Date.now()/30000)*30000; 
        //console.log(tokens[currentTime]);

        let currentNode = poseidon.F.toObject(poseidon([BigInt(currentTime),BigInt(tokens[currentTime])]));
        //console.log(currentNode);

        let pathElements = [];
        let pathIndex = [];

        for (var i=0; i<7; i++) {
            if (hashes.indexOf(currentNode)%2==0) {
                pathIndex.push(0);
                let currentIndex = hashes.indexOf(currentNode) + 1;
                //console.log(currentIndex);
                pathElements.push(hashes[currentIndex]);
                currentNode = poseidon.F.toObject(poseidon([hashes[currentIndex-1], hashes[currentIndex]]));
            } else {
                pathIndex.push(1);
                let currentIndex = hashes.indexOf(currentNode) - 1;
                //console.log(currentIndex);
                pathElements.push(hashes[currentIndex]);
                currentNode = poseidon.F.toObject(poseidon([hashes[currentIndex], hashes[currentIndex+1]]));
            }
        }

        const circuit = await wasm_tester("circuits/circuit.circom");

        INPUT = {
            "time": currentTime,
            "otp": tokens[currentTime],
            "path_elements": pathElements,
            "path_index": pathIndex
        }

        console.log("Time:", INPUT.time);
        console.log("OTP:", INPUT.otp);

        const witness = await circuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(root)));
        assert(Fr.eq(Fr.e(witness[2]),Fr.e(currentTime)));

    });
});

describe("Verifier Contract", function () {
    let Verifier;
    let verifier;

    before(async function () {
        Verifier = await ethers.getContractFactory("Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proofs", async function () {

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/circuit_js/circuit.wasm","circuits/build/circuit_final.zkey");

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        console.log("Proof root: ", Input[0]);
        console.log("Proof time: ", Input[1]);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        const a = [0, 0];
        const b = [[0, 0], [0, 0]];
        const c = [0, 0];
        const d = [0, 0];
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});

describe("OTP Contract", function () {
    let OTP;
    let otp;
    
    let tokens = {};
    let hashes = [];

    beforeEach(async function () {
        let poseidon = await buildPoseidon();

        for (var i=0; i<2**7; i++) {
            let time = startTime+i*30000;
            token = totp(SECRET, { timestamp: time });
            tokens[time] = token;
            hashes.push(poseidon.F.toObject(poseidon([BigInt(time),BigInt(token)])));
        }
        //console.log(tokens);
        //console.log(hashes);
        
        // compute root
        let k = 0;
        
        for (var i=2**7; i < 2**8-1; i++) {
            hashes.push(poseidon.F.toObject(poseidon([hashes[k*2],hashes[k*2+1]])));
            k++;
        }
        root = hashes[2**8-2];

        let Verifier = await ethers.getContractFactory("Verifier");
        let verifier = await Verifier.deploy();
        await verifier.deployed();

        OTP = await ethers.getContractFactory("OTP");
        otp = await OTP.deploy(verifier.address, root);
        await otp.deployed();
    });

    it("Naive approval", async function () {
        let currentIndex = 1;
        let pathElements = [hashes[currentIndex]];

        for (var i=7; i>1; i--) {
            currentIndex = currentIndex + 2**i;
            pathElements.push(hashes[currentIndex]);
        }

        INPUT = {
            "time": startTime,
            "otp": tokens[startTime],
            "path_elements": pathElements,
            "path_index": ["0","0","0","0","0","0","0"]
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/circuit_js/circuit.wasm","circuits/build/circuit_final.zkey");

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);
        
        expect(await otp.dummy()).to.equal(0);
        await otp.naiveApproval(a, b, c, Input);
        expect(await otp.dummy()).to.equal(1);
    });

    it("Block timestamp approval", async function () {
        let currentIndex = 1;
        let pathElements = [hashes[currentIndex]];

        for (var i=7; i>1; i--) {
            currentIndex = currentIndex + 2**i;
            pathElements.push(hashes[currentIndex]);
        }

        INPUT = {
            "time": startTime,
            "otp": tokens[startTime],
            "path_elements": pathElements,
            "path_index": ["0","0","0","0","0","0","0"]
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/circuit_js/circuit.wasm","circuits/build/circuit_final.zkey");

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await otp.dummy()).to.equal(0);
        await otp.blockApproval(a, b, c, Input);
        expect(await otp.dummy()).to.equal(1);
    });
});

describe("OTP Factory Contract", function () {
    let otp;
    
    let tokens = {};
    let hashes = [];

    beforeEach(async function () {
        let poseidon = await buildPoseidon();

        for (var i=0; i<2**7; i++) {
            let time = startTime+i*30000;
            token = totp(SECRET, { timestamp: time });
            tokens[time] = token;
            hashes.push(poseidon.F.toObject(poseidon([BigInt(time),BigInt(token)])));
        }
        //console.log(tokens);
        //console.log(hashes);
        
        // compute root
        let k = 0;
        
        for (var i=2**7; i < 2**8-1; i++) {
            hashes.push(poseidon.F.toObject(poseidon([hashes[k*2],hashes[k*2+1]])));
            k++;
        }
        root = hashes[2**8-2];

        Factory = await ethers.getContractFactory("OTPFactory");
        factory = await Factory.deploy();
        await factory.deployed();

        let Verifier = await ethers.getContractFactory("Verifier");
        let verifier = await Verifier.deploy();
        await verifier.deployed();

        let Tx = await factory.createOTP(verifier.address, root);
        let tx = await Tx.wait();

        let address = tx.events[0].args.newAddress;

        let OTP = await ethers.getContractFactory("OTP");
        otp = OTP.attach(address);
    });

    it("Naive approval", async function () {
        let currentIndex = 1;
        let pathElements = [hashes[currentIndex]];

        for (var i=7; i>1; i--) {
            currentIndex = currentIndex + 2**i;
            pathElements.push(hashes[currentIndex]);
        }

        INPUT = {
            "time": startTime,
            "otp": tokens[startTime],
            "path_elements": pathElements,
            "path_index": ["0","0","0","0","0","0","0"]
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/circuit_js/circuit.wasm","circuits/build/circuit_final.zkey");

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);
        
        expect(await otp.dummy()).to.equal(0);
        await otp.naiveApproval(a, b, c, Input);
        expect(await otp.dummy()).to.equal(1);
    });

    it("Block timestamp approval", async function () {
        let currentIndex = 1;
        let pathElements = [hashes[currentIndex]];

        for (var i=7; i>1; i--) {
            currentIndex = currentIndex + 2**i;
            pathElements.push(hashes[currentIndex]);
        }

        INPUT = {
            "time": startTime,
            "otp": tokens[startTime],
            "path_elements": pathElements,
            "path_index": ["0","0","0","0","0","0","0"]
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/circuit_js/circuit.wasm","circuits/build/circuit_final.zkey");

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await otp.dummy()).to.equal(0);
        await otp.blockApproval(a, b, c, Input);
        expect(await otp.dummy()).to.equal(1);
    });
});