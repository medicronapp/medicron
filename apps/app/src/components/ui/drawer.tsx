import { useCallback, useEffect, useRef, type ComponentRef, type ReactNode } from "react";
import { View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps, type BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/theme/colors";
import { Text } from "./text";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

const Background = ({ style }: BottomSheetBackgroundProps) => (
  <View style={style} className="rounded-t-3xl border-t border-border bg-popover" />
);

/**
 * Sheet na parte de baixo (equivalente nativo do Drawer do site): fundo escurecido, arrastar para baixo
 * ou tocar fora fecha e chama `onOpenChange(false)`. Exige `BottomSheetModalProvider` no layout raiz.
 */
export function Drawer({ open, onOpenChange, title, description, children, footer }: Props) {
  const ref = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (open) ref.current?.present();
    else ref.current?.dismiss();
  }, [open]);

  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="close" />,
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      onDismiss={() => onOpenChange(false)}
      backdropComponent={backdrop}
      backgroundComponent={Background}
      handleIndicatorStyle={{ backgroundColor: colors.muted, opacity: 0.4 }}
    >
      <BottomSheetView>
        <View className="gap-4 px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          {title || description ? (
            <View className="gap-1">
              {title ? <Text accessibilityRole="header" className="text-lg font-semibold">{title}</Text> : null}
              {description ? <Text className="text-sm text-muted-foreground">{description}</Text> : null}
            </View>
          ) : null}
          {children}
          {footer}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
