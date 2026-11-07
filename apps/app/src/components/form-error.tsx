import { TriangleAlert } from "lucide-react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" icon={TriangleAlert}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
