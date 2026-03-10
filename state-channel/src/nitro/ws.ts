import { EIP712AuthTypes } from "@yellow-org/sdk-compat";
import WebSocket from "ws";
import { walletClient } from "../constants";
import { env } from "../constants/env";
import { broadcastNetworkLog } from "../broadcast";

let brokerWS: WebSocket | null;

// Get broker WebSocket connection
export function getBrokerWebSocket(): WebSocket | null {
  return brokerWS;
}

function generateRequestId(): number {
  return Math.floor(Date.now() + Math.random() * 10000);
}

export const getAuthMessage = () => {
  const requestId = generateRequestId();
  const timestamp = Math.floor(Date.now() / 1000);
  const walletAddress = walletClient.account.address;

  const params = {
    address: walletAddress,
    session_key: walletAddress,
    application: env.APP_NAME,
    allowances: [],
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    scope: "console",
  };

  const request = {
    req: [requestId, "auth_request", params, timestamp],
    sig: [],
  };

  return JSON.stringify(request);
};

const eip712MessageSigner = async (payload: any[]): Promise<string> => {
  // payload is the req tuple: [requestId, method, params, timestamp]
  const params = payload[2];
  const challenge = params?.challenge ?? params?.[0]?.challenge;

  if (!challenge) {
    throw new Error("Challenge not found in payload");
  }

  const walletAddress = walletClient.account.address;

  const message = {
    challenge,
    scope: "console",
    wallet: walletAddress,
    session_key: walletAddress,
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
    allowances: [],
  };

  const signature = await walletClient.signTypedData({
    account: walletClient.account!,
    domain: { name: env.APP_NAME },
    types: EIP712AuthTypes,
    primaryType: "Policy",
    message,
  });

  return signature;
};

export const runNitroWS = () => {
  const ws = new WebSocket("wss://clearnet.yellow.com/ws");
  brokerWS = ws;

  ws.onopen = async () => {
    console.log("WebSocket connection established");

    const authMessage = getAuthMessage();
    ws.send(authMessage);
    broadcastNetworkLog("sent", JSON.parse(authMessage));
  };

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event?.data.toString());
      console.log("Received message:", JSON.stringify(message, undefined, 2));
      broadcastNetworkLog("received", message);

      // the server responds with the auth challenge
      if (message.res && message.res[1] === "auth_challenge") {
        console.log("Received auth challenge");

        // Extract challenge_message from broker response
        // Broker sends: res[2] = [{challenge_message: "..."}] (array format)
        const challengeData = message.res[2];
        const challengeMessage =
          challengeData?.[0]?.challenge_message ??
          challengeData?.challenge_message;

        if (!challengeMessage) {
          console.error("Could not extract challenge_message from:", challengeData);
          return;
        }

        // Build auth_verify request
        const requestId = generateRequestId();
        const timestamp = Math.floor(Date.now() / 1000);
        const params = { challenge: challengeMessage };
        const req = [requestId, "auth_verify", params, timestamp] as const;

        const signature = await eip712MessageSigner([...req]);

        const verifyRequest = {
          req,
          sig: [signature],
        };

        ws.send(JSON.stringify(verifyRequest));
        broadcastNetworkLog("sent", verifyRequest);
        // handy for debugging
      } else if (message.res && message.res[1] === "error") {
        console.error("Received error from server:");
        console.error(
          "Full error details:",
          JSON.stringify(message.res[2], null, 2),
        );
        console.error("Error array:", message.res[2]);
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = (event) => {
    console.log(`WebSocket closed: ${event.code} ${event.reason}`);
  };
};
