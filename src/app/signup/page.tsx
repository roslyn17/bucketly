import { getMarketingStats } from "@/lib/marketingStats";
import AuthHeroPanel from "@/components/AuthHeroPanel";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const stats = await getMarketingStats();

  return (
    <div className="flex flex-1 flex-col sm:flex-row">
      <AuthHeroPanel stats={stats} />
      <div className="flex flex-1 items-center justify-center bg-surface-page px-4 py-10">
        <SignupForm />
      </div>
    </div>
  );
}
