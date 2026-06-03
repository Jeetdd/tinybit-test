import { View, Text, StyleSheet, Pressable, Image, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing
} from "react-native-reanimated";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

type CircleConfig = {
  id: number;
  angle: number;
  radius: number;
  size: number;
  delay: number;
  image: any;
};

const circlesConfig = [
  { id: 1, angle: 0, radius: 160, size: 90, delay: 0, image: require('../../assets/images/197753842_10874897 (1)-Photoroom 2.png') },
  { id: 2, angle: 45, radius: 155, size: 85, delay: 100, image: require('../../assets/images/30933019_7719574-Photoroom 2.png') },
  { id: 3, angle: 90, radius: 150, size: 50, delay: 200, image: require('../../assets/images/36496529_bell_notification_on_speech_bubble_chat_alert_new_event_information_sign_or_symbol_website_icon_3d_illustration-Photoroom 2.png') },
  { id: 4, angle: 135, radius: 145, size: 60, delay: 300, image: require('../../assets/images/420139992_a9954ec0-8b1b-45a2-8194-a5bc79bcb1ba-Photoroom 2.png') },
  { id: 5, angle: 180, radius: 140, size: 45, delay: 400, image: require('../../assets/images/135870197_10352134-Photoroom 2.png') },
  { id: 6, angle: 225, radius: 145, size: 60, delay: 500, image: require('../../assets/images/320757853_11294239-Photoroom (1) 2.png') },
  { id: 7, angle: 270, radius: 155, size: 95, delay: 600, image: require('../../assets/images/13678530_5241348-Photoroom (1) 2.png') },
  { id: 8, angle: 315, radius: 150, size: 85, delay: 700, image: require('../../assets/images/420561634_451779f4-1fe8-45b1-b054-016462d6cc42-Photoroom 2.png') },
] as CircleConfig[];

function OrbitCircle({ config, rotation }: { config: CircleConfig; rotation: any }) {
  const radius = useSharedValue(0);

  useEffect(() => {
    radius.value = withDelay(
      config.delay,
      withTiming(config.radius, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [config.delay, config.radius, radius]);

  const style = useAnimatedStyle(() => {
    const angleRad = (config.angle + rotation.value) * Math.PI / 180;
    const x = Math.cos(angleRad) * radius.value;
    const y = Math.sin(angleRad) * radius.value;
    return {
      transform: [{ translateX: x }, { translateY: y }],
    };
  }, [config.angle, rotation]);

  return (
    <Animated.View
      style={[
        styles.nodeCircle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          position: "absolute",
        },
        style,
      ]}
    >
      <Image source={config.image} style={styles.iconImgFull} resizeMode="contain" />
    </Animated.View>
  );
}

export default function OnboardingStep1() {
  const router = useRouter();

  // Rotation animation for all circles
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Start rotation
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E3F2FD" translucent={false} />
      <LinearGradient
        colors={['#E3F2FD', '#FFFFFF', '#E3F2FD']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Graphic Area */}
        <View style={styles.graphicContainer}>
          <View style={styles.nodesWrapper}>
            {/* Central Large Character */}
            <Animated.View entering={FadeInUp.duration(1000)} style={[styles.centerNodeLarge, { zIndex: 5 }]}>
              <View style={styles.centerInnerCircle}>
                <Image source={require('../../assets/images/Group 427320054.png')} style={styles.mascotImg} resizeMode="contain" />
              </View>
            </Animated.View>

            {/* Orbiting Circles */}
            {circlesConfig.map((config, index) => (
              <OrbitCircle key={config.id} config={config as CircleConfig} rotation={rotation} />
            ))}
          </View>
        </View>

        {/* Text Section */}
        <View style={styles.bottomSection}>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.title}>
            Your Parents, Safe & Always Connected.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(400)} style={styles.subtitle}>
            Tinybit Elderly Ai watches over your parents with real-time health tracking, medicine reminder, and instant SOS to all family members from your phone.
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(600)}>
            <Pressable 
              style={styles.getStartedBtn}
              onPress={() => router.replace("/onboarding/role")}
            >
              <LinearGradient
                colors={['#34AADC', '#1E88E5']}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>Get Started</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  graphicContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  nodesWrapper: {
    width: width,
    height: height * 0.55,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  nodeCircle: {
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconImg: {
    width: "70%",
    height: "70%",
  },
  iconImgSmall: {
    width: "60%",
    height: "60%",
  },
  iconImgFull: {
    width: "88%",
    height: "88%",
  },
  centerNodeLarge: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: (width * 0.4) / 2,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#34AADC",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
  centerInnerCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 200,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mascotImg: {
    width: "75%",
    height: "75%",
  },
  bottomSection: {
    paddingHorizontal: 25,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#1A1A1A",
    textAlign: "center",
    lineHeight: 46,
    marginBottom: 15,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: "#7A7A7A",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 35,
  },
  getStartedBtn: {
    width: width * 0.88,
    height: 65,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#34AADC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  btnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
});
