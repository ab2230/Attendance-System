import SpInAppUpdates, {
    IAUUpdateKind,
    IAUInstallStatus,
  } from "sp-react-native-in-app-updates";
  import { Platform, BackHandler } from "react-native";
  
  export const checkForUpdate = async () => {
    const inAppUpdates = new SpInAppUpdates(false); // isDebug set to false
  
    try {
      await inAppUpdates.checkNeedsUpdate().then((result) => {
        if (result.shouldUpdate) {
          let updateOptions = {};
  
          if (Platform.OS === "android") {
            updateOptions = {
              updateType: IAUUpdateKind.IMMEDIATE, // Forces the update
            };
          }

          if (Platform.OS === "ios") {
            updateOptions = {
              title: "Update Required",
              message:
                "A new version is available. You must update to continue using the app.",
              buttonUpgradeText: "Update",
              buttonCancelText: "Exit App",
              onCancel: () => {
                BackHandler.exitApp(); 
              },
            };
          }
  
          inAppUpdates.addStatusUpdateListener((downloadStatus) => {
            console.log("Download status:", downloadStatus);
            if (downloadStatus.status === IAUInstallStatus.DOWNLOADED) {
              console.log("Update downloaded, installing...");
              inAppUpdates.installUpdate();
            }
          });
  
          inAppUpdates.startUpdate(updateOptions);
        }
      });
    } catch (error) {
      console.log("Update check failed:", error);
    }
  };
  
