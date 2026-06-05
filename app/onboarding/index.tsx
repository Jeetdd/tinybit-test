import { View, Text, StyleSheet, Image, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');

const C = {
  textDark: "#1A3050",
};

export default function Splash() {
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
            <Animated.View entering={FadeInDown.duration(1000).delay(200)} style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/TinyBit_LOGO_New.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.tagline}>Elderly AI</Text>
            </Animated.View>
          </View>
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
