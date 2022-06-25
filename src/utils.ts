import { AccountId } from "caip";
import LitJsSdk from "lit-js-sdk";

const CHAINS: Record<string, string> = Object.keys(LitJsSdk.LIT_CHAINS)
  .map((k) => {
    return { [LitJsSdk.LIT_CHAINS[k].chainId.toString()]: k };
  })
  .reduce((prev, cur) => {
    return { ...prev, ...cur };
  });

export function getChainFromAccountId(accountId: AccountId) {
  if (accountId.chainId.namespace === "eip155") {
    return CHAINS[accountId.chainId.reference];
  } else if (accountId.chainId.namespace === "solana") {
    return "solana";
  } else {
    throw new Error("Unknown chain");
  }
}
