import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Provider Setup with requested Workspace scopes
export const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/calendar");
provider.addScope("https://www.googleapis.com/auth/tasks");
provider.addScope("https://www.googleapis.com/auth/meetings.space.created");
provider.addScope("https://www.googleapis.com/auth/chat.spaces");
provider.addScope("https://www.googleapis.com/auth/chat.messages");

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("jarvis_access_token") : null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check redirect result first, then listen to auth state changes to avoid race conditions
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          if (typeof window !== "undefined") {
            localStorage.setItem("jarvis_access_token", credential.accessToken);
            if (result.user) {
              const u = {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
              };
              localStorage.setItem("jarvis_user", JSON.stringify(u));
            }
          }
        }
      }
    })
    .catch((error) => {
      console.error("Error getting redirect result:", error);
    })
    .finally(() => {
      // Set up standard state listener
      onAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
          if (typeof window !== "undefined") {
            const u = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            };
            localStorage.setItem("jarvis_user", JSON.stringify(u));
          }
          // If logged in, call onAuthSuccess even if cachedAccessToken is empty, but we default to empty string if not found
          if (onAuthSuccess) {
            onAuthSuccess(user, cachedAccessToken || "");
          }
        } else {
          cachedAccessToken = null;
          if (typeof window !== "undefined") {
            localStorage.removeItem("jarvis_access_token");
            localStorage.removeItem("jarvis_user");
          }
          if (onAuthFailure) onAuthFailure();
        }
      });
    });
};

// Initiate Google Sign-In and fetch access token
export const googleSignIn = async (useRedirect = false): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    if (useRedirect) {
      await signInWithRedirect(auth, provider);
      return null;
    } else {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Failed to get access token from Google Auth.");
      }

      cachedAccessToken = credential.accessToken;
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis_access_token", cachedAccessToken);
        const u = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        };
        localStorage.setItem("jarvis_user", JSON.stringify(u));
      }
      return { user: result.user, accessToken: cachedAccessToken };
    }
  } catch (error: any) {
    console.error("Google Workspace Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("jarvis_access_token");
    localStorage.removeItem("jarvis_user");
  }
};
