import React, {useEffect} from 'react';
import {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {StyleSheet} from 'react-native';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import EncryptedStorage from 'react-native-encrypted-storage';
import messaging from '@react-native-firebase/messaging';

import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {storeUserId, storeUserToken} from '../EncryptedStore';
import {registerNotificationChannels} from '../pushNotifications';
import {AppState} from 'react-native';

export interface CustomWebViewRef {
  goBack: () => boolean;
  emit(event: string, payload: any): void;
}

export interface CustomWebViewProps {
  url?: string | null;
  onVideoClick: (url: string) => void;
  onAuthenticated: (userId: string) => void;
}

export let currentUrl = '';

export const CustomWebView = forwardRef<CustomWebViewRef, CustomWebViewProps>(
  (props, ref) => {
    const webViewRef = useRef<WebView | null>(null);

    const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

    useEffect(() => {
      const dispose = AppState.addEventListener('change', state => {
        const event = state === 'active' ? 'focus' : 'blur';
        webViewRef.current?.injectJavaScript(`  
          window.dispatchEvent(new Event('${event}'));
        `);
      });

      return () => {
        dispose.remove();
      };
    });

    const localRefs = () =>
      ({
        goBack: () => {
          if (!webViewCanGoBack) {
            return false;
          }
          webViewRef.current?.goBack();
          return true;
        },
        emit: (event: string, payload: any) => {
          console.log('Emitting', event);
          webViewRef.current?.injectJavaScript(`
          window.reactNative.emit('${event}', ${JSON.stringify(payload)});
          true;
        `);
        },
      } satisfies CustomWebViewRef);

    useImperativeHandle(ref, localRefs);

    const inject = `
      (() => {

        const listeners = {};

        const on = (event, callback) =>  {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(callback);
        }
          
        const off = (event, callback) =>  {
          if (!listeners[event]) {
            return;
          }
          const index = listeners[event].indexOf(callback);
          if (index === -1) {
            return;
          }
          listeners[event].splice(index, 1);
        }
        const emit = (event, payload) => {
          if (!listeners[event]) {
            return;
          }
          listeners[event].forEach(listener => listener(payload));
        }
      
        const post = (event, payload) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({event, payload}));
        };

        const logout = () => {
          post('logout');
        }
        const authenticated = (userId) => {
          post('authenticated', {userId, userToken: localStorage.getItem("userToken")});
        }

      
        const playVideo = (url) => {
          post('playVideo', {url});
        };
      
        const playAudio = (url) => {
          post('playAudio', {url});
        }
        
        const pauseAudio = () => {
          post('pauseAudio');
        }

        const seekAudio = (progress) => {
          post('seekAudio', progress);
        }
      
        window.reactNative = {
          isReactNative: true,
          playVideo,
          playAudio,
          pauseAudio,
          seekAudio,
          authenticated,
          logout,
          on,
          off,
          emit,
        };


      
      })();

      true; // note: this is required, or you'll sometimes get silent failures

    `;

    useTrackPlayerEvents([Event.PlaybackState], async event => {
      if (event.state === State.Playing) {
        const progress = await TrackPlayer.getProgress();
        const track = await TrackPlayer.getActiveTrack();
        localRefs().emit('audioLoaded', {
          url: track?.url,
          duration: progress.duration,
          position: progress.position,
        });
      }
    });

    const onMessage = async (evt: WebViewMessageEvent) => {
      const {event, payload} = JSON.parse(evt.nativeEvent.data);
      if (event === 'playVideo') {
        const {url} = payload;
        props.onVideoClick(url);
      }
      if (event === 'playAudio') {
        const {url} = payload;
        if (!url) {
          TrackPlayer.play();
          return;
        }
        localRefs().emit('audioLoading', {url});
        await TrackPlayer.reset();
        await TrackPlayer.setPlayWhenReady(true);
        TrackPlayer.add({url});
      }
      if (event === 'seekAudio') {
        const progress = payload;
        await TrackPlayer.seekTo(progress);
        await TrackPlayer.play();
      }
      if (event === 'pauseAudio') {
        TrackPlayer.pause();
      }
      if (event === 'logout') {
        console.log('logged out');
        await EncryptedStorage.clear();
        await messaging().unregisterDeviceForRemoteMessages();
      }
      if (event === 'authenticated') {
        props.onAuthenticated(payload);
        const {userId, userToken} = payload;
        console.log('authenticated', userId);
        await storeUserId(userId);
        await storeUserToken(userToken);
        await registerNotificationChannels();

        await messaging().registerDeviceForRemoteMessages();
        const token = await messaging().getToken();
        localRefs().emit('registerFCM', {token});
      }
    };

    return (
      <WebView
        ref={webViewRef}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={inject}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        textInteractionEnabled={false}
        textZoom={100}
        style={styles.container}
        source={{uri: props.url || 'https://nerimity.com/login'}}
        onLoadProgress={({nativeEvent}) => {
          setWebViewCanGoBack(nativeEvent.canGoBack);
        }}
        onNavigationStateChange={state => {
          currentUrl = state.url;
        }}
        onMessage={onMessage}
      />
    );
  },
);
const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#131416',
  },
});
