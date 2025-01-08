import React from 'react';
import { signInWithPopup, GithubAuthProvider } from 'firebase/auth';
import { auth, githubProvider } from '../firebase';
import { Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SignIn() {
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      // Get GitHub access token
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential) {
        // Store the token in localStorage for later use
        localStorage.setItem('github_token', credential.accessToken || '');
      }
      navigate('/profile');
    } catch (error) {
      console.error('Error signing in with GitHub:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-8">
          <Github className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Welcome</h1>
          <p className="text-gray-600">Sign in with GitHub to continue</p>
        </div>
        
        <button
          onClick={handleSignIn}
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <Github className="w-5 h-5" />
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}