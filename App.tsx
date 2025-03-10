
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity,View } from 'react-native';
import RNBluetoothClassic, {BluetoothDevice, BluetoothEventType} from 'react-native-bluetooth-classic';

const requestAccessFineLocationPermission = async () => {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Access fine location required for discovery',
      message:
        'In order to perform discovery, you must enable/allow ' +
        'fine location access.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

async function requestBluetoothPermissions() {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    ]);

    if (granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Bluetooth permissions granted');
      return true;
    } else {
      console.log('Bluetooth permissions denied');
      return false;
    }
  } catch (err) {
    console.warn(err);
    return false;
  }
}

const askForLocationPerm = () => {
  requestAccessFineLocationPermission().then((granted) => {
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Access fine location permission was not granted. ' +
          'Please enable it to use Bluetooth functionality.'
      );
    }
  });
}


const BluetoothStatusList = [
  'Disabled ( Enable the Bluetooth...) ', 
  'Enabled ( Connect to HC05 module )',
  'Connected'
];


function getHC05Id(device: any){
  return device.name == "HC-05"
}

const getHC05Device = async () => {

  const hasPermission = await requestBluetoothPermissions();
  const hasLocation = await requestAccessFineLocationPermission();


  if(!hasPermission && !hasLocation) return;


  try{
    const devices = await RNBluetoothClassic.getBondedDevices();
    const device = devices.find(getHC05Id)
    if(device){
      console.log('got the device id');
      return device;
    }
    else{
      console.log('not found');
      return null;
    }
  }
  catch(error)
  {
    console.log(error, 'FAILED to get devies');
    return null;
  }
}



function App(): React.JSX.Element {

  const [sliderValue, setSliderValue] = useState(0);
  const [bluetoothStatus, setBluetoothStatus] = useState(0);
  const [hc05module, setHC05module] = useState('');


  useEffect(() => {
    
    askForLocationPerm();
    bluetoothCheck();

  }, []);

  useEffect(()=>{
    bluetoothCheck();
  },[hc05module]);

  useEffect(()=>{
    if(hc05module){
      console.log('SENDING', sliderValue);
      RNBluetoothClassic.writeToDevice(hc05module, `${sliderValue}\n`);
    }
  }, [sliderValue]);

  //LISTENER
  RNBluetoothClassic.onStateChanged((state) => {
    if(state.enabled){
      setBluetoothStatus(1);
      checkInConnectedDevice();
    }
    if(!state.enabled){
      console.log('OFFFFFFFF')
      setHC05module('');
      setBluetoothStatus(0);
      
    }
  });

  //LISTENER
  RNBluetoothClassic.onDeviceConnected((event)=>{
    {
      console.log('CONNECTED', event);
      RNBluetoothClassic.writeToDevice(hc05module, `${sliderValue}\n`);
    }
  })


  RNBluetoothClassic.onDeviceDisconnected((event)=>
    {
      console.log('DISCONNECTED',event);
      setHC05module('');
      setBluetoothStatus(1);
    } 
  )

  const bluetoothCheck = async () =>{
    await RNBluetoothClassic.isBluetoothEnabled().then((enabled) => {
      if(enabled){
        setBluetoothStatus(1);
        checkInConnectedDevice();   
      }
      else{
        console.log("I AM CALLED");
        setBluetoothStatus(0);
      }
    }
    );
  }



  const checkInConnectedDevice = async() => {
    await RNBluetoothClassic.getConnectedDevices().then(
          (devices)=>{
            if(devices){
              const device = devices.find(getHC05Id);
              if(device){
                setHC05module(device.id);
                setBluetoothStatus(2);
                RNBluetoothClassic.writeToDevice(hc05module, `${sliderValue}\n`);
              }
              else{
                setBluetoothStatus(1);
                connectToHC05();
              }
            }
          }
        )
  }

  const connectToHC05 = () => {
    getHC05Device().then(
      (device)=>{
        console.log(device, 'connecting to it');
        if(device){
          RNBluetoothClassic.connectToDevice(device?.id).then(
            (BluetoothDevice)=>{
              if(BluetoothDevice)
              {
                console.log('connected to device');
                console.log(BluetoothDevice);
                setHC05module(BluetoothDevice.address);
                RNBluetoothClassic.writeToDevice(hc05module, `${sliderValue}\n`);
              }
              else{
                console.log('unable to connect to device');
                setHC05module('unable to connect');
              }
            }
          )
        }
        else{
          setBluetoothStatus(1);
        }
      }
    )
  }

  const openBluetoothSetting = () => {
    if(bluetoothStatus==1){
      connectToHC05();
    }
    else if(bluetoothStatus == 0){
      RNBluetoothClassic.openBluetoothSettings();
    }
  }

  const onSliderChange = (value: number)=>{
    setSliderValue(Number(value.toFixed(0)));
    
  }

  return(
    <SafeAreaView style={{flex: 1, backgroundColor: '#462563'}}>
    <View style={styles.sectionContainer}>
    <StatusBar barStyle="light-content" />
    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
      <Text style= {styles.bluetoothStatus} onPress={openBluetoothSetting}>
        Bluetooth : {BluetoothStatusList[bluetoothStatus]} {hc05module?`(${hc05module})`:''}
      </Text>
      <TouchableOpacity style={styles.aboutButton} onPress={()=>Alert.alert("About", "Made by : Vashu Kashyap")}>
        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 20}}>i</Text>
      </TouchableOpacity>
    </View>
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
    <View style={styles.centerTextContainer}>
      <Text style={styles.numberContainer}>{sliderValue}</Text>
      <Text style={styles.percentageContainer}>%</Text>
    </View>
    </View>
    <View style={styles.sliderContainer}>
    <Slider
      style={styles.sliderStyle}
      value={sliderValue}
      onValueChange={onSliderChange}
      minimumValue={0}
      maximumValue={100}
      minimumTrackTintColor="#FFFFFF"
      maximumTrackTintColor="#000000"
      thumbTintColor="#FFFFFF"/>
      <Text style={{color: 'white'}}>
        ( Led Brightness )
      </Text>
      </View>
    </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 10,
    backgroundColor: '#512a73',
    flex: 1,
  },
  centerTextContainer: {
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  numberContainer: {
    fontSize: 100,
    color: 'white',
    fontWeight: 'bold',
  },
  percentageContainer:{
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  sliderContainer: {
    paddingBottom: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sliderStyle: {
    width: '100%',
    height: 40,
  },
  aboutButton: {
    borderColor: 'white',
    borderWidth: 2,
    width: 32,
    height: 32,
    marginTop: 10,
    borderRadius: 50,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  bluetoothStatus: {
    color: 'white',
    fontSize: 12,
    textAlignVertical: 'center',
    marginTop: 10,
  }
});

export default App;
