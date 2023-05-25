import express from "express";
import { DocumentData } from "../types";
import {
  getDocumentClaimOwner,
  openDocument,
  shareDocumentClaim,
} from "../services/authService";

const auth = express.Router();

auth.post("/documentCredentials", async (req, res) => {
  const documentData: DocumentData = req.body;
  const polygonIdWallet: string = req.query.polygonIdWallet;
  await getDocumentClaimOwner(documentData, polygonIdWallet, (responseBody) => {
    if (responseBody != null) {
      res.status(200).json(responseBody);
    } else {
      res.status(400).json(null);
    }
  });
});

auth.post("/shareDocument", async (req, res) => {
  const documentData: DocumentData = req.body;
  const polygonIdWallet: string = req.query.polygonIdWallet;
  await shareDocumentClaim(documentData, polygonIdWallet, (responseBody) => {
    if (responseBody != null) {
      res.status(200).json(responseBody);
    } else {
      res.status(400).json(null);
    }
  });
});

auth.get("/openDocument", async (req, res) => {
  const documentId: number = req.query.documentId;
  const contractAddress: string = req.query.contractAddress;
  res.status(200).json(openDocument(documentId, contractAddress));
});

export default auth;
