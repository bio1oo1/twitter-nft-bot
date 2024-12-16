import { TwitterService } from "../services/twitter.service";

export const main = async () => {
  const twitterService = new TwitterService();

  // Mock one
  // await twitterService.processIncomingTweet({
  //   id: "1732859633574768964",
  //   text: "@bankzzz my wallet is 0xC4a9b0aB998B7c489A61e0CBf8d38a7aA5304437",
  //   author_id: "test",
  //   created_at: new Date().getTime(),
  // });

  // Mock two
  await twitterService.processIncomingTweet({
    id: "1732859633574768964",
    text: "@bankzzz mint this",
    author_id: "dev",
    created_at: new Date().getTime(),
  });

  return;
};
