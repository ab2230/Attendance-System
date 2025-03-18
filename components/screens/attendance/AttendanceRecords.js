import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React,{useState} from 'react'
import AttendanceRecordsScreen from './AttendanceRecordsScreen';
import AttendanceSummaryScreen from './AttendanceSummaryScreen';
import TopNavigator from '../../common/TopNavigator';
import { color, textStyles } from '../../styles/Styles';
import { scale } from '../../styles/scaling';

const AttendanceRecords = () => {
      const [activeTab, setActiveTab] = useState('Tab1');
      const handleTabPress = tabName => {
          setActiveTab(tabName);
        };
      const renderTabButton = (label, tabName) => (
          <TouchableOpacity
            onPress={() => handleTabPress(tabName)}
            style={styles.tabButton(activeTab === tabName)}>
            <Text style={[styles.tabButtonText(activeTab === tabName),textStyles.text_bold,{fontSize: scale(12),}]}>{label}</Text>
          </TouchableOpacity>
        );
    return (
      <View style={{flex:1}}>
           <TopNavigator title="Attendance Records" />
           <View style={{padding:20}}>
        <View style={styles.tabContainer}>
          {renderTabButton('Report 1', 'Tab1')}
          {renderTabButton('Report 2', 'Tab2')}
        </View>
        {/* Tab Content */}
        {activeTab === 'Tab1' && <AttendanceRecordsScreen/>}
        {activeTab === 'Tab2' && <AttendanceSummaryScreen/>}
        </View>
      </View>
    )
  }

export default AttendanceRecords

const styles = StyleSheet.create({
    tabContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: color.deepLightGray,
    },
      tabButton: isActive => ({
          borderBottomWidth: isActive ? 5 : 0,
          borderRadius: 2,
          paddingBottom: 5,
          borderBottomColor: color.primary,
          width: 90,
          alignItems: 'center',
        }),
        tabButtonText: isActive => ({
          color: isActive ? color.primary : color.gray,
          fontSize: scale(12),
        }),
  })