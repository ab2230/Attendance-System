import { scale } from "./scaling";

export const color = {
   primary: '#163F58',
  // primary: '#009865',
  lightPrimary: 'rgba(215, 26, 98, 0.10)',
  //lightPrimary: '#B8E2D4',
  brightPrimary: '#DFF3ED',
   secondary: '#F5B51B',
  //secondary: '#FCA019',
  lightSecondary: '#FEDDAC5',
  Secondary_20:'#83530D',
  lightGray: '#F9F7F7',
  // lightGray: '#F9F7F7',
  deepLightGray: '#c2c2c2',
  outline: '#C4C6D0',
  gray: '#A8A8A8',
  //gray: '#787579',
  black: '#000',
  lightBlack: '#2E2B3E',
  white: '#fff',
  red: "#D71A1A",
  warning: '#B3261E',
  warningOutline: '#F2B8B5',
  success: '#1F8335',
  lightsuccess: "#B1DBBA",
  darkTransparent: 'rgba(0,0, 0,0.35)',
  Neutral_60: '#939094',
  Neutral_30: '#484649',
  Neutral_70: '#AEAAAE',
  Neutral_20: '#313033',
  Neutral_90: '#E6E1E5',
  Neutral_95: '#F4EFF4',
  graybackground: '#0000000d',
  textGray: '#939094',
  textDark: '#555555',
  grayOutline:'#D3D3D3',
 


  green: '#56CA0F',
  lightGreen: '#56CA0F1A',
  lightBlue: '#3222C61A',
  grayDark: '#A1A3A8',
};


export const textStyles = {
  // for release two 
  heading_bold: {
    fontFamily:'NunitoSans_10pt-Bold',
    fontSize: scale(20),


  },
  heading_bold_white: {
    fontFamily:'NunitoSans_10pt-Regular',
    fontSize: 20,
    color: color.white,
    fontWeight: 700,
  },
  text_regular: {
    fontFamily:'NunitoSans_10pt-Regular',
    fontSize: scale(14),
  },
  text_small_Gray: {
    fontFamily:'NunitoSans_10pt-Regular',
    fontSize: scale(12),
    color:color.textGray,
  },
  text_regular_Gray: {
    fontFamily:'NunitoSans_10pt-Regular',
    fontSize: scale(14),
    color:color.textGray,
  },
  text_semiBold: {
    fontFamily:'NunitoSans_10pt-SemiBold',
    fontSize: scale(14),  
  },
  text_bold: {
    fontFamily:'NunitoSans_10pt-Bold',
    fontSize: scale(14),
  },
  text_bold_Gray: {
    fontFamily:'NunitoSans_10pt-Bold',
    fontSize: scale(14),
    color:color.textGray,

  },
  text_sm: {
    fontFamily:'NunitoSans_10pt-SemiBold',
    fontSize: 15,
    color: color.black,
  },

  text_sm_gray: {
    fontFamily:'NunitoSans_10pt-SemiBold',
    fontSize: 15,
    color: color.gray,
  },






  // from release one 


  heading_blue: {
    fontSize: 25,
    color: color.secondary,
    fontWeight: '600',
  },

  heading_normal: {
    fontSize: 18,
    color: color.black,
    fontWeight: '600',
  },

  text_normal: {
    fontSize: 17,
    color: color.black,
    fontWeight: '500',
  },


};

export const fontSize = {
  h1: {
    fontSize: 20,
  },
  h2: {
    fontSize: 17,
  },
  h3: {
    fontSize: 15,
  },
  h4: {
    fontSize: 14,
  },
  h5: {
    fontSize: 12,
  },
  h6: {
    fontSize: 10,
  },
};
export const componentStyles = {
  shadowBtn: {
    borderTopWidth: 0.2,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1.8,
    alignItems: "center",
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10
  },
  settingGroup: {
    paddingHorizontal: 20,
    backgroundColor: color.white,
    borderBottomWidth: 2,
    borderColor: color.outline
},settingTitle: {
  paddingHorizontal: 20,
  paddingVertical: 10,
  color: color.textDark,
  fontWeight: '500'
},
}
export const containerStyles = {
  mainContainer: {
    flex: 1,
    backgroundColor: color.white,

    // backgroundColor:"red"
  },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },

  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
};
