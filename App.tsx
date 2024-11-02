import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, AppState, BackHandler, Linking, Platform} from 'react-native';
import Show from './src/components/ui/Show';
import {
  currentUrl,
  CustomWebView,
  CustomWebViewRef,
} from './src/components/CustomWebView';
import {CustomVideo, CustomVideoRef} from './src/components/ui/CustomVideo';
import TrackPlayer from 'react-native-track-player';

import {handlePushNotification} from './src/pushNotifications';

import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {EventType, Notification} from '@notifee/react-native';
import {getLatestRelease, Release} from './src/githubApi';
import env from './src/env';
import {dmChannelMatch, serverChannelMatch} from './src/UrlPatternMatchers';

TrackPlayer.setupPlayer();

async function onMessageReceived(
  message: FirebaseMessagingTypes.RemoteMessage,
  isBackground: boolean,
) {
  handlePushNotification(message.data as any, isBackground);
}

messaging().onMessage(e => onMessageReceived(e, false));
messaging().setBackgroundMessageHandler(e => onMessageReceived(e, true));

let backgroundClickedNotification: Notification | undefined;
notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification} = detail;
  if (type === EventType.PRESS) {
    backgroundClickedNotification = notification;
  }
});

function App(): JSX.Element {
  const videoRef = useRef<CustomVideoRef | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const webViewRef = useRef<CustomWebViewRef | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const runIfAuthenticated = useWaitFor(authenticated);
  useUpdateChecker();

  const handleNotificationClick = useCallback(
    async (notification: any) => {
      const serverId = notification?.data?.serverId;
      const channelId = notification?.data?.channelId;
      const userId = notification?.data?.userId;

      runIfAuthenticated(() => {
        webViewRef.current?.emit('openChannel', {
          serverId,
          channelId,
          userId,
        });
      });
    },
    [runIfAuthenticated],
  );

  useEffect(() => {
    notifee.getInitialNotification().then(initN => {
      if (!initN?.notification) {
        return;
      }
      handleNotificationClick(initN.notification);
    });

    const disposeForegroundEvent = notifee.onForegroundEvent(
      ({type, detail}) => {
        if (type === EventType.PRESS) {
          handleNotificationClick(detail.notification);
        }
      },
    );

    const event = AppState.addEventListener('focus', () => {
      if (backgroundClickedNotification) {
        handleNotificationClick(backgroundClickedNotification);
      }
      backgroundClickedNotification = undefined;
    });

    return () => {
      disposeForegroundEvent();
      event.remove();
    };
  }, [handleNotificationClick]);

  const onAndroidBackPress = useCallback(() => {
    if (videoUrl) {
      videoRef.current?.stopVideo();
      return true;
    }
    return webViewRef.current?.goBack() || false;
  }, [videoUrl]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
      return () => {
        BackHandler.removeEventListener(
          'hardwareBackPress',
          onAndroidBackPress,
        );
      };
    }
  }, [onAndroidBackPress]);

  return (
    <>
      <CustomWebView
        onAuthenticated={() => setAuthenticated(true)}
        ref={webViewRef}
        onVideoClick={setVideoUrl}
      />
      <Show when={videoUrl}>
        <CustomVideo
          ref={videoRef}
          videoUrl={videoUrl!}
          onVideoEnd={() => setVideoUrl(null)}
        />
      </Show>
    </>
  );
}

function useUpdateChecker() {
  const updateAlert = useCallback((release: Release) => {
    const onUpdateNow = () =>
      release.mainAssetUrl && Linking.openURL(release.mainAssetUrl);
    const onViewChangelog = () => {
      updateAlert(release);
      Linking.openURL(release.html_url);
    };

    Alert.alert('Update Available', 'A new version of Nerimity is available', [
      {text: 'Later'},
      {
        text: 'View Changelog',
        onPress: onViewChangelog,
      },
      {
        isPreferred: true,
        text: 'Update Now',
        onPress: onUpdateNow,
      },
    ]);
  }, []);

  const checkForUpdates = useCallback(async () => {
    console.log('Checking for updates...');

    const latestRelease = await getLatestRelease();
    if (latestRelease.tag_name !== env.APP_VERSION) {
      updateAlert(latestRelease);
    }
  }, [updateAlert]);

  useEffect(() => {
    if (env.DEV_MODE) {
      return;
    }

    checkForUpdates();
  }, [checkForUpdates]);
}

export default App;

const useWaitFor = (waitFor: boolean) => {
  const [cbRef, setCbRef] = useState<(() => void) | undefined>();

  useEffect(() => {
    if (waitFor && cbRef) {
      cbRef?.();
      setCbRef(undefined);
    }
  }, [waitFor, cbRef]);

  const run = useCallback((cb: () => void) => {
    setCbRef(() => cb);
  }, []);

  return run;
};
