import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, StatusBar, TextInput, PermissionsAndroid, Platform , ScrollView } from 'react-native';
import { BleManager, BleError, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

export const manager = new BleManager();

export default BlindInfo = () => {
  const [openingPercentage, setOpeningPercentage] = useState(50);
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [outsideTemperature, setOutsideTemperature] = useState(25);
  const [isConnected, setIsConnected] = useState(false);
  const [wantedTemperature, setWantedTemperature] = useState(25);
  const [readOutChanges, setReadOutChanges] = useState(false);
  const [chosenValue, setChosenValue] = useState(0);
  const [peripheralId, setPeripheralId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [readyToScan, setReadyToScan] = useState(false);
  const [serviceUUID, setServiceUUID] = useState('0000ffe0-0000-1000-8000-00805f9b34fb');
  const [characteristicUUID, setCharacteristicUUID] = useState('0000ffe1-0000-1000-8000-00805f9b34fb');

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

  useEffect(() => {
    requestBluetoothPermission().then((hasBluetoothPermission) => {
      if (hasBluetoothPermission) {
        console.log('Bluetooth permission granted');
        requestLocationPermission().then((hasLocationPermission) => {
          if (hasLocationPermission) {
            console.log('Location permission granted');
            setReadyToScan(true);
          } else {
            console.error('Location permission not granted');
          }
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
      //stop scanning
      console.log('Stopping scan...');
      manager.stopDeviceScan();
      setScanning(false);
    } else {
      setScanning(true);
      console.log('Scanning for devices...');
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Error on scanning:', error);
          return;
        }
        if (device.name === 'DSD TECH' && isConnected === false) {
          setScanning(false);
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
  
      // Discover services and characteristics
      await getServiceAndCharacteristics(connectedDevice);
    } catch (error) {
      console.error('Connection error:', error);
      if (error.errorCode === 133) {
        console.log('Device already connected, reconnecting...');
        setIsConnected(true);
        const connectedDevice = manager.devices.get(peripheralId);
        if (connectedDevice) {
          await connectedDevice.cancelConnection();
        }
      }
      setIsConnected(false);
    }
  };
  
  const getServiceAndCharacteristics = async (device) => {
    try {
      const discoveredDevice = await device.discoverAllServicesAndCharacteristics();
      console.log('All Services and Characteristics:', discoveredDevice);
    } catch (error) {
      console.error('Error discovering services and characteristics:', error);
    }
  };
  
  
  const handleToggleTestingMode = () => {
    setIsTestingMode(!isTestingMode);
  };

  const handleSendData = async () => {
    console.log('Sending data...');
    console.log('Chosen value:', chosenValue);
    console.log(peripheralId);
    const data = 'Hello, World!';
    const base64Value = Buffer.from(data).toString('base64');
    try {
      await manager.writeCharacteristicWithResponseForDevice(
        peripheralId,
        serviceUUID,
        characteristicUUID,
        base64Value
      );
    } catch (error) { 
      console.error('Error on sending data:', error);
    }

  };

  const disconnectFromDevice = async () => {
    try {
      setIsConnected(false);
      await manager.cancelDeviceConnection(peripheralId);2
    } catch (error) {
      console.error('Error on disconnection:', error);
    }
  };
  


  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View  style={styles.container}>
        <View style={styles.connectionContainer}>
          { isConnected ? (
            <View style={styles.connectionContainer}>
              <Text style={styles.connectionText}>Device ID: {peripheralId}</Text>
              <Text style={styles.connectionText}>Device Name: HC-06</Text>
              <Button title="Disconnect from Device" onPress={disconnectFromDevice} style={styles.button} />
            </View>
          ) : (
            <Button title="Scan for Devices" onPress={scanAndConnect} style={styles.button} />
          )}

          <Text style={[styles.connectionText, { color: isConnected ? 'green' : 'red' }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <StatusBar style="auto" />
        <Text style={styles.title}>Window Blind Information</Text>

        <Text style={styles.infoText}>Opening Percentage: {openingPercentage}%</Text>

        <Text style={styles.infoText}>Outside Temperature: {outsideTemperature}°C</Text>

        <Text style={styles.infoText}>
          Window Blind Status: {openingPercentage > 50 ? 'Open' : 'Closed'}
        </Text>

        {openingPercentage > 50 ? (
          <Button title="Open" onPress={() => setOpeningPercentage(100)} style={styles.button} />
        ) : (
          <Button title="Close" onPress={() => setOpeningPercentage(0)} style={styles.button} />
        )}

        <View style={styles.temperatureContainer}>
          <Text style={styles.infoText}>What Temperature to Open the Window Blind at:</Text>
          <View style={styles.temperatureInputContainer}>
            <Text style={styles.infoText}>Temperature to Open at: </Text>
            <TextInput
              style={styles.temperatureInput}
              placeholder="25"
              onChangeText={(text) => setWantedTemperature(text)}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>

        <Button title="Read Out Changes" onPress={() => setReadOutChanges(true)} style={styles.button} />

        <Button
          title={isTestingMode ? 'Turn off Testing Mode' : 'Turn on Testing Mode'}
          onPress={handleToggleTestingMode}
          style={styles.button}
        />
        {isTestingMode ? (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValueText}>
              Testing Mode is on. Please wait for the window blind to map its closed and open positions.
            </Text>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <View style={styles.sliderContainer}>
            <Text style={styles.infoText}>
              Choose a value between 1 and 100 to open the window blind to:
            </Text>
            <Text style={styles.sliderValueText}>Chosen Value: {chosenValue}</Text>
            {isConnected && <Button title="Send Data" onPress={handleSendData} style={styles.button} />}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
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
    margin: 10,
    color: '#007AFF',
  },
  temperatureContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  temperatureInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  temperatureInput: {
    width: 60,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 5,
  },
});
