import { useEffect, useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";

const ITEM = 44;
const VISIBLE = 5;

type Props = { values: string[]; selected: string; onSelect: (v: string) => void; label: (v: string) => string };

/**
 * Roda de valores (hora ou minuto): rolar e soltar escolhe o valor do meio; tocar num valor também escolhe.
 * Ao parar de rolar, ajusta ao valor mais próximo (na web não há "snap" nativo).
 */
export function TimeWheel({ values, selected, onSelect, label }: Props) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const index = Math.max(0, values.indexOf(selected));

  useEffect(() => { ref.current?.scrollTo({ y: index * ITEM, animated: false }); }, [index]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM)));
      if (values[i] === selected) ref.current?.scrollTo({ y: i * ITEM, animated: true });
      else onSelect(values[i]);
    }, 120);
  };

  return (
    <View style={{ height: ITEM * VISIBLE, width: 88 }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: ITEM * 2, height: ITEM }} className="rounded-xl bg-brand-soft" />
      <ScrollView
        ref={ref} showsVerticalScrollIndicator={false} nestedScrollEnabled scrollEventThrottle={16} onScroll={onScroll}
        snapToInterval={ITEM} decelerationRate="fast" contentContainerStyle={{ paddingVertical: ITEM * 2 }}
      >
        {values.map((v) => (
          <Pressable key={v} accessibilityRole="button" accessibilityLabel={label(v)} accessibilityState={{ selected: v === selected }} onPress={() => onSelect(v)} style={{ height: ITEM }} className="items-center justify-center">
            <Text className={cn("text-xl", v === selected ? "font-bold text-brand-ink" : "text-muted-foreground")}>{v}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
