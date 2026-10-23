import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import AttendanceRecordsScreen from './AttendanceRecordsScreen';
import AttendanceSummaryScreen from './AttendanceSummaryScreen';
import TopNavigator from '../../common/TopNavigator';
import { color, textStyles } from '../../styles/Styles';
import AppTheme from '../../theme/appTheme';
import { scale } from '../../styles/scaling';

const AttendanceRecords = () => {
  const [activeTab, setActiveTab] = useState('Tab1');

  const handleTabPress = (tabName) => setActiveTab(tabName);

  const renderTabButton = (label, tabName) => (
    <TouchableOpacity
      onPress={() => handleTabPress(tabName)}
      style={styles.tabButton(activeTab === tabName)}
    >
      <Text
        style={[
          styles.tabButtonText(activeTab === tabName),
          textStyles.text_bold,
          { fontSize: scale(12) },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <TopNavigator title="Attendance Records" />

      {/* Tabs */}
      <View style={styles.tabSection}>
        <View style={styles.tabContainer}>
          {renderTabButton('Report 1', 'Tab1')}
          {renderTabButton('Report 2', 'Tab2')}
        </View>

        {/* Content section */}
        <View style={styles.contentContainer}>
          {activeTab === 'Tab1' && <AttendanceRecordsScreen />}
          {activeTab === 'Tab2' && <AttendanceSummaryScreen />}
        </View>
      </View>
    </View>
  );
};

export default AttendanceRecords;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  tabSection: {
    flex: 1, // give space to tabs + content
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
    paddingVertical: 8,
  },
  tabButton: (isActive) => ({
    borderBottomWidth: isActive ? 4 : 0,
    paddingVertical: 5,
    width: 100,
    alignItems: 'center',
    borderBottomColor: AppTheme.accent,
  }),
  tabButtonText: (isActive) => ({
    color: isActive ? AppTheme.accent : AppTheme.textMuted,
    fontSize: scale(13),
  }),
  contentContainer: {
    flex: 1, // allow AttendanceRecordsScreen to expand fully
    marginTop: 10,
  },
});
