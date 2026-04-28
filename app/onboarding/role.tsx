import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, StatusBar, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
  bg: '#FFFFFF',
  navy: '#2F70AF',
  navyLight: '#2D415A',
  teal: '#5CB8B2',
  green: '#3EA673',
  textMain: '#1A3050',
  textSec: '#7A90A4',
  white: '#FFFFFF',
  textThird: '#FFFFFF',
};

export default function RoleSelection() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleRoleSelect = (role: string) => {
    // Navigate to register screen with selected role
    console.log('Selected role:', role);
    router.push({
      pathname: '/onboarding/register',
      params: { role }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} translucent={false} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <LinearGradient 
          colors={['#2B4C7E', '#3689C8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20 }]}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoIconBrand}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImageBrand}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoTextBrand}>TinyBit Elderly AI</Text>
          </View>

          <Animated.Text entering={FadeInDown.delay(200).duration(800)} style={styles.title}>
            Who are you?
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300).duration(800)} style={styles.subtitle}>
            Choose your role to get the right experience{'\n'}personalised just for you.
          </Animated.Text>
        </LinearGradient>

        {/* Role Cards Area */}
        <View style={styles.cardsContainer}>

          {/* Elder Role */}
          <Animated.View entering={FadeInDown.delay(400).duration(800)}>
            <Pressable style={styles.imageCard} onPress={() => handleRoleSelect('elder')}>
              <ImageBackground 
                source={require('../../assets/images/IamElder.png')} 
                style={styles.cardImageBg} 
                imageStyle={{ borderRadius: 24 }}
              >
                {/* Simulated gradient using a darkened overlay at bottom */}
                <View style={styles.cardGradient}>
                  <View style={styles.cardPill}>
                    <Text style={styles.cardPillText}>Voice-First . Hindi & Regional</Text>
                  </View>
                  
                  <View style={styles.cardContentBottom}>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>I m an Elder</Text>
                      <Text style={styles.cardSub}>I want Sathi as my daily companion</Text>
                    </View>
                    <Text style={styles.cardArrow}>〉</Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          </Animated.View>

          {/* Guardian / Family Role */}
          <Animated.View entering={FadeInDown.delay(500).duration(800)}>
            <Pressable style={styles.imageCard} onPress={() => handleRoleSelect('guardian')}>
              <ImageBackground 
                source={require('../../assets/images/IamFamily.png')} 
                style={styles.cardImageBg} 
                imageStyle={{ borderRadius: 24 }}
              >
                <View style={styles.cardGradient}>
                  <View style={styles.cardPill}>
                    <Text style={styles.cardPillText}>Dashboard . Real-time alerts</Text>
                  </View>
                  
                  <View style={styles.cardContentBottom}>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>I m an Guardian / Family</Text>
                      <Text style={styles.cardSub}>I want to watch over my parents</Text>
                    </View>
                    <Text style={styles.cardArrow}>〉</Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          </Animated.View>

          {/* Caregiver Role Hidden for now */}
          {/* 
          <Animated.View entering={FadeInDown.delay(600).duration(800)}>
            <Pressable style={styles.imageCard} onPress={() => handleRoleSelect('caregiver')}>
              <ImageBackground 
                source={require('../../assets/images/IamCaregiver.png')} 
                style={styles.cardImageBg} 
                imageStyle={{ borderRadius: 24 }}
              >
                <View style={styles.cardGradient}>
                  <View style={styles.cardPill}>
                    <Text style={styles.cardPillText}>Tasks . Shifts . Check-ins</Text>
                  </View>
                  
                  <View style={styles.cardContentBottom}>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>I m a Caregiver</Text>
                      <Text style={styles.cardSub}>I provide professional care</Text>
                    </View>
                    <Text style={styles.cardArrow}>〉</Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          </Animated.View>
          */}

        </View>

      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            Already have an account? <Text onPress={() => router.replace("/onboarding/login")} style={styles.signInText}>Sign In →</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.bullet} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.white, // Bottom background is white
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 80, // Extended bottom to let cards float over
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconBrand: {
    width: 32,
    height: 32,
    backgroundColor: C.white,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImageBrand: {
    width: 20,
    height: 20,
  },
  logoTextBrand: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: 'white',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  cardsContainer: {
    marginTop: -55, // Float over the blue header
    paddingHorizontal: 20,
    paddingTop: 0,
    gap: 20,
    paddingBottom: 40,
  },
  imageCard: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    backgroundColor: '#333',
  },
  cardImageBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.1)', 
  },
  cardPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardPillText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSub: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  cardArrow: {
    color: 'white',
    fontSize: 24,
    fontWeight: '300',
  },
  cardBody: {
    padding: 20,
  },
  bodyLabel: {
    color: C.textSec,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  featuresRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  featureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 5,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.teal,
    marginRight: 8,
  },
  featureText: {
    color: C.textMain,
    fontSize: 13,
    fontWeight: '700',
  },
  stickyFooter: {
    backgroundColor: C.bg,
  },
  footerContent: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  bottomNavyBar: {
    height: 10,
    backgroundColor: C.navy,
  },
  footerText: {
    color: C.textSec,
    fontSize: 14,
    fontWeight: '700',
  },
  signInText: {
    color: C.teal,
    fontWeight: '900',
  },
});
