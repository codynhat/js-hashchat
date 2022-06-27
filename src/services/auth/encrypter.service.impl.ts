import { Channel, decodeBase64 } from "stream-chat";
import { AccountId, ChainId, AssetType } from "caip";
import {
  xc20pDirEncrypter,
  xc20pDirDecrypter,
  createJWE,
  decryptJWE,
  JWE,
} from "did-jwt";
import { prepareCleartext, decodeCleartext } from "dag-jose-utils";
import LitJsSdk from "lit-js-sdk";
import { AuthSession } from "../auth/auth.service";
import { ServiceResponse } from "../service-response";
import { ApiServiceImpl } from "../core/api.service.impl";
import { SiweMessage, SignatureType } from "lit-siwe";
import { Cacao } from "ceramic-cacao";
import { base58btc } from "multiformats/bases/base58";
import { EncrypterService } from "./encrypter.service";

export class EncrypterServiceImpl
  extends ApiServiceImpl
  implements EncrypterService
{
  private litClient: any;
  private authSession?: AuthSession;

  constructor() {
    super();
    this.litClient = new LitJsSdk.LitNodeClient();
  }

  authenticate(authSession: AuthSession) {
    this.authSession = authSession;
  }

  get accountId() {
    return this.authSession?.accountId;
  }

  get authSig() {
    const siweMessage = this.authSession
      ? siweFromCacao(this.authSession.cacao)
      : undefined;

    return siweMessage
      ? {
          sig: siweMessage.signature,
          derivedVia: "web3.eth.personal.sign",
          signedMessage: siweMessage.prepareMessage(),
          address: siweMessage.address,
        }
      : undefined;
  }

  async encryptMessage(
    channel: Channel,
    profileTokenId: string,
    payload: Record<string, any>
  ): Promise<ServiceResponse<JWE>> {
    if (!this.authSession) {
      return this.error<JWE>(
        new Error("Encrypter not authenticated. Call authenticate() first")
      );
    }

    try {
      const { kid, symmetricKey } = await this.fetchOrCreateChannelKey(
        channel,
        profileTokenId
      );

      const encryptedMessage = await this.encrypt(payload, kid, symmetricKey);

      return this.success<JWE>(encryptedMessage);
    } catch (e) {
      return this.error<JWE>(e);
    }
  }

  async decryptMessage(
    channel: Channel,
    message: JWE
  ): Promise<ServiceResponse<Record<string, any>>> {
    if (!this.authSession) {
      return this.error<JWE>(
        new Error("Encrypter not authenticated. Call authenticate() first")
      );
    }
    try {
      const { symmetricKey } = await this.fetchKeyFromKid(channel, "", message);
      const decryptedMsg = await this.decrypt(message, symmetricKey);
      return this.success<Record<string, any>>(decryptedMsg);
    } catch (e) {
      return this.error<Record<string, any>>(e);
    }
  }

  private async encrypt(
    msg: Record<string, any>,
    kid: string,
    key: Uint8Array
  ): Promise<JWE> {
    const dirEncrypter = xc20pDirEncrypter(key);
    const cleartext = await prepareCleartext(msg);
    const jwe = await createJWE(cleartext, [dirEncrypter], { kid: kid });
    return jwe;
  }

  private async decrypt(
    msg: JWE,
    key: Uint8Array
  ): Promise<Record<string, any>> {
    const dirDecrypter = xc20pDirDecrypter(key);
    const decryptedData = await decryptJWE(msg, dirDecrypter);
    return decodeCleartext(decryptedData);
  }

  /* 
  	Key management
  	TODO: Belongs is separate service?
  */
  private async fetchKeyFromKid(
    channel: Channel,
    profileTokenId: string,
    message: JWE
  ) {
    const protectedHeader = JSON.parse(decodeBase64(message.protected));
    const decodedKey = base58btc.decode(protectedHeader.kid);
    const symmetricKey = await this.getOrFetchKeyForKid(
      channel,
      profileTokenId,
      protectedHeader.kid
    );

    return {
      kid: protectedHeader.kid,
      encryptedSymmetricKey: decodedKey,
      symmetricKey: symmetricKey,
    };
  }

  private async fetchOrCreateChannelKey(
    channel: Channel,
    profileTokenId: string
  ) {
    if (!this.authSession)
      throw new Error("Encrypter not authenticated. Call authenticate() first");

    let channelKey = localStorage.getItem(`hashchat:kids:${channel.id}`);
    await this.litClient.connect();

    const conditions = await this.generateAccessControlConditions(
      channel,
      profileTokenId
    );

    if (channelKey == null) {
      const { symmetricKey } = await LitJsSdk.encryptString("");
      const encryptedSymmetricKey = await this.litClient.saveEncryptionKey({
        ...conditions,
        symmetricKey,
        authSig: this.authSig,
        chain: getChainFromAccountId(this.authSession.accountId),
      });

      const encodedKey = base58btc.encode(encryptedSymmetricKey).toString();
      localStorage.setItem(`hashchat:kids:${channel.id}`, encodedKey);

      this.saveKeyForKid(encodedKey, symmetricKey);

      return {
        kid: encodedKey,
        encryptedSymmetricKey: encryptedSymmetricKey,
        symmetricKey: symmetricKey,
      };
    } else {
      const symmetricKey = await this.getOrFetchKeyForKid(
        channel,
        profileTokenId,
        channelKey
      );
      const decodedKey = base58btc.decode(channelKey);

      return {
        kid: channelKey,
        encryptedSymmetricKey: decodedKey,
        symmetricKey: symmetricKey,
      };
    }
  }

  private async generateAccessControlConditions(
    channel: Channel,
    profileTokenId: string
  ) {
    if (channel.type === "messaging") {
      return {
        accessControlConditions: await this.generateDMAccessControlConditions(
          channel,
          profileTokenId
        ),
      };
    } else if (channel.id!.startsWith("gno")) {
      return {
        evmContractConditions:
          await this.generateGnosisSafeAccessControlConditions(
            safeAccountIdFromChannelId(channel.id!)
          ),
      };
    } else {
      return {
        accessControlConditions:
          await this.generateAssetAccessControlConditions(channel),
      };
    }
  }

  private async generateAssetAccessControlConditions(channel: Channel) {
    if (!this.authSession) {
      return this.error<void>(
        new Error("Encrypter not authenticated. Call authenticate() first")
      );
    }

    const assetId = assetIdFromChannelId(channel.id!);
    return [
      {
        contractAddress: assetId.assetName.reference,
        standardContractType: assetId.assetName.namespace.toUpperCase(),
        chain: getChainFromAccountId(this.authSession.accountId),
        method: "balanceOf",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: ">",
          value: "0",
        },
      },
    ];
  }

  private async generateGnosisSafeAccessControlConditions(
    safeAccountId: AccountId
  ) {
    return [
      {
        contractAddress: safeAccountId.address,
        functionName: "isOwner",
        functionAbi: {
          inputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
          ],
          name: "isOwner",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        chain: getChainFromAccountId(safeAccountId),
        functionParams: [":userAddress"],
        returnValueTest: {
          key: "",
          comparator: "=",
          value: "true",
        },
      },
    ];
  }

  private async generateDMAccessControlConditions(
    channel: Channel,
    profileTokenId: string | null
  ) {
    const result = await channel.queryMembers({}, { id: -1 });
    const members = result.members;
    let conditions = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const accountId = accountIdFromUserId(member.user_id!);
      let condition;
      if (accountId.chainId.namespace === "eip155" && !profileTokenId) {
        condition = {
          conditionType: "evmBasic",
          contractAddress: "",
          standardContractType: "",
          chain: getChainFromAccountId(accountId),
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: accountId.address,
          },
        };
      } else if (accountId.chainId.namespace === "solana") {
        condition = {
          method: "",
          params: [":userAddress"],
          chain: "solana",
          returnValueTest: {
            key: "",
            comparator: "=",
            value: accountId.address,
          },
        };
      } else if (accountId.chainId.namespace === "eip155" && profileTokenId) {
        condition = {
          contractAddress: "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d",
          standardContractType: "ERC721",
          chain: "polygon",
          method: "ownerOf",
          parameters: [parseInt(profileTokenId, 16).toString(10)],
          returnValueTest: {
            comparator: "=",
            value: accountId.address,
          },
        };
      } else {
        throw new Error("Unknown chain");
      }

      if (i > 0) {
        conditions.push({ operator: "or" });
      }
      conditions.push(condition);
    }

    return conditions;
  }

  // TODO: Localstorage may not be the best solution due to security issues and XSS
  private saveKeyForKid(kid: string, symmetricKey: Uint8Array) {
    localStorage.setItem(
      `hashchat:keys:${kid}`,
      base58btc.encode(symmetricKey).toString()
    );
  }

  private async getOrFetchKeyForKid(
    channel: Channel,
    profileTokenId: string,
    kid: string
  ) {
    if (!this.authSession)
      throw new Error("Encrypter not authenticated. Call authenticate() first");

    const encodedKey = localStorage.getItem(`hashchat:keys:${kid}`);
    if (encodedKey) {
      return base58btc.decode(encodedKey);
    } else {
      const conditions = await this.generateAccessControlConditions(
        channel,
        profileTokenId
      );

      const decodedKid = base58btc.decode(kid);
      const symmetricKey: Uint8Array = await this.litClient.getEncryptionKey({
        ...conditions,
        toDecrypt: LitJsSdk.uint8arrayToString(decodedKid, "base16"),
        chain: getChainFromAccountId(this.authSession.accountId),
        authSig: this.authSig,
      });
      this.saveKeyForKid(kid, symmetricKey);

      return symmetricKey;
    }
  }
}

