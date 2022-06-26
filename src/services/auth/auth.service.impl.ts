import { ServiceResponse } from "../service-response";
import { AuthSession, AuthService } from "./auth.service";
import LitJsSdk from "lit-js-sdk";
import { signMessage } from "lit-js-sdk/src/utils/eth";
import { AccountId } from "caip";
import { getChainFromAccountId } from "../../utils";
import { ApiServiceImpl } from "../core/api.service.impl";
import { createDIDKey } from "@glazed/did-session";
import { Cacao } from "ceramic-cacao";
import { Web3Provider } from "@ethersproject/providers";
import Web3Modal from "web3modal";
import { SiweMessage } from "lit-siwe";
import { DID } from "dids";

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

      const web3Modal = new Web3Modal();
      const instance = await web3Modal.connect();
      const web3Provider = new Web3Provider(instance);

      const account = await web3Provider.getSigner().getAddress();
      const network = await web3Provider.getNetwork();
      const chainId: number = network.chainId;
      const accountId = new AccountId({
        chainId: {
          namespace: "eip155",
          reference: chainId.toString(),
        },
        address: account,
      });

      const didKey = await createDIDKey();
      const siweMessage = await this.generateSiweMessage(
        web3Provider,
        accountId,
        didKey
      );

      this.authSession = {
        accessToken: await this.getLitToken(accountId, siweMessage),
        accountId: accountId,
        did: didKey,
        // cacao: cacao,
      };

      return this.success<AuthSession>(this.authSession);
    } catch (e) {
      return this.error<AuthSession>(e);
    }
  }

  private async generateSiweMessage(
    provider: Web3Provider,
    accountId: AccountId,
    sessionDID: DID
  ) {
    const preparedMessage = {
      domain: globalThis.location.host,
      address: accountId.address,
      uri: sessionDID.id,
      version: "1",
      chainId: Number(accountId.chainId.reference),
    };

    const message = new SiweMessage(preparedMessage);

    const body = message.prepareMessage();

    const signedResult = await signMessage({
      body,
      provider,
      account: accountId.address,
    });

    message.signature = signedResult.signature;
    return message;
  }

  private async getLitToken(accountId: AccountId, siweMessage: SiweMessage) {
    const litChain = getChainFromAccountId(accountId);

    const authSig = {
      sig: siweMessage.signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: siweMessage.prepareMessage(),
      address: siweMessage.address,
    };
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
