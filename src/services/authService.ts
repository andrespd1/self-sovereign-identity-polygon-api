import { DocumentData } from "../types";
import { execSync } from "child_process";
import axios from "axios";
import * as fs from "fs";

const issuerAddress = "https://a3c9-186-31-198-254.ngrok-free.app";
const identifierIssuer =
  "did%3Apolygonid%3Apolygon%3Amumbai%3A2qCz9j9J1oDZuefiyuHZudQS8PvAVYqYWfbnr1D12L";
const credentialSchemaValue =
  "https://raw.githubusercontent.com/uniandes-bancolombia-dapp-project/uniandes-bancolombia-schemas-dapp/main/Udoc/dapp-Udoc.json";
const typeCredentials = "Udoc";
const pathHardhat = "src/resources/hardhat";

const generateClaim = async (
  documentData: DocumentData,
  polygonIdWallet: string,
  isOwner: boolean,
  callback: (data) => void
) => {
  const body = {
    credentialSchema: credentialSchemaValue,
    type: typeCredentials,
    credentialSubject: {
      id: polygonIdWallet,
      documentId: documentData.documentId,
      creationDate: documentData.creationDate,
      description: documentData.description,
      owner: isOwner,
    },
    expiration: 1716516456,
  };

  console.log("[LOG]: Creating claim...");
  const dataClaim = await axios.post(
    issuerAddress + `/v1/${identifierIssuer}/claims`,
    body,
    {
      headers: {
        "Content-Type": "application/json",
        authorization: "Basic dXNlcjpwYXNzd29yZA==",
      },
    }
  );
  console.log("[LOG]: Claim has been created");
  console.log("[LOG]: Generating QR for claim...");
  const jsonClaim = await axios.get(
    issuerAddress +
      `/v1/${identifierIssuer}/claims/${dataClaim.data.id}/qrcode`,
    {
      headers: {
        authorization: "Basic dXNlcjpwYXNzd29yZA==",
      },
    }
  );
  callback(jsonClaim.data);
};

const deployContract = async () => {
  // console.log(execSync(`pwd`).toString());
  // execSync(`cd ${pathHardhat} && npx hardhat compile`, { encoding: "utf-8" });
  return execSync(
    `cd ${pathHardhat} && npx hardhat run --network mumbai scripts/deploy.js`,
    { encoding: "utf-8" }
  )
    .toString()
    .trim();
};

const setRequestToDeployedContract = async (
  contractAddress: string,
  documentId: number
) => {
  fs.readFile(
    "src/resources/hardhat/scripts/set-request.js",
    "utf8",
    function (err, data) {
      if (err) {
        return console.log(err);
      }

      // Find the line with the variable you want to change
      const variable = "const ERC20VerifierAddress";
      const regex = new RegExp(`(${variable} = ).*`, "m");
      const replacement = `$1"${contractAddress}"`;

      const regex2 = /(value: \[\s*)\d+(.*\])/;

      // Replace the variable
      const result = data.replace(regex, replacement);
      const finalResult = result.replace(regex2, `$1${documentId}$2`);

      // Write the result back to the file
      fs.writeFile(
        "src/resources/hardhat/scripts/set-request.js",
        finalResult,
        "utf8",
        function (err) {
          if (err) return console.log(err);
        }
      );
    }
  );
  await setTimeout(() => {
    console.log(
      "[LOG]: Waiting 5 seconds to the contract to be deployed correctly"
    );
    execSync(
      `cd ${pathHardhat} && npx hardhat run --network mumbai scripts/set-request.js`
    )
      .toString()
      .trim();
    console.log("[LOG]: Request has been set");
    // Code to execute after the 2-second delay
  }, 5000);
};

export const getDocumentClaimOwner = async (
  documentData: DocumentData,
  polygonIdWallet: string,
  callback: ({}: any) => void
) => {
  try {
    console.log("[LOG]: Deploying contract...");
    const contractAddress = await deployContract();
    console.log(
      `[LOG]: Contract has been deployed with address: ${contractAddress}`
    );
    console.log("[LOG]: Generating claim for owner...");
    await generateClaim(documentData, polygonIdWallet, true, (data) => {
      callback({
        data: data,
        smartContractId: contractAddress,
      });
    });
    console.log("[LOG]: Setting request to deployed contract...");
    await setRequestToDeployedContract(
      contractAddress,
      documentData.documentId
    );

    console.log("[LOG]: Claim has been generated, returning JSON Data.");
  } catch (error) {
    console.error(`error: ${error.message}`);
  }
};

export const shareDocumentClaim = async (
  documentData: DocumentData,
  polygonIdWallet: string,
  callback: (data: any) => void
) => {
  await generateClaim(documentData, polygonIdWallet, false, (data) => {
    callback(data);
  });
};

export const openDocument = (
  documentIdNumber: number,
  contractAddress: string
) => {
  const request = {
    id: "7f38a193-0918-4a48-9fac-36adfdb8b542",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
    thid: "7f38a193-0918-4a48-9fac-36adfdb8b542",
    body: {
      reason: "document access",
      transaction_data: {
        contract_address: `${contractAddress}`,
        method_id: "b68967e2",
        chain_id: 80001,
        network: "polygon-mumbai",
      },
      scope: [
        {
          id: 1,
          circuitId: "credentialAtomicQuerySigV2OnChain",
          query: {
            allowedIssuers: ["*"],
            context:
              "https://raw.githubusercontent.com/uniandes-bancolombia-dapp-project/uniandes-bancolombia-schemas-dapp/main/Udoc/dapp-Udoc.jsonld",
            credentialSubject: {
              documentId: {
                $eq: parseInt(documentIdNumber.toString()),
              },
            },
            type: "Udoc",
          },
        },
      ],
    },
  };
  console.log(JSON.stringify(request));
  return request;
};
