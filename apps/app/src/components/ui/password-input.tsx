import { useState } from "react";
import { Pressable, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Input } from "./input";

type Props = Omit<React.ComponentProps<typeof Input>, "secureTextEntry">;

/** Campo de senha com o botão de olho (44 px) para mostrar ou ocultar. */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Input {...props} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} className={cn("pr-12", className)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
        accessibilityState={{ selected: visible }}
        onPress={() => setVisible((v) => !v)}
        className="absolute right-0 top-0 size-11 items-center justify-center"
      >
        <Icon icon={visible ? EyeOff : Eye} color="muted" size={20} />
      </Pressable>
    </View>
  );
}
