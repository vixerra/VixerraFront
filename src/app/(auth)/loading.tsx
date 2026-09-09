import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function AuthLoading() {
  return (
    <Card variant="standard" className="flex justify-center py-16 hover:translate-y-0 hover:shadow-card">
      <Spinner />
    </Card>
  );
}
