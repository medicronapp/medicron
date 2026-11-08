export type Species = "cat" | "dog" | "human" | "other";

export const SPECIES: { value: Species; label: string }[] = [
  { value: "cat", label: "Gato" },
  { value: "dog", label: "Cachorro" },
  { value: "human", label: "Pessoa" },
  { value: "other", label: "Outro" },
];

export const speciesLabel = (s: Species): string => SPECIES.find((x) => x.value === s)?.label ?? "Outro";
