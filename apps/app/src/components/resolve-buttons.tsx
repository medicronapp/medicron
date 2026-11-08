import { useRef, useState } from "react";
import { View } from "react-native";
import { Check, SkipForward } from "lucide-react-native";
import { resolveAppliedTime, toLocalInput } from "@medicron/shared";
import { now } from "@/lib/clock";
import { ApiClientError } from "@/lib/api/errors";
import { useRecordDose } from "@/lib/home-queries";
import { TimeField } from "@/components/time-field";
import { Button, buttonLabel } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

type Props = {
  planId: string; scheduledFor: string; kind: "medication" | "procedure"; reschedule: boolean;
  itemName: string; patientName: string; size?: "default" | "lg";
};

/** "Feito" e "Pular" de um horário. Procedimento ou reprogramação pedem hora/valor numa gaveta antes de registrar. */
export function ResolveButtons({ planId, scheduledFor, kind, reschedule, itemName, patientName, size = "lg" }: Props) {
  const record = useRecordDose();
  const [pending, setPending] = useState(false);
  const busy = useRef(false); // trava síncrona: dois toques seguidos não registram duas vezes
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const needsSheet = kind === "procedure" || reschedule;

  async function submit(outcome: "done" | "skipped", extra?: { value?: string; note?: string; appliedTime?: string }) {
    if (busy.current) return;
    let appliedAt: string | undefined;
    if (extra?.appliedTime) {
      const at = resolveAppliedTime(extra.appliedTime, new Date(scheduledFor), now());
      if (!at) {
        toast.error("Hora da aplicação inválida. Confira o horário.");
        return;
      }
      appliedAt = at.toISOString();
    }
    busy.current = true;
    setPending(true);
    try {
      const res = await record.mutateAsync({
        planId, scheduledFor, outcome,
        ...(extra?.value?.trim() ? { value: extra.value.trim() } : {}),
        ...(extra?.note?.trim() ? { note: extra.note.trim() } : {}),
        ...(appliedAt ? { appliedAt } : {}),
      });
      if (res.recorded) toast.success(outcome === "done" ? "Registrado" : "Marcado como pulado");
      else if (res.reason === "too-early") toast.info("Este cuidado ainda não está na hora.");
      else if (res.reason === "invalid-time") {
        toast.error("Hora da aplicação inválida. Confira o horário.");
        return;
      } else toast.info("Este horário já tinha sido registrado por outra pessoa.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function onDone() {
    if (!needsSheet) return void submit("done");
    setTime(toLocalInput(now()).slice(11));
    setValue("");
    setNote("");
    setOpen(true);
  }

  return (
    <>
      <View className="flex-row gap-2">
        <Button size={size} className="flex-1" loading={pending} onPress={onDone} accessibilityLabel="Feito">
          <Icon icon={Check} color="primaryForeground" size={16} />
          <Text className={buttonLabel("default", size)}>Feito</Text>
        </Button>
        <Button size={size} variant="outline" disabled={pending} onPress={() => void submit("skipped")} accessibilityLabel="Pular">
          <Icon icon={SkipForward} color="foreground" size={16} />
          <Text className={buttonLabel("outline", size)}>Pular</Text>
        </Button>
      </View>
      <Drawer open={open} onOpenChange={setOpen} title={itemName} description={`${patientName}${kind === "procedure" ? " · registre o resultado, se quiser." : ""}`}>
        <View className="gap-4">
          {reschedule ? (
            <FormField label="Hora da aplicação" hint="Ajuste se a aplicação foi antes de você marcar.">
              <TimeField value={time} onChange={setTime} />
            </FormField>
          ) : null}
          {kind === "procedure" ? (
            <>
              <FormField label="Valor" hint="Ex.: 38,7 °C — opcional">
                <Input value={value} onChangeText={setValue} maxLength={60} autoComplete="off" />
              </FormField>
              <FormField label="Observação" hint="Opcional">
                <Input value={note} onChangeText={setNote} maxLength={300} autoComplete="off" />
              </FormField>
            </>
          ) : null}
          <View className="flex-row gap-2">
            <Button variant="outline" size="lg" className="flex-1" onPress={() => setOpen(false)}>Cancelar</Button>
            <Button
              size="lg" className="flex-1" loading={pending} accessibilityLabel="Confirmar"
              onPress={() => void submit("done", { value, note, appliedTime: reschedule ? time : undefined })}
            >
              Confirmar
            </Button>
          </View>
        </View>
      </Drawer>
    </>
  );
}
