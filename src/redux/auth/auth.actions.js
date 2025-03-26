import { authActionTypes } from "./auth.types"
import { auth, createUserProfileDocument } from '../../firebase/firebaseUtils';

export const checkUserSession = () => ({
    type: authActionTypes.CHECK_USER_SESSION
})

export const emailSignInStart = (emailAndPassword) => async (dispatch) => {
  try {
    const { email, password } = emailAndPassword;
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    
  
    if (!user.emailVerified) {
      await auth.signOut();
     
      throw new Error("Please verify your email first. Check your inbox.");
    }
    
    dispatch(signInSuccess(user));
    
  } catch (error) {
  
    dispatch(signInFailure(error.message || 'An unexpected error occurred'));

    throw error;
  }
};

export const googleSignInStart = () => ({
    type: authActionTypes.GOOGLE_SIGN_IN_START
})

export const anonymousSignInStart = () => ({
    type: authActionTypes.ANONYMOUS_SIGN_IN_START
})

export const signInSuccess = user => ({
    type: authActionTypes.SIGN_IN_SUCCESS,
    payload: user
})

export const signInFailure = error => ({
    type: authActionTypes.SIGN_IN_FAILURE,
    payload: error
})

export const signOutStart = () => ({
    type: authActionTypes.SIGN_OUT_START
})

export const signOutSuccess = () => ({
    type: authActionTypes.SIGN_OUT_SUCCESS
})

export const signOutFailure = error => ({
    type: authActionTypes.SIGN_OUT_FAILURE,
    payload: error
})

// Updated signUpStart with email verification
export const signUpStart = (userCredentials) => async (dispatch) => {
  try {
    const { email, password, displayName } = userCredentials;
    
  
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    
  
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Send verification email
    await user.sendEmailVerification();
    
    // 4. Create user profile in Firestore
    await createUserProfileDocument(user, { displayName, emailVerified: false });
    

    await auth.signOut();
    
 
    dispatch(signUpSuccess({ 
      user: null, // No current user since we signed out
      additionalData: { 
        requiresVerification: true,
        verificationEmailSentTo: email 
      }
    }));
    
  } catch (error) {
    // 7. Clean up if anything fails
    if (auth.currentUser) {
      await auth.signOut();
      await auth.currentUser?.delete();
    }
    dispatch(signUpFailure(error.message));
  }
};

export const signUpSuccess = ({ user, additionalData }) => ({
    type: authActionTypes.SIGN_UP_SUCCESS,
    payload: { user, additionalData }
})

export const signUpFailure = error => ({
    type: authActionTypes.SIGN_UP_FAILURE,
    payload: error
})