import { ControlRoom } from "@/components/control-room";
import { getDashboardSnapshot } from "@/lib/server/workflow";

export const dynamic = "force-dynamic";

export default async function Home(): Promise<React.ReactElement> {
  return <ControlRoom initialSnapshot={await getDashboardSnapshot()} />;
}
