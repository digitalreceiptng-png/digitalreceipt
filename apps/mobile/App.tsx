import { StatusBar } from 'expo-status-bar'
import AppNavigator from './src/navigation/AppNavigator'
import LoadingProvider from './src/context/LoadingProvider'

export default function App() {
  return (
    <LoadingProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </LoadingProvider>
  )
}
