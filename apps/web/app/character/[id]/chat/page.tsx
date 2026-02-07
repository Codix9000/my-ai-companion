import { redirect } from "next/navigation";

type Props = {
  params: { id: string };
  searchParams: { chatId?: string };
};

export default function Page({ params }: Props) {
  redirect(`/chats?characterId=${params.id}`);
}
