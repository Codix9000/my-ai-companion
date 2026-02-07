import { Metadata, ResolvingMetadata, Viewport } from "next";
import { constructMetadata } from "../../../lib/utils";
import ChatWithCharacter from "../ChatWithCharacter";

type Props = {
  params: { id: string };
  searchParams: { chatId?: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;

  const character = await fetch(
    `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
      "convex.cloud",
      "convex.site"
    )}/character?characterId=${id}`
  ).then((res) => res.json());

  return constructMetadata({
    title: `Chat with ${character.name}`,
    description: character.description,
    image: character.cardImageUrl ? character.cardImageUrl : undefined,
    icon: character.cardImageUrl ? character.cardImageUrl : undefined,
  });
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function Page({ params, searchParams }: Props) {
  return (
    <div className="flex h-full w-full overflow-x-hidden">
      <ChatWithCharacter params={params} />
    </div>
  );
}
