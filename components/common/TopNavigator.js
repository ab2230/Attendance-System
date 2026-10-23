import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Entypo from 'react-native-vector-icons/Entypo';
import { useTranslation } from "react-i18next";
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppTheme from '../theme/appTheme';

const TopNavigator = ({ title, backButton = false, uploadTrue=false, importing, handleImport }) => {
  const {i18n, t} = useTranslation(); // Get translation functions
  const navigation = useNavigation();
  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language || 'en',
  ); // Get current lang
  const onLanguageChange = async lang => {
    await i18n.changeLanguage(lang); // Change language globally
    await AsyncStorage.setItem('appLanguage', lang);
    setSelectedLanguage(lang); // Update local state
  };
  return (
    <View style={styles.container}>
      {backButton && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Entypo name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
      )}
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1}}>
      <Text style={styles.title}>{title}</Text>
      {uploadTrue?null:<TouchableOpacity style={styles.languageContainer} onPress={() => onLanguageChange((selectedLanguage == 'en'? 'am' : 'en'))}>
         <Text style={{color: 'white'}}>{selectedLanguage == 'en'? "English" : "አማርኛ"}</Text>
        </TouchableOpacity>}
        {uploadTrue?<TouchableOpacity 
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
              </TouchableOpacity>: null
}
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: AppTheme.header,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 50
  },
  backButton: {
    paddingLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppTheme.accent,
    padding:10
  },
  languageContainer: {
    alignItems: 'center',
    marginRight: 15,
    justifyContent: 'center',
  },
  importButton: {
    borderRadius:   10,
    marginRight: 20,
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
    padding:10
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default TopNavigator;
