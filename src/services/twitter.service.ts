import { Scraper, SearchMode } from "agent-twitter-client";
import { StorageService } from "./storage.service";
import { NFTService } from "./nft.service";
import { Tweet } from "../models/Tweet";

export class TwitterService {
  private scraper: Scraper;
  private storage: StorageService;
  private nftService: NFTService;
  private isInitialized: boolean = false;

  constructor() {
    this.scraper = new Scraper();
    this.storage = new StorageService();
    this.nftService = new NFTService();
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Check if we're logged in
      const isLoggedIn = await this.scraper.isLoggedIn();
      console.log("😁😁", isLoggedIn);
      if (!isLoggedIn) {
        // Login with credentials if needed
        await this.scraper.login(
          process.env.TWITTER_USERNAME!,
          process.env.TWITTER_PASSWORD!,
          process.env.TWITTER_EMAIL!,
          process.env.TWITTER_2FA_SECRET!,
          process.env.TWITTER_API_KEY!,
          process.env.TWITTER_API_SECRET_KEY!,
          process.env.TWITTER_ACCESS_TOKEN!,
          process.env.TWITTER_ACCESS_TOKEN_SECRET!
        );
        console.log("login success!");
        // Save new cookies for future use
        const newCookies = await this.scraper.getCookies();
        // You should save these cookies securely in your environment/database
        console.log("New cookies generated:", newCookies);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize Twitter service:", error);
      throw error;
    }
  }

  async startListening() {
    await this.initialize();

    // Since agent-twitter-client doesn't have a direct streaming API,
    // we'll implement a polling mechanism
    setInterval(async () => {
      try {
        // Get latest mentions
        const ownProfile = await this.scraper.getProfile(
          process.env.TWITTER_USERNAME!
        );
        const mentions = await this.scraper.searchTweets(
          `@${process.env.TWITTER_USERNAME!}`,
          20,
          SearchMode.Latest
        );

        // Process each mention
        for await (const mention of mentions) {
          const processed = await this.storage.cacheExists(
            `tweet:${mention.id}`
          );
          if (!processed) {
            await this.processIncomingTweet({
              id: mention.id || "",
              text: mention.text || "",
              author_id: mention.userId || "",
              created_at: new Date().getTime(),
            });
          }
        }
      } catch (error) {
        console.error("Error processing mentions:", error);
      }
    }, 60000); // Poll every minute
  }

  public async processIncomingTweet(tweet: Tweet) {
    console.log("processIncomingTweet");
    await this.storage.setCache(`tweet:${tweet.id}`, {
      processed: true,
      timestamp: Date.now(),
    });

    try {
      if (tweet.text.toLowerCase().includes("my wallet is")) {
        await this.handleWalletRegistration(tweet);
      } else if (tweet.text.toLowerCase().includes("mint this")) {
        await this.handleMintRequest(tweet);
      }
    } catch (error) {
      console.error(`Error processing tweet ${tweet.id}:`, error);
      // Reply with error message
      console.log("Sorry, I encountered an error processing your request 😅");
      await this.replyToTweet(
        tweet.id,
        "Sorry, I encountered an error processing your request 😅"
      );
    }
  }

  private async handleWalletRegistration(tweet: Tweet) {
    const walletAddress = tweet.text.match(/my wallet is\s+(\S+)/i)?.[1];
    console.log("handleWalletRegistration", walletAddress);
    if (!walletAddress || !this.isValidEthereumAddress(walletAddress)) {
      console.log(
        "Oops! That doesn't look like a valid Base wallet address 🤔 Try again?"
      );
      await this.replyToTweet(
        tweet.id,
        "Oops! That doesn't look like a valid Base wallet address 🤔 Try again?"
      );
      return;
    }

    // Save wallet address to database
    await this.storage.setCache(`user:${tweet.author_id}`, {
      walletAddress,
      lastUpdated: Date.now(),
    });

    console.log(
      "Wicked, that's set! 🎉 You can now mint NFTs by mentioning me."
    );
    await this.replyToTweet(
      tweet.id,
      "Wicked, that's set! 🎉 You can now mint NFTs by mentioning me."
    );
  }

  private async handleMintRequest(tweet: Tweet) {
    // Get user's wallet
    console.log("handleMintRequest", tweet);
    const userCache: any = await this.storage.get(
      `cache/user:${tweet.author_id}`
    );

    if (!userCache.value.walletAddress) {
      console.log(
        "Hey! Register your wallet first with 'my wallet is <address>' 👋"
      );
      await this.replyToTweet(
        tweet.id,
        "Hey! Register your wallet first with 'my wallet is <address>' 👋"
      );
      return;
    }

    // Get the tweet to mint (either the mentioned tweet or the tweet being replied to)
    const tweetToMint = tweet.text.includes("https://twitter.com/")
      ? await this.scraper.getTweet(this.extractTweetId(tweet.text))
      : await this.scraper.getTweet(tweet.id);

    if (!tweetToMint) {
      console.log("Sorry, I can't find that tweet 😅");
      await this.replyToTweet(tweet.id, "Sorry, I can't find that tweet 😅");
      return;
    }

    // Mint the NFT
    const nft = await this.nftService.mintTweet(
      {
        id: tweetToMint?.id || "",
        text: tweetToMint?.text || "",
        author_id: tweetToMint?.userId || "",
        created_at: new Date().getTime(),
      },
      userCache.value.walletAddress
    );

    console.log("NFT minted! 🎨 Check your wallet for your new collectible!");
    await this.replyToTweet(
      tweet.id,
      `NFT minted! 🎨 Check your wallet for your new collectible!\nToken ID: ${nft.tokenId}`
    );
  }

  private async replyToTweet(tweetId: string, message: string) {
    try {
      await this.scraper.sendTweet(message, tweetId);
    } catch (error) {
      console.error("Error replying to tweet:", error);
    }
  }

  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private extractTweetId(text: string): string {
    const match = text.match(/twitter\.com\/\w+\/status\/(\d+)/);
    return match ? match[1] : "";
  }
}
