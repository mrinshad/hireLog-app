import { Redirect } from 'expo-router';

/**
 * Direct deep-link redirect for hirelog://new-application
 * Ensures cold-start and background widget taps route immediately to the New Application screen.
 */
export default function NewApplicationDeepLink() {
  return <Redirect href="/jobs/new" />;
}
