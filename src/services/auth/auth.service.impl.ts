import { ServiceResponse } from "../service-response";
import { AuthSession, AuthService } from "./auth.service";
import LitJsSdk from "lit-js-sdk";
import { AccountId } from "caip";
import { getChainFromAccountId } from "../../utils";
import { ApiServiceImpl } from "../core/api.service.impl";
import { EthereumAuthProvider } from "@ceramicnetwork/blockchain-utils-linking";
import { createDIDKey } from "@glazed/did-session";
import { Cacao, SiweMessage } from "ceramic-cacao";

export class AuthServiceImpl extends ApiServiceImpl implements AuthService {
  authSession?: AuthSession;
  private litClient: any;

  constructor() {
    super();
    this.litClient = new LitJsSdk.LitNodeClient();
  }

  async connect(): Promise<ServiceResponse<AuthSession>> {
    try {
      await this.litClient.connect();

      const { web3, account } = await LitJsSdk.connectWeb3();
      const resp = await web3.getNetwork();
      const chainId: number = resp.chainId;
      const accountId = new AccountId({
        chainId: {
          namespace: "eip155",
          reference: chainId.toString(),
        },
        address: account,
      });

      const ethereumAuthProvider = new EthereumAuthProvider(web3, account);
      const didKey = await createDIDKey();
      const cacao = await ethereumAuthProvider.requestCapability(didKey.id, []);
      console.log("CACAO");
      console.log(cacao);
      const didWithCap = didKey.withCapability(cacao);
      await didWithCap.authenticate();

      this.authSession = {
        accessToken: await this.getLitToken(accountId, cacao),
        accountId: accountId,
        did: didWithCap,
        cacao: cacao,
      };

      return this.success<AuthSession>(this.authSession);
    } catch (e) {
      return this.error<AuthSession>(e);
    }
  }

  private async getLitToken(accountId: AccountId, cacao: Cacao) {
    const litChain = getChainFromAccountId(accountId);

    const siweMessage = SiweMessage.fromCacao(cacao);
    console.log(siweMessage);

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: litChain,
    });
    console.log(authSig);

    const accessControlConditions = this.generateAccessControlCondition(
      accountId,
      authSig.address
    );

    const resourceId = this.generateResource(accountId);

    let litToken;
    try {
      litToken = await this.litClient.getSignedToken({
        accessControlConditions,
        chain: litChain,
        authSig,
        resourceId,
      });
    } catch (e) {
      await this.litClient.saveSigningCondition({
        accessControlConditions,
        chain: litChain,
        authSig,
        resourceId,
      });
      litToken = await this.litClient.getSignedToken({
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
