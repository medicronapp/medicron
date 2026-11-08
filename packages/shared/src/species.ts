export type Species = "cat" | "dog" | "human" | "bird" | "rabbit" | "other";

export const SPECIES: { value: Species; label: string }[] = [
  { value: "cat", label: "Gato" },
  { value: "dog", label: "Cachorro" },
  { value: "human", label: "Pessoa" },
  { value: "bird", label: "Pássaro" },
  { value: "rabbit", label: "Coelho" },
  { value: "other", label: "Outro" },
];

export const speciesLabel = (s: Species): string => SPECIES.find((x) => x.value === s)?.label ?? "Outro";
