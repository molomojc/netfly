import './signIn.scss';
import InputField from "../InputField/InputField";
import Loader from "../Loader/Loader";
import { motion } from "framer-motion";
import { authFadeInUpVariants, staggerOne } from "../../motionUtils";
import { FcGoogle } from "react-icons/fc";
import { useForm } from "react-hook-form";
import { emailSignInStart, googleSignInStart } from "../../redux/auth/auth.actions";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthLoadingState } from "../../redux/auth/auth.selectors";
import { useState } from 'react'; 
import { auth } from '../../firebase/firebaseUtils'; // Make sure to import auth

const SignIn = () => {
    const dispatch = useDispatch();
    const isLoading = useSelector(selectAuthLoadingState);
    const [verificationError, setVerificationError] = useState(''); // Update state to handle errors
    const { register, handleSubmit, errors, watch } = useForm({
        mode: "onTouched"
    });

      const onSubmit = async (data) => {
        const { email, password } = data;
        try {
            await dispatch(emailSignInStart({ email, password }));
            setVerificationError('');
        } catch (error) {
            setVerificationError(error.message || 'An unexpected error occurred'); // Extract the error message
        }
    };

    // Get the current email value from the form
   // const emailValue = watch('email');

    const handleResendVerification = async () => {
        try {
          const email = watch('email');
          const password = watch('password');
          
          if (!email || !password) {
            setVerificationError('Please enter both email and password');
            return;
          }
      
          // Try to sign in - this will fail if email doesn't exist OR if not verified
          const { user } = await auth.signInWithEmailAndPassword(email, password);
          
          // If we get here, the account exists and credentials were correct
          if (!user.emailVerified) {
            await user.sendEmailVerification();
            await auth.signOut();
            setVerificationError('Verification email resent! Check your inbox.');
          } else {
            setVerificationError('This email is already verified.');
          }
          
        } catch (error) {
          console.error('Resend error:', error);
          
          // Handle specific error cases
          if (error.code === 'auth/user-not-found') {
            setVerificationError('No account found with this email.');
          } else if (error.code === 'auth/wrong-password') {
            setVerificationError('Incorrect password. Please try again.');
          } else {
            setVerificationError('Error resending verification: ' + error.message);
          }
        }
      };


    return (
        <motion.form
            variants={staggerOne}
            initial="initial"
            animate="animate"
            exit="exit"
            className="SignIn__form"
            onSubmit={handleSubmit(onSubmit)}
        >
                {verificationError && (
    <motion.div 
        variants={authFadeInUpVariants}
        className="verification-error-message"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
        {typeof verificationError === 'string'
            ? verificationError
            : String(verificationError)}

              {verificationError.includes('verify') && (
                        <button 
                            type="button"
                            onClick={handleResendVerification}
                            className="resend-button"
                            disabled={isLoading}
                        >
                            Resend Verification Email
                        </button>
                    )}
    </motion.div>
)}
    

            <motion.div variants={authFadeInUpVariants} className="SignIn__form--inputwrp">
                <InputField
                    type="text"
                    name="email"
                    placeholder="E-mail"
                    validationMessage="Please enter a valid email address."
                    validation={register({
                        required: true,
                        pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
                    })}
                    errors={errors}
                    disabled={isLoading}
                />
            </motion.div>
            <motion.div variants={authFadeInUpVariants} className="SignIn__form--inputwrp">
                <InputField
                    type="password"
                    name="password"
                    placeholder="Password"
                    validationMessage="The password should have a length between 6 and 30 characters."
                    validation={register({
                        required: true,
                        minLength: 6,
                        maxLength: 30,
                    })}
                    errors={errors}
                    disabled={isLoading}
                />
            </motion.div>
            <motion.button
                type="submit"
                variants={authFadeInUpVariants}
                className={`SignIn__form--button button__submit ${isLoading && 'loading'}`}
                disabled={isLoading}
            >
                {isLoading ? <Loader /> : 'Sign in'}
            </motion.button>
            <motion.button
                type="button"
                variants={authFadeInUpVariants}
                className={`SignIn__form--button button__google ${isLoading && 'loading'}`}
                onClick={() => dispatch(googleSignInStart())}
                disabled={isLoading}
            >
                {!isLoading && <FcGoogle />}
                {isLoading ? <Loader /> : 'Sign in with Google'}
            </motion.button>
        </motion.form>
    );
};

export default SignIn;