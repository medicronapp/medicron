import { useState } from "react";
import { View } from "react-native";
import type { PatientBody, PatientDto } from "@medicron/shared";
import { SPECIES } from "@medicron/shared";
import { weightLabel } from "@/components/patient-card";
import { speciesGlyph } from "@/components/species-icon";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type Props = { patient?: PatientDto; onSubmit: (body: PatientBody) => Promise<void>; submitting?: boolean };
type Errors = { name?: string; species?: string; weight?: string };

/** Formulário de paciente (criar e editar). Valida no cliente e só manda o que foi preenchido. */
export function PatientForm({ patient, onSubmit, submitting }: Props) {
  const [name, setName] = useState(patient?.name ?? "");
  const [species, setSpecies] = useState<string>(patient?.species ?? "");
  const [birthDate, setBirthDate] = useState(patient?.birthDate ?? "");
  const [weight, setWeight] = useState(patient?.weightKg ? weightLabel(patient.weightKg).replace(" kg", "") : "");
  const [notes, setNotes] = useState(patient?.notes ?? "");
  const [errors, setErrors] = useState<Errors>({});

  async function submit() {
    const next: Errors = {};
    const trimmed = name.trim();
    if (!trimmed) next.name = "Informe o nome";
    if (!species) next.species = "Selecione o tipo";
    const w = weight.replace(",", ".").trim();
    const kg = w ? Number(w) : undefined;
    if (kg !== undefined && !(kg > 0 && kg <= 500)) next.weight = "Peso inválido";
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({
      name: trimmed, species: species as PatientBody["species"],
      ...(birthDate ? { birthDate } : {}), ...(kg !== undefined ? { weightKg: kg } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  return (
    <View className="gap-4">
      <FormField label="Nome" error={errors.name}>
        <Input value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" returnKeyType="next" />
      </FormField>
      <FormField label="Tipo" error={errors.species}>
        <SelectField layout="cards" value={species} onChange={setSpecies} placeholder="Selecione…" options={SPECIES.map((s) => ({ ...s, icon: speciesGlyph(s.value) }))} />
      </FormField>
      <View className="gap-4 md:flex-row">
        <View className="flex-1">
          <FormField label="Nascimento" hint="Opcional">
            <DateField value={birthDate} onChange={setBirthDate} clearable />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label="Peso (kg)" hint="Opcional" error={errors.weight}>
            <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="4,2" />
          </FormField>
        </View>
      </View>
      <FormField label="Observações" hint="Opcional: alergias, condições, responsável…">
        <Textarea value={notes} onChangeText={setNotes} maxLength={1000} />
      </FormField>
      <Button size="lg" disabled={submitting} loading={submitting} onPress={() => void submit()} accessibilityLabel="Salvar">Salvar</Button>
    </View>
  );
}
