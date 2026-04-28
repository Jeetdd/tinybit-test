import { View, StyleSheet, Text, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface AppSplashScreenProps {
  logoSvg?: string;
}

export default function AppSplashScreen({ logoSvg }: AppSplashScreenProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        // Using colors that match the soft lavender/blue design more closely
        colors={['#BBD2F2', '#FFFFFF', '#D1D9F5']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.content}>
        {logoSvg ? (
          <SvgXml xml={logoSvg} width={width * 0.4} height={width * 0.4} />
        ) : (
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        )}
        
        <Text style={styles.tagline}>Elderly AI</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  placeholderLogo: {
    width: 150,
    height: 150,
    backgroundColor: '#3B3E66',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
  },
  tagline: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.5,
  },
});
