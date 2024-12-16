import { config } from "dotenv";
import { ImageService } from "./image.service";
import { StorageService } from "./storage.service";
import { publicClient } from "../config/viem";
import { NFT, Tweet } from "../models";
import { createWalletClient, http, PrivateKeyAccount } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

config();

const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "string",
        name: "uri",
        type: "string",
      },
    ],
    name: "safeMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "_tokenIdCounter",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type EVM_ADDRESS = `0x${string}`;

export class NFTService {
  private imageService: ImageService;
  private storage: StorageService;
  private account: PrivateKeyAccount;
  private readonly contractAddress: string;
  private readonly walletClient: ReturnType<typeof createWalletClient>;

  constructor() {
    this.imageService = new ImageService();
    this.storage = new StorageService();
    this.contractAddress = process.env.BASE_SEPOLIA_CONTRACT_ADDRESS!;

    // Create wallet client with private key
    const account = privateKeyToAccount(
      `0x${process.env.PRIVATE_KEY!}` as EVM_ADDRESS
    );
    this.account = account;
    this.walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });
  }

  async mintTweet(tweet: Tweet, userWallet: string): Promise<NFT> {
    try {
      let nft;
      nft = await this.getNFTByTweetId(tweet.id);

      if (!nft) {
        // Check if we already have an image for this tweet
        let imageUrl = await this.imageService.getExistingImage(tweet.id);

        // Generate new image if none exists
        if (!imageUrl) {
          imageUrl = await this.imageService.generateAndStore(tweet);
        }

        // Get next token ID
        const nextTokenId = await this.getNextTokenId();

        // Prepare metadata
        const metadata = {
          name: `Tweet #${tweet.id}`,
          description: tweet.text,
          image: imageUrl,
          attributes: [
            { trait_type: "Author", value: tweet.author_id },
            { trait_type: "Platform", value: "Twitter" },
            { trait_type: "Date", value: tweet.created_at },
            { trait_type: "Chain", value: "Base" },
          ],
        };

        // Upload metadata
        const metadataUrl = await this.storage.uploadMetadata(
          metadata,
          tweet.id
        );

        const { request } = await publicClient.simulateContract({
          account: this.account,
          address: this.contractAddress as EVM_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "safeMint",
          args: [userWallet as EVM_ADDRESS, metadataUrl],
        });

        // Mint NFT using safeMint
        const hash = await this.walletClient.writeContract(request);

        await publicClient.waitForTransactionReceipt({ hash });

        const nft: NFT = {
          tokenId: nextTokenId.toString(),
          tweetId: tweet.id,
          owner: userWallet,
          chain: "base",
          createdAt: Date.now(),
          imageUrl,
          metadataUrl,
        };

        // Cache NFT data
        await this.storage.set(`nfts/${tweet.id}`, nft);
        return nft;
      } else {
        return nft;
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      throw new Error("Failed to mint NFT");
    }
  }

  private async getNextTokenId(): Promise<bigint> {
    try {
      const totalSupply = await publicClient.readContract({
        address: this.contractAddress as EVM_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "_tokenIdCounter",
      });

      return totalSupply + BigInt(1);
    } catch (error) {
      console.error("Error getting next token ID:", error);
      throw new Error("Failed to get next token ID");
    }
  }

  async getNFTByTweetId(tweetId: string): Promise<NFT | null> {
    try {
      return await this.storage.get(`nfts/${tweetId}`);
    } catch (error) {
      console.error("Error getting NFT:", error);
      return null;
    }
  }
}
