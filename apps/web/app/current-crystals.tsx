import Link from "next/link";
import useCurrentUser from "./lib/hooks/use-current-user";
import { Crystal } from "@repo/ui/src/components/icons";

const CurrentCrystals = () => {
  const currentUser = useCurrentUser();
  const crystals = currentUser?.crystals;
  return (
    <Link href="/vip">
      <div className={`flex gap-0.5 text-xs font-medium`}>
        <Crystal className="h-4 w-4" />
        {Math.floor(crystals)}
      </div>
    </Link>
  );
};

export default CurrentCrystals;
