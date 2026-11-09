import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

/** Com o app aberto a notificação também aparece (banner, lista e som), sem número no ícone. */
export function setupNotificationHandler() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}
