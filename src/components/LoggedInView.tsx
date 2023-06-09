import React, {startTransition} from 'react';
import {observer} from 'mobx-react-lite';
import {ScrollView, Text, View, StyleSheet} from 'react-native';
import {useStore} from '../store/store';
import {Server} from '../store/servers';

import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {Channel} from '../store/channels';
import CustomPressable from './ui/CustomPressable';
import Avatar from './ui/Avatar';
import {RootStackParamList} from '../../App';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {ChannelType} from '../store/RawData';
import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;
const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.backgroundColor,
    flexDirection: 'row',
  },
  serverListContainer: {height: '100%', marginLeft: 5, marginRight: 5},
  serverPane: {
    backgroundColor: 'rgb(35 38 41)',

    flex: 1,
    margin: 10,
    marginLeft: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  serverChannelListContainer: {
    flex: 1,
    paddingLeft: 5,
    paddingRight: 5,
  },
  serverCategoryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 5,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 2,
  },
  serverCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
    gap: 5,
  },
  serverChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    width: '100%',
  },
  hashIcon: {
    opacity: 0.2,
    fontSize: 16,
    marginRight: 5,
  },
  serverItemContainer: {
    margin: 10,
  },
  serverChannelName: {
    color: 'rgb(255,255,255)',
  },
});

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

export default function LoggedInView() {
  return (
    <View style={styles.pageContainer}>
      <View>
        <ServerList />
      </View>

      <ServerPane />
    </View>
  );
}

const ServerPane = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {servers, channels} = useStore();

  const server = servers.cache[route.params?.serverId!];

  return (
    <View style={styles.serverPane}>
      <Header title={server?.name || '...'} />
      <ServerChannelList
        channels={channels.getSortedChannelsByServerId(server?.id)}
      />
    </View>
  );
};

const ServerChannelList = observer((props: {channels: Channel[]}) => {
  return (
    <ScrollView style={styles.serverChannelListContainer}>
      {props.channels.map(channel => {
        if (channel.categoryId) {
          return null;
        }
        if (channel.type === ChannelType.CATEGORY) {
          return <ServerCategoryItem key={channel.id} category={channel} />;
        }
        return <ServerChannelItem key={channel.id} channel={channel} />;
      })}
    </ScrollView>
  );
});

const ServerCategoryItem = (props: {category: Channel}) => {
  const {channels} = useStore();
  const categoryChannels = channels
    .getSortedChannelsByServerId(props.category.serverId!)
    .filter(c => c.categoryId === props.category.id);

  return (
    <View style={styles.serverCategoryContainer}>
      <View style={styles.serverCategoryHeader}>
        <Icon name="segment" size={20} />
        <Text>{props.category.name}</Text>
      </View>
      <CategoryChannelList channels={categoryChannels} />
    </View>
  );
};

const CategoryChannelList = (props: {channels: Channel[]}) => {
  return (
    <View>
      {props.channels.map(channel => (
        <ServerChannelItem key={channel.id} channel={channel} />
      ))}
    </View>
  );
};

const ServerChannelItem = observer((props: {channel: Channel}) => {
  const nav = useNavigation<MainScreenNavigationProp>();

  return (
    <CustomPressable
      selected={props.channel.hasNotifications()}
      handleColor={Colors.alertColor}
      onPress={() =>
        startTransition(() =>
          nav.navigate('Message', {
            channelId: props.channel.id,
            serverId: props.channel.serverId,
          }),
        )
      }>
      <View style={styles.serverChannelItem}>
        <Text style={styles.hashIcon}>#</Text>
        <Text numberOfLines={1} style={styles.serverChannelName}>
          {props.channel.name}
        </Text>
      </View>
    </CustomPressable>
  );
});

const ServerList = observer(() => {
  const {servers} = useStore();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.serverListContainer}>
      {servers.orderedArray.map(server => (
        <ServerItem server={server} key={server.id} />
      ))}
    </ScrollView>
  );
});

const ServerItem = observer((props: {server: Server}) => {
  const nav = useNavigation<MainScreenNavigationProp>();
  const route = useRoute<MainScreenRouteProp>();

  const selected = route.params?.serverId === props.server.id;

  return (
    <CustomPressable
      selected={selected || !!props.server.hasNotifications}
      handleColor={
        props.server.hasNotifications ? Colors.alertColor : undefined
      }
      onPress={() =>
        startTransition(() => nav.navigate('Main', {serverId: props.server.id}))
      }>
      <View style={styles.serverItemContainer}>
        <Avatar animate={selected} size={50} server={props.server} />
      </View>
    </CustomPressable>
  );
});
