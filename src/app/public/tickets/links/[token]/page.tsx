import { PublicTicketCreateClient } from "./public-ticket-create.client";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PublicTicketCreatePage({ params }: Props) {
  const resolved = await Promise.resolve(params);
  return <PublicTicketCreateClient token={resolved.token} />;
}
