import { useLocalSearchParams } from "expo-router";
import AuthScreen from "../../components/AuthScreen";

export default function RegisterRoute() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <AuthScreen initialTab="signup" role={role} />;
}

