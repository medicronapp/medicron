import { useEffect, useState } from "react";
import { View } from "react-native";
import { Bell, BellOff } from "lucide-react-native";
import { errorMessage } from "@/lib/api/errors";
import { useSetPatientNotifications } from "@/lib/patient-queries";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

/** "Receber avisos deste paciente": o aviso de dose no celular, só para quem liga. Pessoal: não muda o que os outros recebem. */
export function PatientNotifyRow({ patientId, notify }: { patientId: string; notify: boolean }) {
  const set = useSetPatientNotifications();
  const [on, setOn] = useState(notify);
  useEffect(() => { setOn(notify); }, [notify]);

  async function change(next: boolean) {
    setOn(next); // responde na hora; se a API falhar, volta
    try {
      await set.mutateAsync({ id: patientId, enabled: next });
    } catch (err) {
      setOn(!next);
      toast.error(errorMessage(err));
    }
  }

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-2">
      <Icon icon={on ? Bell : BellOff} color={on ? "brandInk" : "muted"} size={20} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium">Receber avisos deste paciente</Text>
        <Text className="text-xs text-muted-foreground">Avisos de dose no seu celular. Só vale para você.</Text>
      </View>
      <Switch value={on} onValueChange={(v) => void change(v)} accessibilityLabel="Receber avisos deste paciente" />
    </View>
  );
}