function siweFromCacao(cacao: Cacao) {
  const account = AccountId.parse(cacao.p.iss.replace("did:pkh:", ""));
  const siwe = new SiweMessage({
    domain: cacao.p.domain,
    address: account.address,
    uri: cacao.p.aud,
    version: cacao.p.version,
    chainId: Number(new ChainId(account.chainId).reference),
  });

  if (cacao.p.statement) siwe.statement = cacao.p.statement;
  if (cacao.p.nonce) siwe.nonce = cacao.p.nonce;
  if (cacao.p.iat) siwe.issuedAt = cacao.p.iat;
  if (cacao.p.exp) siwe.expirationTime = cacao.p.exp;
  if (cacao.p.nbf) siwe.notBefore = cacao.p.nbf;
  if (cacao.p.requestId) siwe.requestId = cacao.p.requestId;
  if (cacao.p.resources) siwe.resources = cacao.p.resources;

  if (cacao.s) {
    if (cacao.s.s) siwe.signature = cacao.s.s;
    if (cacao.s.t === "eip191") siwe.type = SignatureType.PERSONAL_SIGNATURE;
  }

  return siwe;
}

const CHAINS: Record<string, string> = Object.keys(LitJsSdk.LIT_CHAINS)
  .map((k) => {
    return { [LitJsSdk.LIT_CHAINS[k].chainId.toString()]: k };
  })
  .reduce((prev, cur) => {
    return { ...prev, ...cur };
  });

function accountIdFromUserId(userId: string) {
  return new AccountId(AccountId.parse(userId.replaceAll("_", ":")));
}

function assetIdFromChannelId(channelId: string) {
  return new AssetType(channelId.replaceAll("_", ":").replaceAll("-", "/"));
}

function getChainFromAccountId(accountId: AccountId) {
  if (accountId.chainId.namespace === "eip155") {
    return CHAINS[accountId.chainId.reference];
  } else if (accountId.chainId.namespace === "solana") {
    return "solana";
  } else {
    throw new Error("Unknown chain");
  }
}

function safeAccountIdToChannelId(accountId: AccountId) {
  return `gno_${accountId
    .toString()
    .replaceAll(":", "_")
    .replaceAll("/", "-")}`;
}

function safeAccountIdFromChannelId(channelId: string) {
  return new AccountId(
    AccountId.parse(channelId.replace("gno_", "").replaceAll("_", ":"))
  );
}
