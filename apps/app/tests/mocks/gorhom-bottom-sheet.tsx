import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import { TextInput, View } from "react-native";

/** Props da última `BottomSheetModal` montada: os testes chamam `onDismiss` para simular o arrastar para baixo. */
export const lastModal: { props: { onDismiss?: () => void }; userDismiss: () => void } = { props: {}, userDismiss: () => {} };

type ModalProps = { children?: ReactNode; onDismiss?: () => void };

/** Mock fiel ao que importa: o conteúdo só existe enquanto o sheet foi apresentado (`present`) e não dispensado. */
export const BottomSheetModal = forwardRef<{ present(): void; dismiss(): void }, ModalProps>(function Modal(props, ref) {
  const [shown, setShown] = useState(false);
  lastModal.props = props;
  // Arrastar para baixo ou tocar fora: o gorhom esconde o sheet e só então avisa com `onDismiss`.
  lastModal.userDismiss = () => {
    setShown(false);
    props.onDismiss?.();
  };
  // Comportamento real observado no navegador (gorhom 5.2): `dismiss()` com o sheet fechado deixa o modal
  // sem conseguir abrir de novo, em silêncio. O mock reproduz isso para o teste pegar o erro.
  const [broken, setBroken] = useState(false);
  useImperativeHandle(ref, () => ({
    present: () => {
      if (!broken) setShown(true);
    },
    dismiss: () => {
      if (!shown) {
        setBroken(true);
        return;
      }
      setShown(false);
      props.onDismiss?.();
    },
  }));
  return shown ? <View testID="bottom-sheet">{props.children}</View> : null;
});

export const BottomSheetModalProvider = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const BottomSheetView = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
export const BottomSheetBackdrop = () => null;
export const BottomSheetTextInput = TextInput;
