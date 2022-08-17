import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { deployOTP } from "../contract";
import Loading from "./components/Loading";
import { Typography } from "@mui/material";
import { generateMerkleTree } from "../util";

export default function Deploy() {

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [Deploying, setDeploying] = useState(false);

    const [address, setAddress] = useState("");
    const [secret, setSecret] = useState("");
    const [uri, setURI] = useState("");

    const [deployed, setDeployed] = useState(false);

    const deploy = async (event: any) => {
        event.preventDefault();
        setError(false);
        setDeployed(false);

        setDeploying(true);

        let [_uri, _secret, root] = await generateMerkleTree();

        setSecret(_secret);
        setURI(_uri);
        
        setAddress(await deployOTP(root)
            .catch((error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setDeploying(false);
                throw error;
            }));
        setDeploying(false);
        setDeployed(true);
        event.preventDefault();
    }

    return (
        <Box
            component="form"
            sx={{
                "& .MuiTextField-root": { m: 1, width: "25ch" },
                width: "99%", maxWidth: 600, margin: 'auto'
            }}
            noValidate
            autoComplete="off"
            textAlign="center"
        >
            <Button
                onClick={deploy}
                variant="contained">
                Deploy
            </Button>
            <br /><br />
            {Deploying ? <Loading text="Deploying OTP contract..." /> : <div />}
            {error ? <Alert severity="error" sx={{ textAlign: "left" }}>{errorMsg}</Alert> : <div />}
            {deployed ? <Typography>Scan the QR code using Google Authenticator or manually input the setup key.</Typography> : <div />}
            {deployed ? <Typography>OTP contract address: {address}</Typography> : <div />}
            {deployed ? <Typography>Setup key: {secret}</Typography> : <div />}
            {deployed ? <figure><img src={uri} width="100%" alt="" /><figcaption>QR code</figcaption></figure> : <div />}
        </Box>
    );
}