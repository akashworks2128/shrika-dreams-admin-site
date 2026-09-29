interface WelcomeCardProps {
  adminName: string;
}

export default function WelcomeCard({ adminName }: WelcomeCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="text-base font-bold text-ink sm:text-lg">
          Welcome back, {adminName}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Here&apos;s what&apos;s happening with your Shrika Dreams platform.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 self-start rounded-full bg-gold px-4 py-2 text-xs font-semibold text-white sm:self-auto">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Website Live
      </div>
    </div>
  );
}
