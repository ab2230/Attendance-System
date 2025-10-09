import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { color, textStyles } from '../styles/Styles';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale } from '../styles/scaling';

const CustomDropDown = ({
  data,
  label,
  setSelected,
  currentSelected,
  noListLabel,
  onPressNoList,
  error,
  PlaceHolders,
  rightBtnLabel,
  rightBtn,
  rightBtnGo,
  innerLabel,
  signup,
  uneditableTextEntry = true,
  required // Add the new required prop
}) => {
  const [isDroped, setIsDroped] = useState(false);
  const [currentItem, setCurrentItem] = useState(currentSelected);

  function handleOnPress(item) {
    setSelected && setSelected(item);
    setCurrentItem(item);
    setIsDroped(false);
  }

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {label && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                textStyles.text_regular_Gray,
                {
                  marginVertical: 5,
                  marginLeft: 2,
                  fontSize: 14,
                },
              ]}
            >
              {label}
            </Text>
            {/* Show red asterisk if required is true */}
            {required && (
              <Text style={{ color: 'red', marginLeft: 2 }}>*</Text>
            )}
          </View>
        )}
        {rightBtn ? (
          <TouchableOpacity onPress={rightBtnGo}>
            <Text
              style={[
                textStyles.text_regular_Gray,
                { color: color.textGray, fontSize: 16 },
              ]}
            >
              {rightBtnLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => (uneditableTextEntry ? setIsDroped(!isDroped) : null)}
        style={{
          borderWidth: 1,
          borderColor: error ? color.red : color.deepLightGray,
          borderRadius: 10,
          paddingHorizontal: 10,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: 5,
          }}
        >
          {signup ? (
            <Ionicons
              name="briefcase-outline"
              size={18}
              color={color.secondary}
            />
          ) : null}
          <Text
            style={[
              textStyles.text_regular,
              {
                color: currentItem || currentSelected ? color.black : color.textGray,
                fontSize: 16,
              },
            ]}
          >
            {innerLabel ? (
              <Text style={{ fontSize: scale(12), color: color.textGray }}>{innerLabel} </Text>
            ) : null}
            {currentItem?.name || null}
          </Text>
          <Ionicons
            style={{ transform: [{ rotate: isDroped ? '180deg' : '0deg' }] }}
            name="chevron-down"
            size={24}
            color={color.deepLightGray}
          />
        </View>
      </TouchableOpacity>

      {isDroped && (
        <View
          style={{
            borderWidth: 1,
            borderRadius: 10,
            backgroundColor: color.white,
            overflow: 'hidden',
            borderColor: color.outline,
            marginTop: 10,
          }}
        >
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {data?.map((item, index) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={{
                    borderBottomWidth: index == data.length - 1 ? 0 : 2,
                    borderColor: color.deepLightGray,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                  onPress={() => handleOnPress(item)}
                >
                  <Text
                    style={[
                      textStyles.text_regular,
                      { 
                        backgroundColor: color.white,
                        color: color.black,
                        fontSize: 16,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default CustomDropDown;