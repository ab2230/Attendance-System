import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Entypo from 'react-native-vector-icons/Entypo';
import { useTranslation } from "react-i18next";
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppTheme from '../theme/appTheme';

const TopNavigator = ({ title, subtitle, backButton = false, uploadTrue=false, importing, handleImport }) => {
  const {i18n, t} = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language || 'en',
  );
  const onLanguageChange = async lang => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
    setSelectedLanguage(lang);
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        {backButton && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Entypo name="chevron-left" size={24} color="white" />
          </TouchableOpacity>
        )}
        <View style={styles.contentRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {uploadTrue ? null : (
            <TouchableOpacity style={styles.languageContainer} onPress={() => onLanguageChange((selectedLanguage == 'en'? 'am' : 'en'))}>
              <Text style={{color: 'white'}}>{selectedLanguage == 'en'? "English" : "አማርኛ"}</Text>
            </TouchableOpacity>
          )}
          {uploadTrue ? (
            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImport}
              disabled={importing}
            >
              <LinearGradient
                colors={['#4da0b0', '#4d79b0']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="upload" size={20} color="white" />
                <Text style={styles.buttonText}>Import</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppTheme.header,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inner: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    paddingLeft: 8,
    paddingRight: 4,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  titleBlock: {
    flexShrink: 1,
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppTheme.accent,
  },
  subtitle: {
    fontSize: 12,
    color: AppTheme.textSoft,
    marginTop: 2,
  },
  languageContainer: {
    alignItems: 'center',
    marginRight: 15,
    justifyContent: 'center',
  },
  importButton: {
    borderRadius: 10,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  gradientButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    padding: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default TopNavigator;
