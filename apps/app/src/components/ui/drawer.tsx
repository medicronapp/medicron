import { useCallback, useEffect, useRef, type ComponentRef, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView, type BottomSheetBackdropProps, type BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/theme/colors";
import { InSheetContext } from "./sheet-context";
import { Text } from "./text";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Conteúdo longo: o sheet cresce até ~70 % da tela e passa a rolar por dentro. */
  scrollable?: boolean;
};

const Background = ({ style }: BottomSheetBackgroundProps) => (
  <View style={style} className="rounded-t-3xl border-t border-border bg-popover" />
);

/**
 * Sheet na parte de baixo (equivalente nativo do Drawer do site): fundo escurecido, arrastar para baixo
 * ou tocar fora fecha e chama `onOpenChange(false)`. Exige `BottomSheetModalProvider` no layout raiz.
 */
export function Drawer({ open, onOpenChange, title, description, children, footer, scrollable }: Props) {
  const ref = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;

  // `dismiss()` só enquanto apresentado: chamá-lo na montagem ou depois de o sheet já ter sido dispensado
  // deixa o modal do gorhom sem conseguir abrir de novo.
  const presented = useRef(false);
  useEffect(() => {
    if (open) {
      presented.current = true;
      ref.current?.present();
    } else if (presented.current) {
      presented.current = false;
      ref.current?.dismiss();
    }
  }, [open]);

  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="close" />,
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      maxDynamicContentSize={scrollable ? Math.round(height * 0.7) : undefined}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={() => {
        presented.current = false; // já foi dispensado pelo gorhom: não chamar dismiss() de novo
        onOpenChange(false);
      }}
      backdropComponent={backdrop}
      backgroundComponent={Background}
      handleIndicatorStyle={{ backgroundColor: colors.muted, opacity: 0.4 }}
    >
      <Body {...(scrollable ? { testID: "sheet-scroll" } : {})}>
        <InSheetContext.Provider value>
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
        </InSheetContext.Provider>
      </Body>
    </BottomSheetModal>
  );
}
