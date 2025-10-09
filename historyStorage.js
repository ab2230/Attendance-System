import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = "history"
export const setHistory = (data) =>{
    return new Promise((resolve,reject)=>{
        if(typeof data === "object"){
            data = JSON.stringify(data);
        }
        AsyncStorage.setItem(KEY,data).then(()=>{
            resolve();
        });
    })
}

export const getHistory = () =>{
    return new Promise((resolve,reject)=>{
        AsyncStorage.getItem(KEY).then((value)=>{
            try{
                let data = JSON.parse(value);
                resolve(data)
            } catch (e) {
                resolve(value);
            }
        })
    })
}