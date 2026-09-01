import { ControlRoom } from "@/components/control-room";
import { getDashboardSnapshot } from "@/lib/server/workflow";

export const dynamic = "force-dynamic";

export default function Home(): React.ReactElement {
  return <ControlRoom initialSnapshot={getDashboardSnapshot()} />;
}
