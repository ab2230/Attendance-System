import {View, Text, TextInput, Pressable, TouchableOpacity} from 'react-native';
import React from 'react';
import {color, textStyles} from '../styles/Styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from '../styles/scaling';

const CustomTextInput = ({
  style,
  label,
  placeholder,
  lastPlaceholder,
  keyboardType,
  autoCapitalize,
  input,
  setInput,
  icon,
  error,
  handleFocus,
  secureTextEntry,
  uneditableTextEntry,
  btntext,
  navigation,
  paddingVertical,
  hasBarCode,
  barcodeGo,
  optional,
  keyboard,
  isCurrency,
  labelIcon,
  fontSize,
  borderColor,
  isProfile,
  searchIcon,
  required // Add the new required prop
}) => {
  return (
    <View style={{marginBottom: scale(8)}}>
      {label && (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {labelIcon ? labelIcon : null}
          <Text
            style={[
              textStyles.text_regular_Gray,
              {
                marginVertical: 5,
                marginLeft: 2,
                fontSize: 14,
              },
            ]}>
            {label}
          </Text>
          {/* Show red asterisk if required is true */}
          {required && (
            <Text style={{color: 'red', marginLeft: 2}}>*</Text>
          )}
          {optional ? (
            <Text
              style={{
                marginVertical: 5,
                marginLeft: 2,
                fontSize: 16,
                color: color.textGray,
              }}>
              (Optional)
            </Text>
          ) : null}
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text
              style={[
                {
                  color: 'blue',
                },
              ]}>
              {btntext}
            </Text>
          </Pressable>
        </View>
      )}
      <View
        style={[
          style,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1.5,
            style,
            borderRadius: 10,
            backgroundColor: !uneditableTextEntry ? color.lightGray : null,
            paddingLeft: 10,
            paddingRight: 10,
            paddingVertical: 0,
            borderColor: error
              ? color.warning
              : borderColor
              ? borderColor
              : color.outline,
          },
        ]}>
        {icon}
        <TextInput
          style={[
            isProfile ? textStyles.text_bold_Gray : textStyles.text_regular,
            {
              flex: 1,
              fontSize: fontSize ? fontSize : 14,
              paddingVertical: paddingVertical,
            },
          ]}
          value={input?.toString()}
          placeholder={placeholder ? placeholder : 'Pass Placeholder'}
          placeholderTextColor={color.outline}
          onChangeText={value => setInput(value)}
          onFocus={handleFocus}
          color={color.textDark}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          editable={uneditableTextEntry}
          showSoftInputOnFocus={keyboard == false ? false : true}
        />
        <Text style={{color: color.gray, fontSize: 16, marginRight: 10}}>
          {lastPlaceholder}
        </Text>
        {searchIcon}
        {hasBarCode ? (
          <TouchableOpacity
            style={[
              {
                borderLeftWidth: 1,
                paddingLeft: 10,
                borderColor: color.grayDark,
              },
            ]}
            onPress={barcodeGo}>
            <MaterialCommunityIcons
              name="line-scan"
              size={25}
              color={color.grayDark}
            />
          </TouchableOpacity>
        ) : null}
        <View>
          {isCurrency ? (
            <Text
              style={{
                color: color.Neutral_60,
                fontSize: 16,
                fontWeight: 600,
                fontFamily: 'Nunito Sans',
              }}>
              Br
            </Text>
          ) : null}
        </View>
      </View>
      {error ? (
        <Text style={[{color: color.warning, paddingLeft: 5}]}>{error}</Text>
      ) : null}
    </View>
  );
};

export default CustomTextInput;