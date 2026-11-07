import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import { View } from "react-native";

/** Props da última `BottomSheetModal` montada: os testes chamam `onDismiss` para simular o arrastar para baixo. */
export const lastModal: { props: { onDismiss?: () => void } } = { props: {} };

type ModalProps = { children?: ReactNode; onDismiss?: () => void };

/** Mock fiel ao que importa: o conteúdo só existe enquanto o sheet foi apresentado (`present`) e não dispensado. */
export const BottomSheetModal = forwardRef<{ present(): void; dismiss(): void }, ModalProps>(function Modal(props, ref) {
  const [shown, setShown] = useState(false);
  lastModal.props = props;
  useImperativeHandle(ref, () => ({
    present: () => setShown(true),
    dismiss: () => {
      setShown(false);
      props.onDismiss?.();
    },
  }));
  return shown ? <View testID="bottom-sheet">{props.children}</View> : null;
});

export const BottomSheetModalProvider = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const BottomSheetView = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
export const BottomSheetBackdrop = () => null;
