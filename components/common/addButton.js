import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const addButton = ({onClick}) => {
    return(
        <TouchableOpacity
        style={{
            borderWidth:1,
            borderColor:'rgba(0,0,0,0.2)',
            position:"absolute",
            justifyContent:"center",
            alignItems:"center",
            bottom:10,
            right:10,
            width:50,
            height:50,
            backgroundColor:'blue',
            borderRadius:50,
          }}
        onPress={()=>onClick()}
      >
        <Text style={{color:"#fff",fontSize:40,marginTop:-5}}>+</Text>
      </TouchableOpacity>
    )
}

export default addButton;