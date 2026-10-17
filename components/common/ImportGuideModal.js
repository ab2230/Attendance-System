import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MEMBER_TYPES } from '../constants/memberTypes';

const ImportGuideModal = ({ visible, onClose, onProceed }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <LinearGradient
              colors={["#4da0b0", "#4d79b0"]}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="upload" size={22} color="#fff" />
              <Text style={styles.headerTitle}>Import Students</Text>
            </LinearGradient>
          </View>

          <ScrollView contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>Required file format</Text>
            <Text style={styles.paragraph}>
              Prepare an Excel or CSV file with a header row and three columns:
            </Text>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>First Name</Text></View>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>Last Name</Text></View>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>Type</Text></View>

            <Text style={[styles.paragraph, { marginTop: 10 }]}>Supported header names:</Text>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>First name: "First Name", "firstName", or "First"</Text></View>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>Last name: "Last Name", "lastName", or "Last"</Text></View>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>Type: "Type", "Member Type", or "Student Type"</Text></View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Allowed Type values</Text>
            {MEMBER_TYPES.map((type) => (
              <View key={type} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{type}</Text>
              </View>
            ))}
            <Text style={[styles.paragraph, { marginTop: 6 }]}>
              Type is case-insensitive. Rows with any other type are skipped.
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Example</Text>
            <View style={styles.exampleBox}>
              <View style={styles.exampleRow}>
                <Text style={[styles.exampleCell, styles.exampleHeader]}>First Name</Text>
                <Text style={[styles.exampleCell, styles.exampleHeader]}>Last Name</Text>
                <Text style={[styles.exampleCell, styles.exampleHeader, styles.lastCell]}>Type</Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleCell}>Abel</Text>
                <Text style={styles.exampleCell}>Kebede</Text>
                <Text style={[styles.exampleCell, styles.lastCell]}>Regular</Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleCell}>Hanna</Text>
                <Text style={styles.exampleCell}>Solomon</Text>
                <Text style={[styles.exampleCell, styles.lastCell]}>Extension</Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleCell}>Dawit</Text>
                <Text style={styles.exampleCell}>Alemu</Text>
                <Text style={[styles.exampleCell, styles.lastCell]}>Distant</Text>
              </View>
            </View>

            <Text style={[styles.paragraph, { marginTop: 10 }]}>
              Tips: put your data on the first sheet, keep one student per row, and ensure names and type are filled.
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Supported file types</Text>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>Excel: .xlsx, .xls</Text></View>
            <View style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>CSV: .csv</Text></View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={onProceed}>
              <LinearGradient
                colors={["#4da0b0", "#4d79b0"]}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="folder-open" size={18} color="#fff" />
                <Text style={styles.primaryText}>Choose File</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    width: '100%',
  },
  headerGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  paragraph: {
    fontSize: 14,
    color: '#495057',
    marginTop: 6,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bullet: {
    width: 16,
    color: '#495057',
    fontSize: 16,
  },
  bulletText: {
    flex: 1,
    color: '#495057',
    fontSize: 14,
  },
  exampleBox: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  exampleRow: {
    flexDirection: 'row',
  },
  exampleCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#dee2e6',
    color: 'black'
  },
  lastCell: {
    borderRightWidth: 0,
  },
  exampleHeader: {
    backgroundColor: '#f1f3f5',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 10,
  },
  gradientButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    backgroundColor: '#f1f3f5',
  },
  secondaryText: {
    color: '#495057',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontWeight: '600',
  },
});

export default ImportGuideModal;
