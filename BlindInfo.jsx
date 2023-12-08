import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, StatusBar, TextInput, PermissionsAndroid, Platform , ScrollView } from 'react-native';
import { BleManager, BleError, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

export const manager = new BleManager();

export default BlindInfo = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [peripheralId, setPeripheralId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [readyToScan, setReadyToScan] = useState(false);
  const [serviceUUID, setServiceUUID] = useState('0000ffe0-0000-1000-8000-00805f9b34fb');
  const [characteristicUUID, setCharacteristicUUID] = useState('0000ffe1-0000-1000-8000-00805f9b34fb');
  const [lightLevel, setLightLevel] = useState(50);
  const [step, setStep] = useState(0);
  const [distance, setDistance] = useState(50);
  const [openTime, setOpenTime] = useState('00:00');
  const [closeTime, setCloseTime] = useState('11:25');
  const [lowerTemperature, setLowerTempature] = useState(25);
  const [upperTemperature, setUpperTempature] = useState(50);
  const [chosenOpenvalue, setChosenOpenValue] = useState(0);
  const [donePreliminary, setDonePreliminary] = useState(false);
  const [sentData, setSentData] = useState(false);
  const [userInput, setUserInput] = useState(false);


  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }

    console.error('Permission has not been granted');
    return false;
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);
        return (
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }

    console.error('Permission has not been granted');
    return false;
  };

  const waitUntilBluetoothReady = async () => {
    while (!manager.state) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };
  
  useEffect(() => {
    setStep(0);
    requestBluetoothPermission().then((hasBluetoothPermission) => {
      if (hasBluetoothPermission) {
        console.log('Bluetooth permission granted');
        waitUntilBluetoothReady().then(() => {
          requestLocationPermission().then((hasLocationPermission) => {
            if (hasLocationPermission) {
              console.log('Location permission granted');
              setReadyToScan(true);
            } else {
              console.error('Location permission not granted');
            }
          });
        });
      } else {
        console.error('Bluetooth permission not granted');
      }
    });
  }, []);

  const scanAndConnect = () => {
    if (!readyToScan) {
      console.error('Not ready to scan');
      return;
    }
    if (scanning) {
      // Stop scanning
      console.log('Stopping scan...');
      manager.stopDeviceScan();
      setScanning(false);
    } else {
      setScanning(true);
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Error on scanning:', error);
          return;
        }
        if (device.name === 'DSD TECH' && isConnected === false) {
          setStep(0);
          connectToDevice(device);
          manager.stopDeviceScan();
        }
      });
    }
  };

  const connectToDevice = async (device) => {
    try {
      const connectedDevice = await manager.connectToDevice(device.id, { autoConnect: true });
      console.log('Connected to device:', connectedDevice.name);
      setPeripheralId(connectedDevice.id);
      setIsConnected(true);
  
      // Wait until the connection is established before proceeding
      await connectedDevice.isConnected();
  
      // Discover services and characteristics
      await getServiceAndCharacteristics(connectedDevice);

      // Subscribe to updates
      connectedDevice.monitorCharacteristicForService(serviceUUID, characteristicUUID, (error, characteristic) => {
        if (error) {
          console.error('Error on monitoring:', error);
          return;
        }
        if (characteristic.value) {
          const base64Value = Buffer.from(characteristic.value, 'base64').toString('ascii');
          if (base64Value === 'R' && step == 0) {
            runOnceCommandToDevice(connectedDevice);
          } 
        }
      });

      // When disconnected, go back to step 0
      connectedDevice.onDisconnected(() => {
        console.log('Disconnected from device');
        setIsConnected(false);
        setStep(0);
        setSentData(false);

      });
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
    }
  };

  const runOnceCommandToDevice = async () => {
    if (sentData === true) {
      
      return;
    }
    setSentData(true);
    if (await handleSendData("Ready")) {
      console.log('Device is ready');
      setStep(1);
    }
  };

  

  const getServiceAndCharacteristics = async (device) => {
    try {
      // Discover services
      const services = await device.discoverAllServicesAndCharacteristics();
    } catch (error) {
      console.error('Error on discovering services:', error);
    }
  };
  

  const handleSendData = async (data) => {
    if (data === "Ready") {
      //convert time to 24 hour format
      var currentTime = new Date();
      var hours = currentTime.getHours();
      var minutes = currentTime.getMinutes();
      if (minutes < 10) {
        minutes = "0" + minutes;
      }
      var time = hours + ":" + minutes;
      data = "R: " + time + " " + userInput + " :E";
    }
    if(data === "Startup"){
      data = "Startup: " + lowerTemperature + " " + upperTemperature + " " + lightLevel + " "  + distance + " " + openTime + " " + closeTime + ":E";
      setDonePreliminary(true);
    } 
    if (data === "Open") {
      data = "O: " + chosenOpenvalue.toString() + " :E";
    }
    const base64Value = Buffer.from(data).toString('base64');
    console.log('Sending data:', data);
    try {
      await manager.writeCharacteristicWithResponseForDevice(
        peripheralId,
        serviceUUID,
        characteristicUUID,
        base64Value
      );
      console.log('Data sent successfully');
      return true;
    } catch (error) {
      console.error('Error on sending data:', error);
      setStep(0);
      return false;
    }
  };
  
  const disconnectFromDevice = async () => {
    try {
      setIsConnected(false);
      setStep(0);
      setScanning(false);
      await manager.cancelDeviceConnection(peripheralId);2
    } catch (error) {
      console.error('Error on disconnection:', error);
    }
  };

  const castTo100 = (text) => {
    if (text > 100) {
      return 100;
    } else if (text < 0) {
      return 0;
    } else {
      return text;
    }
  };
  
  return (
    <View contentContainerStyle={{backgroundColor: '#fff', flexGrow: 1}}>
      <View style={styles.container}>
        <StatusBar style="auto" />

        {step === 0 && (
          <View style={styles.connectionContainer}>
            <Text style={[styles.connectionText, { color: isConnected ? 'green' : 'red' }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
            <Text style={[styles.connectionText, { color: 'black' }]}>
              {scanning ? 'Scanning...' : 'Not Scanning'}
            </Text>
            {isConnected ? (
              <View style={styles.connectionContainer}>
                <Text style={styles.connectionText}>Device ID: {peripheralId}</Text>
                <Text style={styles.connectionText}>Device Name: DSD TECH</Text>
                <Button title="Disconnect from Device" onPress={disconnectFromDevice} style={styles.button} />
                <Text style={styles.connectionText}>Please Wait for the window blind to finish starting up</Text>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            ) : (
              <Button title="Scan for Devices" onPress={scanAndConnect} style={styles.button} />
            )}
            <View style = {{marginTop: 2}} />
          <Button title = "Control Using User Data" onPress={() => setUserInput(!userInput)} style={{color: userInput ? 'green' : 'red'}}/>
          <Text style={styles.infoText}>User Input: {userInput ? 'On' : 'Off'}</Text>
          </View>
        )}  
        {step === 1 && (
           <View style={styles.preliminaryContainer}>
           <Text style={styles.title}>Window Blind Commands</Text>
           <View style={styles.overallContainer}>
             <Text style={styles.infoText}>Set Upper and Lower Temperature Limits:</Text>
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Lower Temperature Limit: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder={lowerTemperature.toString()}
                  value={lowerTemperature.toString()}
                  onChangeText={(text) => setLowerTempature(text)}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Upper Temperature Limit: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder={upperTemperature.toString()}
                  value={upperTemperature.toString()}
                  onChangeText={(text) => setUpperTempature(text)}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={styles.infoText}>Set Light Percentage to Open at:</Text>
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Light Percentage: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder={lightLevel.toString()}
                  value={lightLevel.toString()}
                  onChangeText={(text) => setLightLevel(castTo100(text))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={styles.infoText}>Set Distance to Open at:</Text>
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Distance: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder={distance.toString()}
                  value={distance.toString()}
                  onChangeText={(text) => setDistance(text)}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={styles.infoText}>Set the time that the window {"\n"}
              blinds will open and close:</Text>
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Open Time: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder= {openTime}
                  value = {openTime}
                  onChangeText={(text) => setOpenTime(text)}
                  maxLength={5}
                />
              </View>
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Close Time: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder= {closeTime}
                  value = {closeTime}
                  onChangeText={(text) => setCloseTime(text)}
                  maxLength={5}
                />
              </View>
              <Button title="Send Startup Data" onPress={() => handleSendData("Startup")} style={styles.button} />
              <View style={styles.overallInputContainer}>
                <Text style={styles.infoText}>Open Blind To: </Text>
                <TextInput
                  style={styles.overallInput}
                  placeholder={chosenOpenvalue.toString()}
                  value={chosenOpenvalue.toString()}
                  onChangeText={(text) => setChosenOpenValue(text)}
                  maxLength={3}
                  keyboardType="numeric"
                />
              </View>
              <Button title="Send Open Value" onPress={() => handleSendData("Open")} style={styles.button} />
              <Button title="Back" onPress={() => setStep(0)} style={styles.button} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 20,
  },
  connectionContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 18,
    marginBottom: 10,
  },
  deviceItem: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007AFF',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderValueText: {
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    color: '#007AFF',
    marginBottom: 10,
  },
  overallContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  overallInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallInput: {
    width: 60,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 5,
  },
  buttonDisabled: {
    marginTop: 10,
    color: '#007AFF',
    marginBottom: 10,
    opacity: 0.5,
  },
});
