import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import TopNavigator from '../../common/TopNavigator';
import { color, textStyles } from '../../styles/Styles';
import { scale } from '../../styles/scaling';
import ClassScreen from './ClassScreen';
import ProgramList from './ProgramList';
import { useTranslation } from 'react-i18next';

const ClassAndProgram = ({navigation}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('Tab1');
  const underlinePosition = useRef(new Animated.Value(activeTab === 'Tab1' ? 0 : 1)).current;
  
  const handleTabPress = tabName => {
    setActiveTab(tabName);
    Animated.timing(underlinePosition, {
      toValue: tabName === 'Tab1' ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const underlineLeft = underlinePosition.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%']
  });

  const renderTabButton = (label, tabName) => (
    <TouchableOpacity
      onPress={() => handleTabPress(tabName)}
      style={styles.tabButton}
      activeOpacity={0.7}>
      <Text style={[
        styles.tabButtonText,
        activeTab === tabName && styles.activeTabText,
        textStyles.text_bold
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}> 
      <TopNavigator title={t('classAndProgram')} />
      
      <View style={styles.contentContainer}>
        <View style={styles.tabContainer}>
          <View style={styles.tabsWrapper}>
            {renderTabButton(t('classes'), 'Tab1')}
            {renderTabButton(t('programs'), 'Tab2')}
          </View>
          <Animated.View 
            style={[
              styles.activeIndicator,
              { left: underlineLeft }
            ]} 
          />
        </View>
        
        {/* Tab Content with subtle fade animation */}
        <Animated.View style={styles.tabContent}>
          {activeTab === 'Tab1' && <ClassScreen navigation={navigation}/>}
          {activeTab === 'Tab2' && <ProgramList navigation={navigation}/>}
        </Animated.View>
      </View>
    </View>
  )
}

export default ClassAndProgram

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  contentContainer: {
    flex: 1,
  },
  tabContainer: {
    backgroundColor: 'white',
    padding: scale(4),
    shadowColor: color.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabButton: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    width: '50%',
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: scale(14),
    color: color.gray,
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: color.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: 3,
    backgroundColor: color.primary,
    borderRadius: 3,
  },
  tabContent: {
    flex: 1,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});