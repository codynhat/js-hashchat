import { ServiceResponse } from "../service-response";
import { AuthService } from "./auth.service";
import LitJsSdk from "lit-js-sdk";
import { AccountId } from "caip";
import { getChainFromAccountId } from "../../utils";
import { ApiServiceImpl } from "../core/api.service.impl";

export class AuthServiceImpl extends ApiServiceImpl implements AuthService {
  accountId?: AccountId;
  private litToken?: string;

  async connect(): Promise<ServiceResponse<AccountId>> {
    try {
      const { web3, account } = await LitJsSdk.connectWeb3();
      const resp = await web3.getNetwork();
      const chainId: number = resp.chainId;

      let authSigCheck = localStorage.getItem("lit-auth-signature");
      if (authSigCheck && account !== JSON.parse(authSigCheck).address) {
        this.clearKeys();
      }

      const accountId = new AccountId({
        chainId: {
          namespace: "eip155",
          reference: chainId.toString(),
        },
        address: account,
      });

      this.litToken = await this.getLitToken(accountId);
      this.accountId = accountId;

      return this.success<AccountId>(accountId);
    } catch (e) {
      return this.error<AccountId>(e);
    }
  }

  private async getLitToken(accountId: AccountId) {
    const litChain = getChainFromAccountId(accountId);

    const litClient = new LitJsSdk.LitNodeClient();
    await litClient.connect();

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: litChain,
    });

    const accessControlConditions = this.generateAccessControlCondition(
      accountId,
      authSig.address
    );

    const resourceId = this.generateResource(accountId);

    let litToken;
    try {
      litToken = await litClient.getSignedToken({
        accessControlConditions,
        chain: litChain,
        authSig,
        resourceId,
      });
    } catch (e) {
      await litClient.saveSigningCondition({
        accessControlConditions,
        chain: litChain,
        authSig,
        resourceId,
      });
      litToken = await litClient.getSignedToken({
        accessControlConditions,
        chain: litChain,
        authSig,
        resourceId,
      });
    }
    return litToken;
  }

  private generateAccessControlCondition(
    accountId: AccountId,
    account: string
  ) {
    return [
      {
        contractAddress: "",
        standardContractType: "",
        chain: getChainFromAccountId(accountId),
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: account.toLowerCase(),
        },
      },
    ];
  }

  private generateResource(accountId: AccountId) {
    return {
      baseUrl: "stream.hashchat.xyz",
      path: `/token/${accountId}`,
      orgId: "",
      role: "",
      extraData: "",
    };
  }

  private clearKeys() {
    localStorage.clear();
  }
}
