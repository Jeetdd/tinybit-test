import { View, Text, StyleSheet, Pressable, Image, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get('window');

// Updated Colour palette (Premium Brand)
const C = {
  primary: "#333372", 
  accent: "#34AADC",
  bgLight: "#FFFFFF",
  textDark: "#1A3050",
  textMuted: "#7A90A4",
};

export default function Splash() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // We let RootLayoutNav handle the heavy lifting for logged-in users.
    // This splash screen only needs to decide if it should move an 
    // UNKNOWN user to signup after the logo shows.
    if (isLoading) return;

    if (!user) {
      const timer = setTimeout(() => {
        router.replace("/onboarding/signup");
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [router, user, isLoading]);

  const handleNext = () => {
    router.replace("/onboarding/signup");
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#BBD2F2', '#FFFFFF', '#D1D9F5']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#BBD2F2" translucent={false} />
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Logo Area */}
            <Animated.View entering={FadeInDown.duration(1000).delay(200)} style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/TinyBit_LOGO_New.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.tagline}>Elderly AI</Text>
            </Animated.View>
          </View>
          
          <Pressable style={StyleSheet.absoluteFill} onPress={handleNext} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: width * 0.7,
    height: width * 0.35,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 22,
    color: C.textDark,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
