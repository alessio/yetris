import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  parseAnyRPCResponse,
} from "@yellow-org/sdk-compat";
import WebSocket from "ws";
import { walletClient } from "../constants";
import { env } from "../constants/env";

let brokerWS: WebSocket | null;

// Get broker WebSocket connection
export function getBrokerWebSocket(): WebSocket | null {
  return brokerWS;
}

export const getAuthMessage = async () => {
  const authRequestMsg = await createAuthRequestMessage({
    address: walletClient.account.address,
    session_key: walletClient.account.address,
    application: env.APP_NAME,
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour expiration
    scope: "console",
    allowances: [],
  });

  return authRequestMsg;
};

const eip712MessageSigner = createEIP712AuthMessageSigner(
  walletClient,
  {
    scope: "console",
    session_key: walletClient.account.address,
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
    allowances: [],
  },
  { name: env.APP_NAME },
);

export const runNitroWS = () => {
  const ws = new WebSocket("wss://clearnet.yellow.com/ws");
  brokerWS = ws;

  ws.onopen = async () => {
    console.log("WebSocket connection established");

    // we send the ws server an auth request
    const authMessage = await getAuthMessage();
    ws.send(authMessage);
  };

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event?.data.toString());
      console.log("Received message:", JSON.stringify(message, undefined, 2));

      // the server responds with the auth challenge
      if (message.res && message.res[1] === "auth_challenge") {
        console.log("Received auth challenge");

        const parsed = parseAnyRPCResponse(event.data.toString());

        const authVerifyMsg = await createAuthVerifyMessage(
          eip712MessageSigner,
          { params: { challengeMessage: parsed.params.challengeMessage } },
        );

        ws.send(authVerifyMsg);
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
