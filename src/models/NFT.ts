export interface NFT {
  tokenId: string;
  tweetId: string;
  owner: string;
  imageUrl: string;
  metadataUrl: string;
  chain: 'base';
  createdAt: number;
}