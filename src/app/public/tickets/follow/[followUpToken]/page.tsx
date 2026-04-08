import { PublicTicketFollowClient } from "./public-ticket-follow.client";

type Props = {
  params: Promise<{ followUpToken: string }>;
};

export default async function PublicTicketFollowPage({ params }: Props) {
  const resolved = await Promise.resolve(params);
  return <PublicTicketFollowClient followUpToken={resolved.followUpToken} />;
}
