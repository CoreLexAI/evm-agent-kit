import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";

import { SolanaKit } from "../index";

// Network configuration for Solana
const explorerBaseUrls = {
  mainnet: "https://explorer.solana.com",
  devnet: "https://explorer.solana.com?cluster=devnet",
};

const getExplorerUrl = (network: string, type: "tx" | "address", id: string) => {
  const baseUrl = explorerBaseUrls[network] || explorerBaseUrls["mainnet"];
  return `${baseUrl}/${type}/${id}`;
};

/**
 * This tool is used to get the balance of a Solana wallet.
 */
const balanceSchema = z.object({
  address: z.string().describe("The Solana wallet address to check balance for."),
});

export class solanaBalanceTool extends DynamicStructuredTool {
  constructor(private solanaKit: SolanaKit) {
    const fields = {
      name: "solana_balance",
      description: "Get the native SOL balance of a wallet.",
      schema: balanceSchema,
      func: async (params: z.infer<typeof balanceSchema>) => {
        const balance = await this.solanaKit.getBalance(params.address);
        return `${balance} SOL`;
      },
    };
    super(fields);
  }
}

/**
 * This tool is used to transfer SOL or SPL tokens to another address.
 */
const transferSchema = z.object({
  to: z.string().describe("The wallet address to transfer to."),
  amount: z.string().describe("The amount of tokens to transfer."),
  tokenAddress: z
    .string()
    .describe("The SPL token address to transfer.")
    .optional(),
});

export class solanaTransferTool extends DynamicStructuredTool {
  constructor(private solanaKit: SolanaKit) {
    const fields = {
      name: "solana_transfer",
      description: "Transfer SOL or SPL tokens to another address.",
      schema: transferSchema,
      func: async (params: z.infer<typeof transferSchema>) => {
        try {
          if (!params.tokenAddress) {
            const tx = await this.solanaKit.transferSOL(params.to, params.amount);
            return `Transaction sent. View on ${getExplorerUrl(
              process.env.SOLANA_NETWORK!,
              "tx",
              tx
            )}`;
          } else {
            const tx = await this.solanaKit.transferSPL(
              params.tokenAddress,
              params.to,
              params.amount
            );
            return `Transaction sent. View on ${getExplorerUrl(
              process.env.SOLANA_NETWORK!,
              "tx",
              tx
            )}`;
          }
        } catch (error: any) {
          return JSON.stringify({
            status: "error",
            message: error.message,
          });
        }
      },
    };
    super(fields);
  }
}

export const createSolanaTools = (solanaKit: SolanaKit) => {
  return [
    new solanaBalanceTool(solanaKit),
    new solanaTransferTool(solanaKit),
  ];
};
