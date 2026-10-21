import StudioLogin from "../../components/studio-login";
import StudioManager from "../../components/studio-manager";
import { hasStudioAccess, isStudioConfigured } from "../../lib/studio-auth";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const configured = isStudioConfigured();
  const access = configured && (await hasStudioAccess());
  if (!access) return <StudioLogin unconfigured={!configured} />;
  return <StudioManager />;
}
